import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated as RNAnimated,
  Easing as RNEasing,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInRight } from 'react-native-reanimated';
import { ArrowRight, Lock, X } from 'lucide-react-native';

import MathText from '../../components/MathText';
import PressableScale from '../../components/PressableScale';
import SubjectBackdrop from '../../components/SubjectBackdrop';
import Avatar from '../../components/challenges/Avatar';
import TierBadge from '../../components/challenges/TierBadge';
import { HapticService } from '../../services/HapticService';
import { useToastStore } from '../../services/ToastService';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { SUBJECT_COLORS } from '../../theme/subjects';
import {
  AT_RISK,
  CHALLENGE_TINT,
  GUTTER,
  RADIUS,
  SURFACE,
  SURFACE_BORDER,
  TEXT,
  TEXT_FAINT,
  TEXT_MUTED,
  TRACK,
  formatClock,
} from '../../theme/challenges';
import { useChallengesStore } from '../../store/challengesStore';
import {
  ChallengeAnswer,
  ChallengeQuestion,
  beginAttempt,
  displayName,
  fetchChallengeQuestions,
} from '../../services/challengesApi';

// The attempt. Practice's answer flow with three things taken away and one added:
// no skip (skipping would break the comparison), no correctness reveal between
// questions (knowing you got #2 wrong changes how you spend #3, and the two
// participants would not be spending it under the same information), no review
// pass after the last submit. What is added is the per-question clock.

const RN_FAST_OUT_SLOW_IN = RNEasing.bezier(0.4, 0, 0.2, 1);
const OPTION_LABELS = ['A', 'B', 'C', 'D', 'E', 'F'];

/** The draining per-question clock. Runs out → the answer is locked as wrong. */
function TimerBar({ questionKey, seconds, onExpire }: { questionKey: string; seconds: number; onExpire: () => void }) {
  const anim = useRef(new RNAnimated.Value(1)).current;
  const [left, setLeft] = useState(seconds);
  const firedRef = useRef(false);

  // The interval is set up once per question, so it would otherwise fire the
  // `onExpire` from that first render — losing an option the student picked but
  // never submitted. The ref keeps the callback current without restarting the
  // clock every time the selection changes.
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;

  useEffect(() => {
    firedRef.current = false;
    setLeft(seconds);
    anim.setValue(1);

    // Width is not a transform, so the bar cannot use the native driver.
    RNAnimated.timing(anim, {
      toValue: 0,
      duration: seconds * 1000,
      easing: RNEasing.linear,
      useNativeDriver: false,
    }).start();

    const tick = setInterval(() => {
      setLeft((prev) => {
        const next = prev - 1;
        if (next <= 0 && !firedRef.current) {
          firedRef.current = true;
          onExpireRef.current();
        }
        return Math.max(0, next);
      });
    }, 1000);

    return () => clearInterval(tick);
  }, [questionKey, seconds]);

  const width = anim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });
  const urgent = left <= 10;

  return (
    <View style={styles.timerWrap}>
      <View style={styles.timerTrack}>
        <RNAnimated.View
          style={[styles.timerFill, { width, backgroundColor: urgent ? AT_RISK : '#69EAC0' }]}
        />
      </View>
      <Text style={[styles.timerText, urgent && { color: AT_RISK }]}>{formatClock(left)}</Text>
    </View>
  );
}

export default function SolveChallengeScreen({ navigation, route }: any) {
  const matchId: string = route.params?.matchId;

  const matchById = useChallengesStore((s) => s.matchById);
  const submitAttempt = useChallengesStore((s) => s.submitAttempt);
  const match = matchById(matchId);

  const [questions, setQuestions] = useState<ChallengeQuestion[] | null>(null);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answers, setAnswers] = useState<ChallengeAnswer[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);

  const askedAtRef = useRef(Date.now());

  useEffect(() => {
    if (!match) return;
    let alive = true;

    beginAttempt(matchId).catch(() => {});
    fetchChallengeQuestions(match.questionIds)
      .then((list) => {
        if (!alive) return;
        setQuestions(list);
        askedAtRef.current = Date.now();
      })
      .catch((e) => alive && setFailed(e?.message || 'Could not load this set'));

    return () => {
      alive = false;
    };
  }, [matchId, match?.questionIds.length]);

  const question = questions?.[index] ?? null;
  const total = questions?.length ?? 0;
  const opponent = displayName(match?.opponent?.username);

  const finish = useCallback(
    async (finalAnswers: ChallengeAnswer[]) => {
      setSubmitting(true);
      try {
        await submitAttempt(matchId, finalAnswers);
        // The results screen decides for itself whether both halves are in; if
        // they are not it holds, which is exactly the "waiting on them" state.
        navigation.replace('ChallengeResult', { matchId, justFinished: true });
      } catch (e: any) {
        useToastStore.getState().showToast(e?.message || 'Could not submit your set', 'error');
        setSubmitting(false);
      }
    },
    [matchId, navigation, submitAttempt]
  );

  const commit = useCallback(
    (choice: number | null) => {
      if (!question || submitting) return;

      const answer: ChallengeAnswer = {
        question_id: question.id,
        // An unanswered timeout is a wrong answer, not a skip — the set has to
        // stay the same length for both participants.
        correct: choice != null && choice === question.correctIndex,
        time_ms: Math.max(0, Date.now() - askedAtRef.current),
      };

      const next = [...answers, answer];
      setAnswers(next);
      setSelected(null);
      HapticService.light();

      if (index + 1 >= total) {
        finish(next);
        return;
      }

      setIndex(index + 1);
      askedAtRef.current = Date.now();
    },
    [answers, finish, index, question, submitting, total]
  );

  const onExpire = useCallback(() => {
    if (submitting) return;
    HapticService.warning();
    useToastStore.getState().showToast("Time's up on that one");
    commit(selected);
  }, [commit, selected, submitting]);

  const leave = () => {
    useToastStore
      .getState()
      .showToast('Left mid-set — finish before the window closes or it counts as a no-show.');
    navigation.goBack();
  };

  const tint = useMemo(
    () => (match?.subject ? SUBJECT_COLORS[match.subject] : CHALLENGE_TINT),
    [match?.subject]
  );

  const shell = (children: React.ReactNode) => (
    <View style={styles.root}>
      <SubjectBackdrop color={tint} />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {children}
      </SafeAreaView>
    </View>
  );

  if (!match) {
    return shell(
      <View style={styles.centered}>
        <ActivityIndicator color={TEXT_MUTED} />
      </View>
    );
  }

  if (failed || (questions && questions.length === 0)) {
    return shell(
      <View style={styles.centered}>
        <Text style={styles.stateTitle}>This set can't be opened</Text>
        <Text style={styles.stateText}>
          {failed || 'None of its questions are published any more.'}
        </Text>
        <PressableScale onPress={() => navigation.goBack()} scaleTo={0.96} style={styles.stateButton}>
          <Text style={styles.stateButtonText}>Back to challenge</Text>
        </PressableScale>
      </View>
    );
  }

  if (!questions || submitting) {
    return shell(
      <View style={styles.centered}>
        <ActivityIndicator color={TEXT_MUTED} />
        <Text style={styles.stateText}>{submitting ? 'Locking in your answers…' : 'Loading the set…'}</Text>
      </View>
    );
  }

  return shell(
    <>
      {/* The context banner stays put for the whole attempt: who, and where you
          are in their set. */}
      <View style={styles.banner}>
        <PressableScale scaleTo={0.9} style={styles.closeButton} onPress={leave} accessibilityLabel="Leave attempt">
          <X color={TEXT_MUTED} size={18} strokeWidth={2.2} />
        </PressableScale>

        <View style={styles.bannerCenter}>
          <View style={styles.bannerTop}>
            <Avatar username={match.opponent?.username} size={22} />
            <Text style={styles.bannerText} numberOfLines={1}>
              vs {opponent}
            </Text>
          </View>
          <Text style={styles.bannerProgress}>
            Question {index + 1} of {total}
          </Text>
        </View>

        <TierBadge tier={match.tier} />
      </View>

      <TimerBar
        questionKey={question?.id || `q${index}`}
        seconds={match.timerSeconds}
        onExpire={onExpire}
      />

      {/* The pip strip: answered, current, still to come. No correctness in it —
          that is the whole point of holding the reveal to the end. */}
      <View style={styles.pips}>
        {questions.map((q, i) => (
          <View
            key={q.id}
            style={[
              styles.pip,
              i < index && styles.pipDone,
              i === index && styles.pipCurrent,
            ]}
          />
        ))}
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {question ? (
          <Animated.View key={question.id} entering={FadeInRight.duration(220)}>
            <View style={styles.questionCard}>
              <MathText style={styles.prompt}>{question.prompt}</MathText>
            </View>

            <View style={styles.options}>
              {question.options.map((option, i) => {
                const active = selected === i;
                return (
                  <PressableScale
                    key={`${question.id}-${i}`}
                    scaleTo={0.98}
                    onPress={() => setSelected(i)}
                    style={[styles.option, active && styles.optionActive]}
                    accessibilityLabel={`Option ${OPTION_LABELS[i]}`}
                  >
                    <View style={[styles.optionBadge, active && styles.optionBadgeActive]}>
                      <Text style={[styles.optionBadgeText, active && styles.optionBadgeTextActive]}>
                        {OPTION_LABELS[i] || i + 1}
                      </Text>
                    </View>
                    <MathText style={[styles.optionText, active && styles.optionTextActive]}>
                      {option}
                    </MathText>
                  </PressableScale>
                );
              })}
            </View>
          </Animated.View>
        ) : null}
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.footerNote}>
          <Lock color={TEXT_FAINT} size={12} strokeWidth={2} />
          <Text style={styles.footerNoteText}>
            {index + 1 === total ? 'Submitting locks the whole set' : 'No going back once you lock it'}
          </Text>
        </View>

        <PressableScale
          onPress={() => commit(selected)}
          disabled={selected == null}
          scaleTo={0.97}
          style={[styles.submitButton, selected == null && styles.submitButtonDisabled]}
          accessibilityLabel={index + 1 === total ? 'Submit set' : 'Lock answer and continue'}
        >
          <Animated.Text entering={FadeIn.duration(150)} style={styles.submitText}>
            {index + 1 === total ? 'Submit set' : 'Lock it in'}
          </Animated.Text>
          <ArrowRight color="#0B0B0C" size={16} strokeWidth={2.4} />
        </PressableScale>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.hudjeeBgBase },
  safeArea: { flex: 1 },
  container: { flex: 1 },
  content: { paddingHorizontal: GUTTER, paddingTop: 20, paddingBottom: 24 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: GUTTER, gap: 10 },

  stateTitle: { color: TEXT, fontSize: 19, fontFamily: typography.bold, textAlign: 'center' },
  stateText: { color: TEXT_MUTED, fontSize: 14, fontFamily: typography.regular, textAlign: 'center', lineHeight: 20 },
  stateButton: {
    marginTop: 8,
    paddingHorizontal: 22,
    paddingVertical: 13,
    borderRadius: 999,
    backgroundColor: '#F5F5F7',
  },
  stateButtonText: { color: '#0B0B0C', fontSize: 14, fontFamily: typography.bold },

  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: GUTTER - 8,
    paddingVertical: 10,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.09)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bannerCenter: { flex: 1 },
  bannerTop: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  bannerText: { color: TEXT, fontSize: 14, fontFamily: typography.semiBold, letterSpacing: -0.2, flexShrink: 1 },
  bannerProgress: { color: TEXT_FAINT, fontSize: 11, fontFamily: typography.regular, marginTop: 3, marginLeft: 29 },

  timerWrap: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: GUTTER, marginTop: 4 },
  timerTrack: { flex: 1, height: 4, borderRadius: 2, backgroundColor: TRACK, overflow: 'hidden' },
  timerFill: { height: '100%', borderRadius: 2 },
  timerText: { color: TEXT_MUTED, fontSize: 12, fontFamily: typography.bold, width: 44, textAlign: 'right' },

  pips: { flexDirection: 'row', gap: 5, paddingHorizontal: GUTTER, marginTop: 14 },
  pip: { flex: 1, height: 3, borderRadius: 1.5, backgroundColor: 'rgba(255,255,255,0.10)' },
  pipDone: { backgroundColor: 'rgba(255,255,255,0.45)' },
  pipCurrent: { backgroundColor: '#FFFFFF' },

  questionCard: {
    backgroundColor: SURFACE,
    borderRadius: RADIUS,
    borderWidth: 1,
    borderColor: SURFACE_BORDER,
    padding: 20,
  },
  prompt: { color: TEXT, fontSize: 17, lineHeight: 26, fontFamily: typography.regular },

  options: { gap: 10, marginTop: 16 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: SURFACE,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: SURFACE_BORDER,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  optionActive: { borderColor: 'rgba(255,255,255,0.45)', backgroundColor: 'rgba(255,255,255,0.08)' },
  optionBadge: {
    width: 28,
    height: 28,
    borderRadius: 9,
    backgroundColor: 'rgba(255,255,255,0.07)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionBadgeActive: { backgroundColor: '#FFFFFF' },
  optionBadgeText: { color: TEXT_MUTED, fontSize: 12, fontFamily: typography.bold },
  optionBadgeTextActive: { color: '#0B0B0C' },
  optionText: { flex: 1, color: TEXT_MUTED, fontSize: 15, lineHeight: 22, fontFamily: typography.regular },
  optionTextActive: { color: TEXT },

  footer: {
    paddingHorizontal: GUTTER,
    paddingTop: 12,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: SURFACE_BORDER,
    backgroundColor: 'rgba(11,11,12,0.86)',
  },
  footerNote: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  footerNoteText: { color: TEXT_FAINT, fontSize: 11, fontFamily: typography.regular },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 15,
    borderRadius: 999,
    backgroundColor: '#F5F5F7',
  },
  submitButtonDisabled: { opacity: 0.4 },
  submitText: { color: '#0B0B0C', fontSize: 14, fontFamily: typography.bold },
});
