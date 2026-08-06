import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import {
  AlertTriangle,
  Bookmark,
  Check,
  ChevronLeft,
  Flag,
  Flame,
  Share2,
  SkipForward,
  Timer,
  Trophy,
  X,
} from 'lucide-react-native';

import PressableScale from '../../components/PressableScale';
import SubjectBackdrop from '../../components/SubjectBackdrop';
import QuestionView from '../../components/practice/QuestionView';
import SolutionCard from '../../components/practice/SolutionCard';
import { AnswerResponse, Question, SessionSummary } from '../../services/api.mock';
import { EngineApi } from '../../services/api';
import { useSubjectStore } from '../../store/subjectStore';
import { SUBJECT_COLORS, tintFor } from '../../theme/subjects';
import { typography } from '../../theme/typography';
import { colors } from '../../theme/colors';
import {
  DIVIDER,
  GLASS,
  GLASS_BORDER,
  GUTTER,
  NEGATIVE,
  POSITIVE,
  RADIUS,
  SURFACE,
  SURFACE_BORDER,
  SURFACE_STRONG,
  TEXT,
  TEXT_FAINT,
  TEXT_MUTED,
  TRACK,
} from '../../theme/ui';
import { formatClock } from '../../theme/arena';
import {
  AnswerDraft,
  NormalizedQuestion,
  emptyDraft,
  isDraftComplete,
  normalizeQuestion,
} from '../../lib/questionFormat';
import { HapticService } from '../../services/HapticService';

/** A right answer moves on by itself; a wrong one waits, because the solution is the point. */
const CORRECT_ADVANCE_MS = 900;

const REPORT_REASONS = [
  'Answer key looks wrong',
  'Typo/unclear wording',
  'Diagram broken',
  'Duplicate of another question',
  'Other',
];

type Phase = 'answering' | 'submitting' | 'answered';
type SessionStatus = 'loading' | 'error' | 'active' | 'exhausted' | 'summary';

export default function AdaptiveSessionScreen({ navigation, route }: any) {
  const { chapterId, chapterTitle, conceptId } = route.params || {
    chapterId: 'c1',
    chapterTitle: 'Practice',
  };

  const subject = useSubjectStore((s) => s.subject);
  // The session inherits the subject the student walked in with, so the tint
  // carries all the way from the subject switcher into the questions.
  const tint = tintFor(subject);
  const accent = subject ? SUBJECT_COLORS[subject] : POSITIVE;

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionStatus, setSessionStatus] = useState<SessionStatus>('loading');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [summaryData, setSummaryData] = useState<SessionSummary | null>(null);

  // ── The question on screen, and the answer being built for it ──
  const [current, setCurrent] = useState<Question | null>(null);
  const [draft, setDraft] = useState<AnswerDraft>({ kind: 'single', index: null });
  const [phase, setPhase] = useState<Phase>('answering');
  const [answerData, setAnswerData] = useState<AnswerResponse | null>(null);
  const [nextQuestion, setNextQuestion] = useState<Question | null>(null);

  const question: NormalizedQuestion | null = useMemo(
    () => (current ? normalizeQuestion(current) : null),
    [current]
  );

  const seenIdsRef = useRef<string[]>([]);
  const askedAtRef = useRef<number>(Date.now());
  const scrollRef = useRef<ScrollView>(null);

  // ── Session strip ──
  const [answeredCount, setAnsweredCount] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [streak, setStreak] = useState(0);
  const [sessionTime, setSessionTime] = useState(0);

  const accuracy = answeredCount === 0 ? 0 : Math.round((correctCount / answeredCount) * 100);

  const [toastMsg, setToastMsg] = useState('');
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState<string | null>(null);
  const [reportDetails, setReportDetails] = useState('');
  const [confirmExit, setConfirmExit] = useState(false);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 2500);
  };

  useEffect(() => {
    const timer = setInterval(() => setSessionTime((prev) => prev + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  /** Puts a question on screen with an empty answer of the right shape. */
  const present = useCallback((q: Question | null) => {
    setCurrent(q);
    setAnswerData(null);
    setNextQuestion(null);
    setPhase('answering');
    askedAtRef.current = Date.now();
    if (q) {
      setDraft(emptyDraft(normalizeQuestion(q)));
      if (!seenIdsRef.current.includes(q.question_id)) seenIdsRef.current.push(q.question_id);
      scrollRef.current?.scrollTo({ y: 0, animated: false });
    }
  }, []);

  // ── Anti-cheat: app switch detection ──
  const [showSwitchWarning, setShowSwitchWarning] = useState(false);
  const switchWarningShownRef = useRef(false);
  const appStateRef = useRef(AppState.currentState);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (
        appStateRef.current === 'active' &&
        (nextAppState === 'background' || nextAppState === 'inactive')
      ) {
        if (sessionStatus === 'active') {
          if (switchWarningShownRef.current) {
            // Second offence — end the session.
            navigation.goBack();
          } else {
            switchWarningShownRef.current = true;
          }
        }
      }

      if (
        (appStateRef.current === 'background' || appStateRef.current === 'inactive') &&
        nextAppState === 'active'
      ) {
        if (switchWarningShownRef.current && sessionStatus === 'active') {
          setShowSwitchWarning(true);
        }
      }

      appStateRef.current = nextAppState;
    });

    return () => subscription.remove();
  }, [sessionStatus]);

  useEffect(() => {
    const initSession = async () => {
      setSessionStatus('loading');
      try {
        const res = await EngineApi.startSession(chapterId, conceptId);
        setSessionId(res.session_id);

        if (res.exhausted || !res.first_question) {
          setSessionStatus('exhausted');
          return;
        }

        present(res.first_question);
        setSessionStatus('active');
      } catch (err: any) {
        console.error('Error starting session:', err);
        setSessionStatus('error');

        const detail = err.response?.data?.detail;
        if (err.response?.status === 404) {
          setErrorMsg('No questions have been added for this concept yet!');
        } else if (detail) {
          setErrorMsg(detail);
        } else {
          setErrorMsg('Something went wrong loading this session.');
        }
      }
    };
    initSession();
  }, [chapterId]);

  const handleSubmit = async () => {
    if (!question || !sessionId || phase !== 'answering' || !isDraftComplete(draft)) return;

    setPhase('submitting');
    try {
      const res = await EngineApi.submitAnswer(
        sessionId,
        question,
        draft,
        Date.now() - askedAtRef.current,
        seenIdsRef.current
      );

      setAnswerData(res);
      setPhase('answered');
      setAnsweredCount((n) => n + 1);

      if (res.correct) {
        HapticService.success();
        setCorrectCount((n) => n + 1);
        setStreak((s) => s + 1);
      } else {
        HapticService.error();
        setStreak(0);
      }

      if (res.next_question) {
        setNextQuestion(res.next_question);
      } else if (res.chapter_exhausted) {
        setSessionStatus('exhausted');
      }
    } catch (err) {
      console.error(err);
      setPhase('answering');
      showToast('Could not submit — try again');
    }
  };

  /** Moves to the question the engine already handed us, or ends the run. */
  const advance = useCallback(() => {
    if (nextQuestion) {
      present(nextQuestion);
    } else {
      setSessionStatus('exhausted');
    }
  }, [nextQuestion, present]);

  // A correct answer does not need a button press to move on.
  useEffect(() => {
    if (phase !== 'answered' || !answerData?.correct || !nextQuestion) return;
    const timer = setTimeout(advance, CORRECT_ADVANCE_MS);
    return () => clearTimeout(timer);
  }, [phase, answerData?.correct, nextQuestion, advance]);

  const handleSkip = async () => {
    if (!question || !sessionId || phase !== 'answering') return;

    setPhase('submitting');
    try {
      const res = await EngineApi.skipQuestion(sessionId, question.id, seenIdsRef.current);
      setStreak(0);

      if (res.concept_deferred) showToast("We'll come back to this concept later");

      if (res.next_question) {
        present(res.next_question);
      } else {
        setSessionStatus('exhausted');
        setPhase('answering');
      }
    } catch (err) {
      console.error(err);
      setPhase('answering');
      showToast('Could not skip — try again');
    }
  };

  const handleExit = async () => {
    setConfirmExit(false);
    if (!sessionId) {
      navigation.goBack();
      return;
    }
    setSessionStatus('loading');
    try {
      const summary = await EngineApi.endSession(sessionId);
      setSummaryData(summary);
      setSessionStatus('summary');
    } catch (err) {
      navigation.goBack();
    }
  };

  const handleBookmark = () => showToast('Saved');

  /**
   * The "challenge a friend" affordance hands the question that is on screen to
   * the Challenges tab pre-filled, rather than sending anything from here — who
   * to send it to and how long they get is still a decision.
   */
  const handleChallenge = () => {
    if (!question) return;
    navigation.navigate('Challenges', {
      screen: 'ChallengeCompose',
      params: { questionId: question.id, chapterId, chapterName: chapterTitle },
    });
  };

  const submitReport = async () => {
    if (!reportReason || !question) return;
    try {
      await EngineApi.reportQuestion(question.id, reportReason, reportDetails);
      showToast("Thanks, we'll take a look");
    } catch (err) {
      showToast('Failed to send report');
    } finally {
      setIsReportOpen(false);
      setReportReason(null);
      setReportDetails('');
    }
  };

  /**
   * Every state renders the same shell, so the backdrop is mounted once rather
   * than pasted into each one. A plain function rather than a component: a new
   * component type each render would remount the session on every state change.
   */
  const shell = (children: React.ReactNode) => (
    <View style={styles.root}>
      <SubjectBackdrop color={tint} />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {children}
      </SafeAreaView>
    </View>
  );

  // ── Header ─────────────────────────────────────────────────────────────────

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerTop}>
        <PressableScale
          scaleTo={0.9}
          onPress={() => (sessionStatus === 'active' ? setConfirmExit(true) : navigation.goBack())}
          accessibilityLabel="Leave session"
          style={styles.circleButton}
        >
          <ChevronLeft color={TEXT} size={20} strokeWidth={2.4} />
        </PressableScale>

        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {chapterTitle || 'Practice'}
          </Text>
          <Text style={styles.headerSub}>Adaptive session</Text>
        </View>

        <PressableScale
          scaleTo={0.9}
          onPress={() => setIsReportOpen(true)}
          disabled={!question}
          accessibilityLabel="Report this question"
          style={styles.circleButton}
        >
          <Flag color={TEXT_MUTED} size={17} strokeWidth={2} />
        </PressableScale>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.stats}>
          <View style={styles.stat}>
            <Timer color={TEXT_FAINT} size={14} strokeWidth={2} />
            <Text style={styles.statText}>{formatClock(sessionTime)}</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statText}>{answeredCount} answered</Text>
          </View>
          <View style={styles.stat}>
            <Flame color={streak > 0 ? accent : TEXT_FAINT} size={14} strokeWidth={2} />
            <Text style={[styles.statText, streak > 0 && { color: accent }]}>{streak}</Text>
          </View>
        </View>

        <View style={styles.headerActions}>
          <PressableScale
            scaleTo={0.9}
            onPress={handleBookmark}
            disabled={!question}
            accessibilityLabel="Save this question"
            hitSlop={8}
          >
            <Bookmark color={TEXT_MUTED} size={17} strokeWidth={2} />
          </PressableScale>
          <PressableScale
            scaleTo={0.9}
            onPress={handleChallenge}
            disabled={!question}
            accessibilityLabel="Challenge a friend with this question"
            hitSlop={8}
          >
            <Share2 color={TEXT_MUTED} size={17} strokeWidth={2} />
          </PressableScale>
        </View>
      </View>

      {/* Accuracy, where the vertical mastery bar used to be: a strip the width
          of the screen rather than a column stealing it from the options. */}
      <View style={styles.accuracyRow}>
        <View style={styles.track}>
          <View
            style={[
              styles.trackFill,
              { width: `${answeredCount === 0 ? 0 : Math.max(4, accuracy)}%`, backgroundColor: accent },
            ]}
          />
        </View>
        <Text style={styles.accuracyText}>{answeredCount === 0 ? '—' : `${accuracy}%`}</Text>
      </View>
    </View>
  );

  // ── Non-active states ──────────────────────────────────────────────────────

  if (sessionStatus === 'loading') {
    return shell(
      <>
        {renderHeader()}
        <View style={styles.centered}>
          <ActivityIndicator color={accent} size="large" />
        </View>
      </>
    );
  }

  if (sessionStatus === 'error') {
    return shell(
      <>
        {renderHeader()}
        <View style={styles.centered}>
          <Text style={styles.centeredTitle}>Connection error</Text>
          <Text style={styles.centeredText}>
            {errorMsg || 'Failed to connect to the backend engine.'}
          </Text>
          <PressableScale onPress={() => navigation.goBack()} style={styles.secondaryButton}>
            <Text style={styles.secondaryText}>Go back</Text>
          </PressableScale>
        </View>
      </>
    );
  }

  if (sessionStatus === 'exhausted' && phase !== 'answered') {
    return shell(
      <>
        {renderHeader()}
        <View style={styles.centered}>
          <View style={styles.masterCard}>
            <Trophy color={POSITIVE} size={52} />
            <Text style={styles.centeredTitle}>You are a master now</Text>
            <Text style={styles.centeredText}>
              You have cleared every question available for this concept.
            </Text>
            <PressableScale
              onPress={handleExit}
              style={[styles.primaryButton, { backgroundColor: accent }]}
            >
              <Text style={styles.primaryText}>Review summary</Text>
            </PressableScale>
          </View>
        </View>
        {renderSummaryModal()}
      </>
    );
  }

  // ── The session ────────────────────────────────────────────────────────────

  const answering = phase === 'answering';
  const answered = phase === 'answered';
  const reveal =
    answered && answerData
      ? { correctAnswer: answerData.correct_answer ?? '', correct: answerData.correct }
      : null;

  return shell(
    <>
      {renderHeader()}

      {!!toastMsg && (
        <View style={styles.toastWrap} pointerEvents="none">
          <View style={styles.toastPill}>
            <Text style={styles.toastText}>{toastMsg}</Text>
          </View>
        </View>
      )}

      {question ? (
        <ScrollView
          ref={scrollRef}
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View key={question.id} entering={FadeInDown.duration(240)} style={{ gap: 20 }}>
            <QuestionView
              question={question}
              draft={draft}
              accent={accent}
              reveal={reveal}
              onDraftChange={setDraft}
            />

            {answered && answerData && !answerData.correct ? (
              <SolutionCard
                steps={answerData.solution?.steps ?? []}
                misconception={answerData.solution?.misconception_tag ?? null}
              />
            ) : null}
          </Animated.View>
        </ScrollView>
      ) : (
        <View style={styles.centered}>
          <ActivityIndicator color={accent} />
        </View>
      )}

      {/* ── Action bar ── */}
      <View style={styles.footer}>
        {answering || phase === 'submitting' ? (
          <>
            <PressableScale
              onPress={handleSkip}
              disabled={phase === 'submitting'}
              scaleTo={0.95}
              style={styles.skipButton}
            >
              <SkipForward color={TEXT_MUTED} size={15} strokeWidth={2} />
              <Text style={styles.skipText}>Skip</Text>
            </PressableScale>

            <PressableScale
              onPress={handleSubmit}
              disabled={!isDraftComplete(draft) || phase === 'submitting'}
              scaleTo={0.97}
              style={[
                styles.submitButton,
                {
                  backgroundColor: isDraftComplete(draft) && phase === 'answering' ? accent : SURFACE_STRONG,
                },
              ]}
            >
              {phase === 'submitting' ? (
                <ActivityIndicator color={TEXT_MUTED} size="small" />
              ) : (
                <Text
                  style={[
                    styles.submitText,
                    { color: isDraftComplete(draft) ? '#0B0B0C' : TEXT_FAINT },
                  ]}
                >
                  Submit
                </Text>
              )}
            </PressableScale>
          </>
        ) : (
          <>
            <View style={styles.verdictBanner}>
              {answerData?.correct ? (
                <Check color={POSITIVE} size={16} strokeWidth={2.6} />
              ) : (
                <X color={NEGATIVE} size={16} strokeWidth={2.6} />
              )}
              <Text
                style={[styles.verdictText, { color: answerData?.correct ? POSITIVE : NEGATIVE }]}
              >
                {answerData?.correct ? 'Correct' : 'Incorrect'}
              </Text>
            </View>

            {/* A right answer moves on by itself, so it needs no button — unless
                there is nothing left to move on to. */}
            {!answerData?.correct || !nextQuestion ? (
              <PressableScale
                onPress={nextQuestion ? advance : handleExit}
                scaleTo={0.97}
                style={[styles.submitButton, { backgroundColor: '#F5F5F7' }]}
              >
                <Text style={[styles.submitText, { color: '#0B0B0C' }]}>
                  {nextQuestion ? 'Next question' : 'Finish session'}
                </Text>
              </PressableScale>
            ) : null}
          </>
        )}
      </View>

      {renderSummaryModal()}
      {renderReportModal()}

      {/* Leaving mid-session is a decision, not a swipe. */}
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
                onPress={handleExit}
                scaleTo={0.96}
                style={[styles.modalButton, { backgroundColor: accent }]}
              >
                <Text style={[styles.modalButtonText, { color: '#0B0B0C' }]}>End session</Text>
              </PressableScale>
            </View>
          </View>
        </View>
      </Modal>

      {/* Anti-cheat warning */}
      <Modal visible={showSwitchWarning} animationType="fade" transparent>
        <View style={styles.modalScrim}>
          <View style={[styles.modalCard, { alignItems: 'center' }]}>
            <AlertTriangle color="#F0B65C" size={44} />
            <Text style={[styles.modalTitle, { marginTop: 14 }]}>Don't switch apps</Text>
            <Text style={[styles.modalText, { textAlign: 'center' }]}>
              Switching to another app during practice is not allowed. If you do it again, your
              session will end automatically.
            </Text>
            <PressableScale
              onPress={() => setShowSwitchWarning(false)}
              scaleTo={0.96}
              style={[styles.modalButton, { backgroundColor: accent, marginTop: 22, width: '100%' }]}
            >
              <Text style={[styles.modalButtonText, { color: '#0B0B0C' }]}>Continue practicing</Text>
            </PressableScale>
          </View>
        </View>
      </Modal>
    </>
  );

  // ── Modals ─────────────────────────────────────────────────────────────────

  function renderSummaryModal() {
    return (
      <Modal visible={sessionStatus === 'summary'} animationType="slide" transparent>
        <View style={styles.sheetScrim}>
          <View style={styles.sheet}>
            <Text style={styles.modalTitle}>Session complete</Text>
            <View style={styles.summaryRow}>
              <View style={styles.summaryBox}>
                <Text style={styles.summaryValue}>{summaryData?.questions_answered ?? answeredCount}</Text>
                <Text style={styles.summaryLabel}>Answered</Text>
              </View>
              <View style={styles.summaryBox}>
                <Text style={styles.summaryValue}>{summaryData?.accuracy ?? accuracy}%</Text>
                <Text style={styles.summaryLabel}>Accuracy</Text>
              </View>
              <View style={styles.summaryBox}>
                <Text style={styles.summaryValue}>{formatClock(sessionTime)}</Text>
                <Text style={styles.summaryLabel}>Time</Text>
              </View>
            </View>
            <PressableScale
              onPress={() => navigation.goBack()}
              style={[styles.primaryButton, { backgroundColor: accent }]}
            >
              <Text style={styles.primaryText}>Done</Text>
            </PressableScale>
          </View>
        </View>
      </Modal>
    );
  }

  function renderReportModal() {
    return (
      <Modal visible={isReportOpen} animationType="slide" transparent>
        <View style={styles.sheetScrim}>
          <View style={styles.sheet}>
            <View style={styles.sheetHead}>
              <Text style={styles.modalTitle}>Report question</Text>
              <PressableScale
                scaleTo={0.9}
                onPress={() => setIsReportOpen(false)}
                style={styles.circleButton}
              >
                <X color={TEXT_MUTED} size={18} strokeWidth={2} />
              </PressableScale>
            </View>

            <Text style={styles.sheetLabel}>What's wrong?</Text>
            <View style={styles.reasonWrap}>
              {REPORT_REASONS.map((reason) => {
                const picked = reportReason === reason;
                return (
                  <PressableScale
                    key={reason}
                    scaleTo={0.96}
                    onPress={() => setReportReason(reason)}
                    style={[
                      styles.reasonChip,
                      picked && { borderColor: `${accent}88`, backgroundColor: `${accent}1A` },
                    ]}
                  >
                    <Text style={[styles.reasonText, picked && { color: accent }]}>{reason}</Text>
                  </PressableScale>
                );
              })}
            </View>

            {reportReason === 'Other' && (
              <TextInput
                style={styles.reportInput}
                placeholder="Any additional details?"
                placeholderTextColor={TEXT_FAINT}
                value={reportDetails}
                onChangeText={setReportDetails}
              />
            )}

            {reportReason && (
              <PressableScale
                onPress={submitReport}
                style={[styles.primaryButton, { backgroundColor: accent }]}
              >
                <Text style={styles.primaryText}>Submit report</Text>
              </PressableScale>
            )}
          </View>
        </View>
      </Modal>
    );
  }
}

const styles = StyleSheet.create({
  // The backdrop lives on the root; everything above it is transparent so the
  // subject tint and its waves are actually visible.
  root: { flex: 1, backgroundColor: colors.hudjeeBgBase },
  safeArea: { flex: 1, backgroundColor: 'transparent' },

  // ── Header ──
  header: { paddingHorizontal: GUTTER, paddingTop: 4, gap: 14, paddingBottom: 14 },
  headerTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerTitleWrap: { flex: 1, alignItems: 'center' },
  headerTitle: { color: TEXT, fontSize: 16, fontFamily: typography.bold, letterSpacing: -0.3 },
  headerSub: { color: TEXT_FAINT, fontSize: 11, fontFamily: typography.regular, marginTop: 2 },
  circleButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: GLASS,
    borderWidth: 1,
    borderColor: GLASS_BORDER,
    alignItems: 'center',
    justifyContent: 'center',
  },

  statsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  stats: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statText: { color: TEXT_MUTED, fontSize: 13, fontFamily: typography.semiBold },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 18 },

  accuracyRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  track: { flex: 1, height: 4, borderRadius: 2, backgroundColor: TRACK, overflow: 'hidden' },
  trackFill: { height: '100%', borderRadius: 2 },
  accuracyText: { color: TEXT_FAINT, fontSize: 11, fontFamily: typography.semiBold, width: 34, textAlign: 'right' },

  // ── Question ──
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: GUTTER, paddingTop: 8, paddingBottom: 32 },

  // ── States ──
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: GUTTER, gap: 10 },
  centeredTitle: { color: TEXT, fontSize: 19, fontFamily: typography.bold, letterSpacing: -0.3, textAlign: 'center' },
  centeredText: { color: TEXT_MUTED, fontSize: 14, fontFamily: typography.regular, textAlign: 'center', lineHeight: 21 },
  masterCard: {
    alignItems: 'center',
    gap: 12,
    padding: 28,
    borderRadius: 24,
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: `${POSITIVE}33`,
  },

  // ── Footer ──
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: GUTTER,
    paddingTop: 12,
    paddingBottom: 20,
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
  submitText: { fontSize: 15, fontFamily: typography.bold, letterSpacing: -0.2 },
  verdictBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, paddingHorizontal: 6 },
  verdictText: { fontSize: 14, fontFamily: typography.bold },

  primaryButton: { width: '100%', alignItems: 'center', paddingVertical: 15, borderRadius: 999, marginTop: 8 },
  primaryText: { color: '#0B0B0C', fontSize: 15, fontFamily: typography.bold },
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

  // ── Toast ──
  toastWrap: { position: 'absolute', top: 128, left: 0, right: 0, alignItems: 'center', zIndex: 100 },
  toastPill: {
    backgroundColor: SURFACE_STRONG,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: SURFACE_BORDER,
  },
  toastText: { color: TEXT, fontSize: 13, fontFamily: typography.semiBold },

  // ── Modals ──
  modalScrim: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', paddingHorizontal: GUTTER },
  modalCard: { backgroundColor: '#16161A', borderRadius: 22, borderWidth: 1, borderColor: DIVIDER, padding: 24 },
  modalTitle: { color: TEXT, fontSize: 18, fontFamily: typography.bold, marginBottom: 8 },
  modalText: { color: TEXT_MUTED, fontSize: 14, fontFamily: typography.regular, lineHeight: 20 },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 22 },
  modalButton: { flex: 1, alignItems: 'center', paddingVertical: 14, borderRadius: 999 },
  modalButtonText: { fontSize: 14, fontFamily: typography.bold },

  sheetScrim: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#16161A',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    borderTopWidth: 1,
    borderColor: DIVIDER,
    padding: 24,
    paddingBottom: 40,
  },
  sheetHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sheetLabel: { color: TEXT_MUTED, fontSize: 13, fontFamily: typography.semiBold, marginBottom: 12 },

  summaryRow: { flexDirection: 'row', gap: 10, marginVertical: 18 },
  summaryBox: { flex: 1, alignItems: 'center', gap: 4, padding: 16, borderRadius: RADIUS, backgroundColor: SURFACE, borderWidth: 1, borderColor: SURFACE_BORDER },
  summaryValue: { color: TEXT, fontSize: 20, fontFamily: typography.bold },
  summaryLabel: { color: TEXT_FAINT, fontSize: 11, fontFamily: typography.regular },

  reasonWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  reasonChip: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: SURFACE_BORDER,
    backgroundColor: SURFACE,
  },
  reasonText: { color: TEXT_MUTED, fontSize: 13, fontFamily: typography.semiBold },
  reportInput: {
    backgroundColor: SURFACE,
    color: TEXT,
    padding: 14,
    borderRadius: 12,
    fontFamily: typography.regular,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: SURFACE_BORDER,
  },
});
