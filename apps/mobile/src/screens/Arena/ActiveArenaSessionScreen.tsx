import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Modal,
  BackHandler,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInDown, FadeOut } from 'react-native-reanimated';
import { Check, Clock, Lock, SkipForward, Target, X } from 'lucide-react-native';

import PressableScale from '../../components/PressableScale';
import SubjectBackdrop from '../../components/SubjectBackdrop';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { SUBJECT_COLORS, SubjectKey, tintFor } from '../../theme/subjects';
import {
  DIVIDER,
  GAP,
  GUTTER,
  MODE_BY_ID,
  NEGATIVE,
  POSITIVE,
  RADIUS,
  SUBJECT_LABELS,
  SUBJECT_SHORT,
  SURFACE,
  SURFACE_BORDER,
  SURFACE_STRONG,
  TEXT,
  TEXT_FAINT,
  TEXT_MUTED,
  TRACK,
  formatClock,
} from '../../theme/arena';
import { SubjectRuntime, useArenaSessionStore } from '../../store/arenaSessionStore';
import { HapticService } from '../../services/HapticService';

const CORRECT_ADVANCE_MS = 900;

// ─── subject switcher ────────────────────────────────────────────────────────

/**
 * The live readout for one subject: its own mastery, its own clock, its own
 * progress toward its own target. Tapping it switches context — which costs
 * nothing, because the subject being left simply stops being the active one.
 */
function SubjectPill({
  runtime,
  active,
  compact,
  onPress,
}: {
  runtime: SubjectRuntime;
  active: boolean;
  compact: boolean;
  onPress: () => void;
}) {
  const accent = SUBJECT_COLORS[runtime.subject];
  const locked = runtime.context.locked;
  const target = runtime.context.target_count;

  return (
    <PressableScale
      onPress={onPress}
      disabled={locked || active}
      scaleTo={0.95}
      style={[
        styles.pill,
        compact ? styles.pillCompact : styles.pillWide,
        active && { backgroundColor: `${accent}26`, borderColor: `${accent}66` },
        locked && styles.pillLocked,
      ]}
    >
      <View style={styles.pillTop}>
        {locked ? (
          <Lock color={TEXT_FAINT} size={11} strokeWidth={2.2} />
        ) : (
          <View style={[styles.pillDot, { backgroundColor: accent }]} />
        )}
        <Text style={[styles.pillLabel, active && { color: accent }]}>
          {compact ? SUBJECT_SHORT[runtime.subject] : SUBJECT_LABELS[runtime.subject]}
        </Text>
      </View>

      <View style={styles.pillReadout}>
        <Text style={[styles.pillMastery, active && { color: accent }]}>
          {runtime.context.mastery_pct}
        </Text>
        {runtime.masteryDelta ? (
          <Animated.Text
            entering={FadeIn.duration(160)}
            exiting={FadeOut.duration(240)}
            style={[
              styles.pillDelta,
              { color: runtime.masteryDelta > 0 ? POSITIVE : NEGATIVE },
            ]}
          >
            {runtime.masteryDelta > 0 ? `+${runtime.masteryDelta}` : runtime.masteryDelta}
          </Animated.Text>
        ) : null}
      </View>

      <Text style={styles.pillMeta}>
        {locked && target
          ? `Done ${target}/${target}`
          : target
            ? `${runtime.context.questions_answered}/${target}`
            : formatClock(Math.floor(runtime.elapsedMs / 1000))}
      </Text>
    </PressableScale>
  );
}

// ─── screen ──────────────────────────────────────────────────────────────────

export default function ActiveArenaSessionScreen({ navigation, route }: any) {
  const config = route.params?.config;

  const status = useArenaSessionStore((s) => s.status);
  const error = useArenaSessionStore((s) => s.error);
  const mode = useArenaSessionStore((s) => s.mode);
  const subjects = useArenaSessionStore((s) => s.subjects);
  const runtime = useArenaSessionStore((s) => s.runtime);
  const activeSubject = useArenaSessionStore((s) => s.activeSubject);
  const remainingSeconds = useArenaSessionStore((s) => s.remainingSeconds);
  const totalTarget = useArenaSessionStore((s) => s.totalTarget);
  const summary = useArenaSessionStore((s) => s.summary);

  const start = useArenaSessionStore((s) => s.start);
  const switchSubject = useArenaSessionStore((s) => s.switchSubject);
  const select = useArenaSessionStore((s) => s.select);
  const submit = useArenaSessionStore((s) => s.submit);
  const skip = useArenaSessionStore((s) => s.skip);
  const advance = useArenaSessionStore((s) => s.advance);
  const tick = useArenaSessionStore((s) => s.tick);
  const end = useArenaSessionStore((s) => s.end);
  const reset = useArenaSessionStore((s) => s.reset);

  const [confirmExit, setConfirmExit] = useState(false);

  // One session per entry into this screen.
  useEffect(() => {
    if (config) start(config);
    return () => reset();
  }, []);

  // The one clock in the app that drives every other clock in the session: the
  // store decides which of them it belongs to.
  useEffect(() => {
    if (status !== 'active') return;
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [status, tick]);

  // Leaving mid-session is a decision, not a swipe.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (status === 'active') {
        setConfirmExit(true);
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [status]);

  useEffect(() => {
    if (status === 'ended') {
      navigation.replace('ArenaSummary', { summary });
    }
  }, [status, summary]);

  const active = activeSubject ? runtime[activeSubject] : null;

  // A correct answer moves on by itself; a wrong one waits, because the solution
  // is the point of getting it wrong.
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (advanceTimer.current) {
      clearTimeout(advanceTimer.current);
      advanceTimer.current = null;
    }
    if (active?.status === 'answered' && active.correct) {
      HapticService.success();
      advanceTimer.current = setTimeout(() => advance(), CORRECT_ADVANCE_MS);
    } else if (active?.status === 'answered' && active.correct === false) {
      HapticService.error();
    }
    return () => {
      if (advanceTimer.current) clearTimeout(advanceTimer.current);
    };
  }, [active?.status, active?.correct, active?.question?.question_id]);

  const totalAnswered = useMemo(
    () => Object.values(runtime).reduce((sum, r) => sum + r.context.questions_answered, 0),
    [runtime]
  );

  const accent = activeSubject ? SUBJECT_COLORS[activeSubject] : colors.hudjeeTextSecondary;
  const modeMeta = mode ? MODE_BY_ID[mode] : null;

  const shell = (children: React.ReactNode) => (
    <View style={styles.root}>
      {/* The wash follows the active subject, so switching contexts is something
          you feel before you read a single number. */}
      <SubjectBackdrop color={tintFor(activeSubject as SubjectKey)} />
      <SafeAreaView style={styles.safeArea} edges={['top']}>{children}</SafeAreaView>
    </View>
  );

  if (status === 'starting' || status === 'idle') {
    return shell(
      <View style={styles.centered}>
        <ActivityIndicator color={POSITIVE} size="large" />
        <Text style={styles.centeredText}>Setting up your contexts…</Text>
      </View>
    );
  }

  if (status === 'error') {
    return shell(
      <View style={styles.centered}>
        <Text style={styles.centeredTitle}>Could not start</Text>
        <Text style={styles.centeredText}>{error}</Text>
        <PressableScale onPress={() => navigation.goBack()} style={styles.secondaryButton}>
          <Text style={styles.secondaryText}>Back to setup</Text>
        </PressableScale>
      </View>
    );
  }

  if (status === 'ending') {
    return shell(
      <View style={styles.centered}>
        <ActivityIndicator color={POSITIVE} size="large" />
        <Text style={styles.centeredText}>Wrapping up…</Text>
      </View>
    );
  }

  const options = Array.isArray(active?.question?.options) ? active!.question!.options! : [];
  const answering = active?.status === 'answering';
  const answered = active?.status === 'answered';

  return shell(
    <>
      {/* ── Top bar: how the session as a whole is going ── */}
      <View style={styles.topBar}>
        <PressableScale scaleTo={0.9} style={styles.closeButton} onPress={() => setConfirmExit(true)}>
          <X color={TEXT_MUTED} size={19} strokeWidth={2} />
        </PressableScale>

        <View style={styles.topStats}>
          {remainingSeconds !== null && (
            <View style={styles.topStat}>
              <Clock
                color={remainingSeconds <= 60 ? NEGATIVE : TEXT_MUTED}
                size={14}
                strokeWidth={2}
              />
              <Text
                style={[styles.topStatText, remainingSeconds <= 60 && { color: NEGATIVE }]}
              >
                {formatClock(remainingSeconds)}
              </Text>
            </View>
          )}

          {totalTarget ? (
            <View style={styles.topStat}>
              <Target color={TEXT_MUTED} size={14} strokeWidth={2} />
              <Text style={styles.topStatText}>
                {totalAnswered}/{totalTarget}
              </Text>
            </View>
          ) : (
            <View style={styles.topStat}>
              <Target color={TEXT_MUTED} size={14} strokeWidth={2} />
              <Text style={styles.topStatText}>{totalAnswered}</Text>
            </View>
          )}
        </View>

        <View style={styles.modeTag}>
          <Text style={styles.modeTagText}>{modeMeta?.name.toUpperCase()}</Text>
        </View>
      </View>

      {/* Global progress: the clock for timed modes, otherwise the count. */}
      {(remainingSeconds !== null || totalTarget) && (
        <View style={styles.globalTrack}>
          <View
            style={[
              styles.globalFill,
              {
                backgroundColor: accent,
                width:
                  remainingSeconds !== null && modeMeta?.timed
                    ? `${progressPct(remainingSeconds, useArenaSessionStore.getState().durationSeconds)}%`
                    : `${Math.min(100, (totalAnswered / (totalTarget || 1)) * 100)}%`,
              },
            ]}
          />
        </View>
      )}

      {/* ── Subject switcher, or one wide bar when the session is single-subject ── */}
      <View style={styles.switcher}>
        {subjects.map((subject) => (
          <SubjectPill
            key={subject}
            runtime={runtime[subject]}
            active={subject === activeSubject}
            compact={subjects.length > 1}
            onPress={() => switchSubject(subject)}
          />
        ))}
      </View>

      {/* ── The question ── */}
      {active?.status === 'loading' ? (
        <View style={styles.centered}>
          <ActivityIndicator color={accent} />
        </View>
      ) : active?.status === 'exhausted' || !active?.question ? (
        <View style={styles.centered}>
          <Text style={styles.centeredTitle}>Nothing left here</Text>
          <Text style={styles.centeredText}>
            {subjects.length > 1
              ? 'You have cleared every question in this subject’s selection. Switch subjects, or end the session.'
              : 'You have cleared every question in this selection.'}
          </Text>
          <PressableScale onPress={() => end('manual')} style={styles.secondaryButton}>
            <Text style={styles.secondaryText}>End session</Text>
          </PressableScale>
        </View>
      ) : (
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View key={active.question.question_id} entering={FadeInDown.duration(260)}>
            <Text style={styles.prompt}>{active.question.prompt}</Text>

            <View style={{ gap: GAP, marginTop: 24 }}>
              {options.map((option, index) => {
                const isSelected = active.selectedOption === index;
                const showResult = answered;
                const isWrongPick = showResult && isSelected && active.correct === false;
                const isRightPick = showResult && isSelected && active.correct === true;

                return (
                  <PressableScale
                    key={index}
                    onPress={() => select(index)}
                    disabled={!answering}
                    scaleTo={0.985}
                    style={[
                      styles.option,
                      isSelected && answering && { borderColor: `${accent}88`, backgroundColor: `${accent}18` },
                      isRightPick && { borderColor: `${POSITIVE}99`, backgroundColor: 'rgba(63,232,166,0.10)' },
                      isWrongPick && { borderColor: `${NEGATIVE}99`, backgroundColor: 'rgba(248,113,113,0.10)' },
                    ]}
                  >
                    <Text style={styles.optionLetter}>{String.fromCharCode(65 + index)}</Text>
                    <Text style={styles.optionText}>{String(option)}</Text>
                    {isRightPick && <Check color={POSITIVE} size={17} strokeWidth={2.6} />}
                  </PressableScale>
                );
              })}
            </View>

            {answered && active.correct === false && active.solution ? (
              <Animated.View entering={FadeIn.duration(200)} style={styles.solutionCard}>
                <Text style={styles.solutionTitle}>Solution</Text>
                {active.solution.steps.map((step, i) => (
                  <Text key={i} style={styles.solutionStep}>
                    {step}
                  </Text>
                ))}
              </Animated.View>
            ) : null}
          </Animated.View>
        </ScrollView>
      )}

      {/* ── Action bar ── */}
      {active?.question && (
        <View style={styles.footer}>
          {answering && (
            <>
              <PressableScale onPress={skip} scaleTo={0.95} style={styles.skipButton}>
                <SkipForward color={TEXT_MUTED} size={15} strokeWidth={2} />
                <Text style={styles.skipText}>Skip</Text>
              </PressableScale>

              <PressableScale
                onPress={submit}
                disabled={active.selectedOption === null}
                scaleTo={0.97}
                style={[
                  styles.submitButton,
                  { backgroundColor: active.selectedOption === null ? SURFACE_STRONG : accent },
                ]}
              >
                <Text
                  style={[
                    styles.submitText,
                    { color: active.selectedOption === null ? TEXT_FAINT : '#0B0B0C' },
                  ]}
                >
                  Submit
                </Text>
              </PressableScale>
            </>
          )}

          {answered && active.correct === false && (
            <PressableScale onPress={advance} scaleTo={0.97} style={[styles.submitButton, styles.nextButton]}>
              <Text style={[styles.submitText, { color: '#0B0B0C' }]}>Next question</Text>
            </PressableScale>
          )}

          {answered && active.correct === true && (
            <View style={styles.correctBanner}>
              <Check color={POSITIVE} size={16} strokeWidth={2.6} />
              <Text style={styles.correctText}>Correct</Text>
            </View>
          )}
        </View>
      )}

      {/* ── Leaving ── */}
      <Modal visible={confirmExit} transparent animationType="fade">
        <View style={styles.modalScrim}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>End this session?</Text>
            <Text style={styles.modalText}>
              Everything you have answered is already saved. You will get the summary next.
            </Text>
            <View style={styles.modalActions}>
              <PressableScale
                onPress={() => setConfirmExit(false)}
                scaleTo={0.96}
                style={[styles.modalButton, { backgroundColor: SURFACE_STRONG }]}
              >
                <Text style={[styles.modalButtonText, { color: TEXT }]}>Keep going</Text>
              </PressableScale>
              <PressableScale
                onPress={() => {
                  setConfirmExit(false);
                  end('manual');
                }}
                scaleTo={0.96}
                style={[styles.modalButton, { backgroundColor: accent }]}
              >
                <Text style={[styles.modalButtonText, { color: '#0B0B0C' }]}>End session</Text>
              </PressableScale>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

/** How much of a timed session has been spent, as a percentage. */
function progressPct(remainingSeconds: number, durationSeconds: number | null): number {
  if (!durationSeconds) return 0;
  return Math.max(0, Math.min(100, ((durationSeconds - remainingSeconds) / durationSeconds) * 100));
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.hudjeeBgBase },
  safeArea: { flex: 1 },
  container: { flex: 1 },
  content: { paddingHorizontal: GUTTER, paddingTop: 8, paddingBottom: 32 },

  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: GUTTER, gap: 10 },
  centeredTitle: { color: TEXT, fontSize: 18, fontFamily: typography.bold, letterSpacing: -0.3 },
  centeredText: {
    color: TEXT_MUTED,
    fontSize: 14,
    fontFamily: typography.regular,
    textAlign: 'center',
    lineHeight: 20,
  },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: GUTTER,
    paddingTop: 4,
    paddingBottom: 14,
  },
  closeButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: SURFACE_BORDER,
    justifyContent: 'center',
    alignItems: 'center',
  },
  topStats: { flexDirection: 'row', alignItems: 'center', gap: 18 },
  topStat: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  topStatText: { color: TEXT_MUTED, fontSize: 14, fontFamily: typography.semiBold, letterSpacing: -0.2 },
  modeTag: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: SURFACE_BORDER,
  },
  modeTagText: { color: TEXT_FAINT, fontSize: 9, fontFamily: typography.bold, letterSpacing: 1 },

  globalTrack: {
    height: 3,
    marginHorizontal: GUTTER,
    borderRadius: 2,
    backgroundColor: TRACK,
    overflow: 'hidden',
    marginBottom: 16,
  },
  globalFill: { height: '100%', borderRadius: 2 },

  switcher: { flexDirection: 'row', gap: 8, paddingHorizontal: GUTTER, marginBottom: 20 },
  pill: {
    backgroundColor: SURFACE,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: SURFACE_BORDER,
    paddingVertical: 11,
    paddingHorizontal: 14,
  },
  // Two or three subjects share the row; a single subject takes the whole width
  // so the session never looks like it is missing a control.
  pillCompact: { flex: 1 },
  pillWide: { flex: 1, alignItems: 'flex-start' },
  pillLocked: { opacity: 0.45 },
  pillTop: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  pillDot: { width: 5, height: 5, borderRadius: 2.5 },
  pillLabel: { color: TEXT_MUTED, fontSize: 10, fontFamily: typography.bold, letterSpacing: 1 },
  pillReadout: { flexDirection: 'row', alignItems: 'baseline', gap: 5, marginTop: 5 },
  pillMastery: { color: TEXT, fontSize: 20, fontFamily: typography.bold, letterSpacing: -0.5 },
  pillDelta: { fontSize: 11, fontFamily: typography.bold },
  pillMeta: { color: TEXT_FAINT, fontSize: 10, fontFamily: typography.regular, marginTop: 2 },

  prompt: { color: TEXT, fontSize: 17, fontFamily: typography.regular, lineHeight: 26 },

  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: SURFACE,
    borderRadius: RADIUS,
    borderWidth: 1,
    borderColor: SURFACE_BORDER,
    paddingVertical: 16,
    paddingHorizontal: 18,
  },
  optionLetter: { color: TEXT_FAINT, fontSize: 13, fontFamily: typography.bold, width: 16 },
  optionText: { flex: 1, color: TEXT_MUTED, fontSize: 15, fontFamily: typography.regular, lineHeight: 21 },

  solutionCard: {
    marginTop: 22,
    padding: 18,
    borderRadius: RADIUS,
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: SURFACE_BORDER,
  },
  solutionTitle: { color: TEXT, fontSize: 14, fontFamily: typography.bold, marginBottom: 10 },
  solutionStep: {
    color: TEXT_MUTED,
    fontSize: 14,
    fontFamily: typography.regular,
    lineHeight: 21,
    marginBottom: 8,
  },

  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: GUTTER,
    paddingTop: 12,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: SURFACE_BORDER,
    backgroundColor: 'rgba(11,11,12,0.86)',
  },
  skipButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: SURFACE_BORDER,
    backgroundColor: SURFACE,
  },
  skipText: { color: TEXT_MUTED, fontSize: 13, fontFamily: typography.semiBold },
  submitButton: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: 999 },
  nextButton: { backgroundColor: '#F5F5F7' },
  submitText: { fontSize: 15, fontFamily: typography.bold, letterSpacing: -0.2 },
  correctBanner: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16 },
  correctText: { color: POSITIVE, fontSize: 14, fontFamily: typography.bold },

  secondaryButton: {
    marginTop: 8,
    paddingHorizontal: 24,
    paddingVertical: 13,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: SURFACE_BORDER,
    backgroundColor: SURFACE,
  },
  secondaryText: { color: TEXT, fontSize: 14, fontFamily: typography.semiBold },

  modalScrim: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', paddingHorizontal: GUTTER },
  modalCard: {
    backgroundColor: '#16161A',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: DIVIDER,
    padding: 24,
  },
  modalTitle: { color: TEXT, fontSize: 18, fontFamily: typography.bold, marginBottom: 8 },
  modalText: { color: TEXT_MUTED, fontSize: 14, fontFamily: typography.regular, lineHeight: 20 },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 22 },
  modalButton: { flex: 1, alignItems: 'center', paddingVertical: 14, borderRadius: 999 },
  modalButtonText: { fontSize: 14, fontFamily: typography.bold },
});
