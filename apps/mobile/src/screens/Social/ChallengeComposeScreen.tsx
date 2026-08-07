import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { Check, Send } from 'lucide-react-native';

import PressableScale from '../../components/PressableScale';
import SubjectBackdrop from '../../components/SubjectBackdrop';
import Skeleton from '../../components/Skeleton';
import Avatar from '../../components/challenges/Avatar';
import ChallengeHeader from '../../components/challenges/ChallengeHeader';
import TierBadge from '../../components/challenges/TierBadge';
import { useToastStore } from '../../services/ToastService';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { SUBJECT_COLORS, SubjectKey, withAlpha } from '../../theme/subjects';
import {
  CHALLENGE_TINT,
  DEFAULT_EXPIRY_HOURS,
  DEFAULT_SET_SIZE,
  DEFAULT_TIMER_SECONDS,
  EXPIRY_HOURS,
  GUTTER,
  PER_QUESTION_SECONDS,
  RADIUS,
  SECTION_GAP,
  SET_SIZES,
  SUBJECT_LABELS,
  SURFACE,
  SURFACE_BORDER,
  TEXT,
  TEXT_FAINT,
  TEXT_MUTED,
  formatExpiryWindow,
} from '../../theme/challenges';
import { useChallengesStore } from '../../store/challengesStore';
import {
  ChallengeChapter,
  ChallengeDraft,
  ChallengePreview,
  displayName,
  fetchChallengeChapters,
  previewChallengeSet,
} from '../../services/challengesApi';

// New Challenge. One scroll: who, what, how big, how fast, how long they have —
// then a confirm line that reads back the whole thing in a sentence before
// anything is sent.
//
// Entry points that pre-fill: a Friend Profile or leaderboard row (opponent), the
// post-answer affordance in Practice/Arena (`questionId` + chapter), and Rematch
// from a finished challenge (opponent + chapter).

const enter = (index: number) =>
  FadeInDown.springify().damping(18).mass(0.6).delay(Math.min(index, 10) * 40);

const SUBJECT_ORDER: SubjectKey[] = ['physics', 'chemistry', 'maths'];

function SectionHeader({ title, meta }: { title: string; meta?: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {meta ? <Text style={styles.sectionMeta}>{meta}</Text> : null}
    </View>
  );
}

function Pill({
  label,
  active,
  accent,
  onPress,
}: {
  label: string;
  active: boolean;
  accent: string;
  onPress: () => void;
}) {
  return (
    <PressableScale
      onPress={onPress}
      scaleTo={0.94}
      style={[styles.pill, active && { backgroundColor: `${accent}26`, borderColor: `${accent}66` }]}
      accessibilityLabel={label}
    >
      <Text style={[styles.pillText, active && { color: accent, fontFamily: typography.bold }]}>
        {label}
      </Text>
    </PressableScale>
  );
}

export default function ChallengeComposeScreen({ navigation, route }: any) {
  const params = route.params || {};

  const acceptedFriends = useChallengesStore((s) => s.acceptedFriends);
  const send = useChallengesStore((s) => s.send);
  const friends = acceptedFriends();

  const singleQuestionId: string | null = params.questionId ?? null;

  const [opponentId, setOpponentId] = useState<string | null>(params.opponentId ?? null);
  const [source, setSource] = useState<'single_question' | 'question_set'>(
    singleQuestionId ? 'single_question' : 'question_set'
  );
  const [chapters, setChapters] = useState<ChallengeChapter[]>([]);
  const [loadingChapters, setLoadingChapters] = useState(true);
  const [subject, setSubject] = useState<SubjectKey>(params.subject ?? 'physics');
  const [chapterId, setChapterId] = useState<string | null>(params.chapterId ?? null);
  const [setSize, setSetSize] = useState(DEFAULT_SET_SIZE);
  const [timerSeconds, setTimerSeconds] = useState(DEFAULT_TIMER_SECONDS);
  const [expiryHours, setExpiryHours] = useState(DEFAULT_EXPIRY_HOURS);

  const [preview, setPreview] = useState<ChallengePreview | null>(null);
  const [drawing, setDrawing] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    let alive = true;
    fetchChallengeChapters().then((list) => {
      if (!alive) return;
      setChapters(list);
      setLoadingChapters(false);
      // A pre-filled chapter decides the subject tab, so the card that sent you
      // here is the one that is already selected.
      if (params.chapterId) {
        const match = list.find((c) => c.chapterId === params.chapterId);
        if (match) setSubject(match.subject);
      }
    });
    return () => {
      alive = false;
    };
  }, []);

  const chaptersForSubject = useMemo(
    () => chapters.filter((c) => c.subject === subject),
    [chapters, subject]
  );

  const chapter = chapters.find((c) => c.chapterId === chapterId) || null;
  const opponent = friends.find((f) => f.userId === opponentId) || null;
  const accent = SUBJECT_COLORS[subject];

  const draft: ChallengeDraft | null = opponentId
    ? {
        opponentId,
        source,
        chapterId: chapter?.chapterId ?? null,
        chapterName: chapter?.name ?? null,
        subject: chapter?.subject ?? null,
        questionIds: source === 'single_question' && singleQuestionId ? [singleQuestionId] : undefined,
        setSize,
        timerSeconds,
        expiryHours,
      }
    : null;

  // The set is drawn before sending so the tier on the confirm line belongs to the
  // actual questions rather than to the chapter in general. A late response from a
  // configuration you have already changed must not overwrite the current one.
  const drawRef = useRef(0);
  useEffect(() => {
    if (source === 'single_question' && singleQuestionId) {
      const token = ++drawRef.current;
      setDrawing(true);
      previewChallengeSet({
        opponentId: opponentId || '',
        source,
        chapterId: null,
        chapterName: null,
        subject: null,
        questionIds: [singleQuestionId],
        setSize: 1,
        timerSeconds,
        expiryHours,
      }).then((result) => {
        if (drawRef.current !== token) return;
        setPreview(result);
        setDrawing(false);
      });
      return;
    }

    if (!chapterId) {
      setPreview(null);
      return;
    }

    const token = ++drawRef.current;
    setDrawing(true);
    previewChallengeSet({
      opponentId: opponentId || '',
      source: 'question_set',
      chapterId,
      chapterName: chapter?.name ?? null,
      subject: chapter?.subject ?? null,
      setSize,
      timerSeconds,
      expiryHours,
    }).then((result) => {
      if (drawRef.current !== token) return;
      setPreview(result);
      setDrawing(false);
    });
  }, [chapterId, setSize, source, singleQuestionId]);

  const shortfall =
    preview && preview.questionIds.length > 0 && preview.questionIds.length < setSize && source === 'question_set';

  const canSend = !!draft && !!preview && preview.questionIds.length > 0 && !sending && !drawing;

  const onSend = async () => {
    if (!draft || !preview) return;
    setSending(true);
    try {
      const match = await send(draft, preview);
      useToastStore.getState().showToast(
        `Challenge sent to ${displayName(opponent?.username)} — ${preview.questionIds.length} question${
          preview.questionIds.length === 1 ? '' : 's'
        }.`
      );
      navigation.replace('ChallengeDetail', { matchId: match.id });
    } catch (e: any) {
      // The DB guard's messages (mute, 3-open cap) are written to be read.
      useToastStore.getState().showToast(e?.message || 'Could not send that challenge', 'error');
      setSending(false);
    }
  };

  const summary = [
    preview ? `${preview.questionIds.length} question${preview.questionIds.length === 1 ? '' : 's'}` : null,
    source === 'single_question' ? 'This question' : chapter?.name,
    preview ? `Tier ${preview.tier}` : null,
    `${formatExpiryWindow(expiryHours)} to respond`,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <View style={styles.root}>
      <SubjectBackdrop color={chapter ? SUBJECT_COLORS[chapter.subject] : CHALLENGE_TINT} />

      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <ChallengeHeader
            eyebrow="NEW CHALLENGE"
            title="Pick your fight"
            subtitle="Both of you answer the same set, in your own time, before the window closes."
            onBack={() => navigation.goBack()}
          />

          {/* ── Opponent ── */}
          <Animated.View entering={enter(2)}>
            <SectionHeader title="Opponent" meta={friends.length > 0 ? `${friends.length} friend${friends.length === 1 ? '' : 's'}` : undefined} />

            {friends.length === 0 ? (
              <PressableScale
                style={styles.emptyCard}
                scaleTo={0.97}
                onPress={() => navigation.navigate('ManageFriends')}
              >
                <Text style={styles.emptyTitle}>No friends to challenge yet</Text>
                <Text style={styles.emptyText}>
                  Add someone by their username and they'll show up here.
                </Text>
              </PressableScale>
            ) : (
              <View style={styles.friendGrid}>
                {friends.map((friend) => {
                  const active = friend.userId === opponentId;
                  return (
                    <PressableScale
                      key={friend.userId}
                      scaleTo={0.95}
                      onPress={() => setOpponentId(friend.userId)}
                      style={[
                        styles.friendChip,
                        active && {
                          backgroundColor: withAlpha(CHALLENGE_TINT, 0.2),
                          borderColor: withAlpha(CHALLENGE_TINT, 0.55),
                        },
                      ]}
                      accessibilityLabel={`Challenge ${displayName(friend.username)}`}
                    >
                      <Avatar username={friend.username} size={30} />
                      <Text style={[styles.friendName, active && { color: TEXT, fontFamily: typography.bold }]} numberOfLines={1}>
                        {displayName(friend.username)}
                      </Text>
                      {friend.muted ? <Text style={styles.mutedTag}>MUTED</Text> : null}
                    </PressableScale>
                  );
                })}
              </View>
            )}
          </Animated.View>

          {/* ── Source ── */}
          {singleQuestionId ? (
            <Animated.View entering={enter(3)} style={{ marginTop: SECTION_GAP }}>
              <SectionHeader title="Source" />
              <View style={styles.pillRow}>
                <Pill
                  label="This question"
                  active={source === 'single_question'}
                  accent={accent}
                  onPress={() => setSource('single_question')}
                />
                <Pill
                  label="A whole set"
                  active={source === 'question_set'}
                  accent={accent}
                  onPress={() => setSource('question_set')}
                />
              </View>
            </Animated.View>
          ) : null}

          {/* ── Chapter ── */}
          {source === 'question_set' ? (
            <Animated.View entering={enter(4)} style={{ marginTop: SECTION_GAP }}>
              <SectionHeader title="Chapter" meta={chapter ? undefined : 'Required'} />

              <View style={styles.pillRow}>
                {SUBJECT_ORDER.map((key) => (
                  <Pill
                    key={key}
                    label={SUBJECT_LABELS[key]}
                    active={subject === key}
                    accent={SUBJECT_COLORS[key]}
                    onPress={() => setSubject(key)}
                  />
                ))}
              </View>

              <View style={{ gap: 8, marginTop: 14 }}>
                {loadingChapters ? (
                  <>
                    <Skeleton width="100%" height={52} borderRadius={14} />
                    <Skeleton width="100%" height={52} borderRadius={14} />
                  </>
                ) : chaptersForSubject.length === 0 ? (
                  <View style={styles.emptyCard}>
                    <Text style={styles.emptyText}>
                      No {SUBJECT_LABELS[subject]} chapters are published yet.
                    </Text>
                  </View>
                ) : (
                  chaptersForSubject.map((c) => {
                    const active = c.chapterId === chapterId;
                    return (
                      <PressableScale
                        key={c.chapterId}
                        scaleTo={0.98}
                        onPress={() => setChapterId(c.chapterId)}
                        style={[
                          styles.chapterRow,
                          active && { borderColor: `${accent}66`, backgroundColor: `${accent}14` },
                        ]}
                      >
                        <View style={styles.chapterTextCol}>
                          <Text style={styles.chapterName} numberOfLines={1}>
                            {c.name}
                          </Text>
                          <Text style={styles.chapterMeta}>
                            {c.totalQuestions} question{c.totalQuestions === 1 ? '' : 's'} in the bank
                          </Text>
                        </View>
                        {active ? <Check color={accent} size={17} strokeWidth={2.6} /> : null}
                      </PressableScale>
                    );
                  })
                )}
              </View>
            </Animated.View>
          ) : null}

          {/* ── Set size ── */}
          {source === 'question_set' ? (
            <Animated.View entering={enter(5)} style={{ marginTop: SECTION_GAP }}>
              <SectionHeader title="Set size" />
              <View style={styles.pillRow}>
                {SET_SIZES.map((n) => (
                  <Pill
                    key={n}
                    label={`${n} questions`}
                    active={setSize === n}
                    accent={accent}
                    onPress={() => setSetSize(n)}
                  />
                ))}
              </View>
            </Animated.View>
          ) : null}

          {/* ── Timer ── */}
          <Animated.View entering={enter(6)} style={{ marginTop: SECTION_GAP }}>
            <SectionHeader title="Timer" meta="Per question" />
            <View style={styles.pillRow}>
              {PER_QUESTION_SECONDS.map((s) => (
                <Pill
                  key={s}
                  label={`${s}s`}
                  active={timerSeconds === s}
                  accent={accent}
                  onPress={() => setTimerSeconds(s)}
                />
              ))}
            </View>
          </Animated.View>

          {/* ── Expiry ── */}
          <Animated.View entering={enter(7)} style={{ marginTop: SECTION_GAP }}>
            <SectionHeader title="Window" meta="Time to respond" />
            <View style={styles.pillRow}>
              {EXPIRY_HOURS.map((h) => (
                <Pill
                  key={h}
                  label={formatExpiryWindow(h)}
                  active={expiryHours === h}
                  accent={accent}
                  onPress={() => setExpiryHours(h)}
                />
              ))}
            </View>
          </Animated.View>

          {/* ── Confirm ── */}
          <Animated.View entering={enter(8)} style={styles.confirmCard}>
            <Text style={styles.confirmLabel}>SENDING</Text>

            <View style={styles.confirmTopRow}>
              {opponent ? <Avatar username={opponent.username} size={36} /> : null}
              <Text style={styles.confirmHeadline} numberOfLines={2}>
                {opponent ? displayName(opponent.username) : 'Pick an opponent'}
              </Text>
              {preview ? <TierBadge tier={preview.tier} /> : null}
            </View>

            {drawing ? (
              <View style={styles.drawingRow}>
                <ActivityIndicator color={TEXT_MUTED} size="small" />
                <Text style={styles.confirmSummary}>Drawing the set…</Text>
              </View>
            ) : (
              <Animated.Text entering={FadeIn.duration(200)} style={styles.confirmSummary}>
                {summary || 'Pick a chapter to see what they get'}
              </Animated.Text>
            )}

            {shortfall ? (
              <Text style={styles.confirmNote}>
                Only {preview!.questionIds.length} published question
                {preview!.questionIds.length === 1 ? '' : 's'} in this chapter — the set is that long.
              </Text>
            ) : null}

            {preview && preview.questionIds.length === 0 && chapterId ? (
              <Text style={styles.confirmWarning}>
                This chapter has no published single-answer questions to challenge on yet.
              </Text>
            ) : null}
          </Animated.View>
        </ScrollView>

        <View style={styles.footer}>
          <PressableScale
            onPress={onSend}
            disabled={!canSend}
            scaleTo={0.97}
            style={[styles.sendButton, !canSend && styles.sendButtonDisabled]}
            accessibilityLabel="Send challenge"
          >
            {sending ? (
              <ActivityIndicator color="#0B0B0C" size="small" />
            ) : (
              <>
                <Send color="#0B0B0C" size={16} strokeWidth={2.4} />
                <Text style={styles.sendText}>Send challenge</Text>
              </>
            )}
          </PressableScale>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.hudjeeBgBase },
  safeArea: { flex: 1 },
  container: { flex: 1 },
  content: { paddingHorizontal: GUTTER, paddingTop: 8, paddingBottom: 32 },

  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 },
  sectionTitle: { color: TEXT, fontSize: 17, fontFamily: typography.semiBold, letterSpacing: -0.2 },
  sectionMeta: { color: TEXT_FAINT, fontSize: 12, fontFamily: typography.regular },

  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: SURFACE_BORDER,
    backgroundColor: SURFACE,
  },
  pillText: { color: TEXT_MUTED, fontSize: 13, fontFamily: typography.semiBold },

  friendGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  friendChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingLeft: 6,
    paddingRight: 14,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: SURFACE_BORDER,
    backgroundColor: SURFACE,
    maxWidth: '100%',
  },
  friendName: { color: TEXT_MUTED, fontSize: 13, fontFamily: typography.semiBold, flexShrink: 1 },
  mutedTag: { color: TEXT_FAINT, fontSize: 9, fontFamily: typography.bold, letterSpacing: 0.8 },

  chapterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: SURFACE,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: SURFACE_BORDER,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  chapterTextCol: { flex: 1 },
  chapterName: { color: TEXT, fontSize: 15, fontFamily: typography.semiBold, letterSpacing: -0.2 },
  chapterMeta: { color: TEXT_FAINT, fontSize: 11, fontFamily: typography.regular, marginTop: 3 },

  confirmCard: {
    marginTop: SECTION_GAP + 4,
    backgroundColor: SURFACE,
    borderRadius: RADIUS,
    borderWidth: 1,
    borderColor: SURFACE_BORDER,
    padding: 20,
  },
  confirmLabel: { color: TEXT_FAINT, fontSize: 10, fontFamily: typography.bold, letterSpacing: 1.4 },
  confirmTopRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 12 },
  confirmHeadline: { flex: 1, color: TEXT, fontSize: 18, fontFamily: typography.bold, letterSpacing: -0.3 },
  confirmSummary: { color: TEXT_MUTED, fontSize: 13, fontFamily: typography.regular, marginTop: 14, lineHeight: 19 },
  drawingRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  confirmNote: { color: TEXT_FAINT, fontSize: 12, fontFamily: typography.regular, marginTop: 10, lineHeight: 17 },
  confirmWarning: { color: '#F0B65C', fontSize: 12, fontFamily: typography.semiBold, marginTop: 10, lineHeight: 17 },

  emptyCard: {
    backgroundColor: SURFACE,
    borderRadius: RADIUS,
    borderWidth: 1,
    borderColor: SURFACE_BORDER,
    padding: 20,
  },
  emptyTitle: { color: TEXT, fontSize: 15, fontFamily: typography.semiBold, marginBottom: 5 },
  emptyText: { color: TEXT_MUTED, fontSize: 13, fontFamily: typography.regular, lineHeight: 20 },

  footer: {
    paddingHorizontal: GUTTER,
    paddingTop: 12,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: SURFACE_BORDER,
    backgroundColor: 'rgba(11,11,12,0.86)',
  },
  sendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 15,
    borderRadius: 999,
    backgroundColor: '#F5F5F7',
  },
  sendButtonDisabled: { opacity: 0.45 },
  sendText: { color: '#0B0B0C', fontSize: 14, fontFamily: typography.bold },
});
