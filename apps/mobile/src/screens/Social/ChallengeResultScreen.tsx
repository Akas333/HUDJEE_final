import React, { useCallback, useEffect } from 'react';
import { ActivityIndicator, Share, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { RefreshCw, Share2 } from 'lucide-react-native';

import PressableScale from '../../components/PressableScale';
import SubjectBackdrop from '../../components/SubjectBackdrop';
import Avatar from '../../components/challenges/Avatar';
import ChallengeHeader from '../../components/challenges/ChallengeHeader';
import ResultStamp from '../../components/challenges/ResultStamp';
import TierBadge from '../../components/challenges/TierBadge';
import { useToastStore } from '../../services/ToastService';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { SUBJECT_COLORS } from '../../theme/subjects';
import {
  CHALLENGE_TINT,
  DIVIDER,
  GAP,
  GUTTER,
  LOSS,
  RADIUS,
  SECTION_GAP,
  SURFACE,
  SURFACE_BORDER,
  TEXT,
  TEXT_FAINT,
  TEXT_MUTED,
  WIN,
  formatDurationMs,
} from '../../theme/challenges';
import { useChallengesStore } from '../../store/challengesStore';
import {
  ChallengeAttempt,
  displayName,
  outcomeOf,
  resultsUnlocked,
} from '../../services/challengesApi';

// The reveal, and the only screen in Challenges allowed to raise its voice. It
// has two shapes: a holding screen while the other side is still answering, and
// the comparison once both halves are in.

const enter = (index: number) =>
  FadeInDown.springify().damping(18).mass(0.6).delay(Math.min(index, 8) * 60);

/** One row of the comparison: the same measure for both people, side by side. */
function CompareRow({
  label,
  mine,
  theirs,
  mineWins,
  theirsWin,
  last = false,
}: {
  label: string;
  mine: string;
  theirs: string;
  mineWins: boolean;
  theirsWin: boolean;
  last?: boolean;
}) {
  return (
    <View style={[styles.compareRow, last && { borderBottomWidth: 0 }]}>
      <Text style={[styles.compareValue, mineWins && styles.compareValueWin]}>{mine}</Text>
      <Text style={styles.compareLabel}>{label}</Text>
      <Text style={[styles.compareValue, styles.compareValueRight, theirsWin && styles.compareValueWin]}>
        {theirs}
      </Text>
    </View>
  );
}

function attemptLine(attempt: ChallengeAttempt | null, total: number): string {
  if (!attempt?.completedAt) return 'Did not finish';
  return `${attempt.correctCount}/${total} correct`;
}

export default function ChallengeResultScreen({ navigation, route }: any) {
  const matchId: string = route.params?.matchId;
  const justFinished: boolean = !!route.params?.justFinished;

  const me = useChallengesStore((s) => s.me);
  const matchById = useChallengesStore((s) => s.matchById);
  const refreshMatch = useChallengesStore((s) => s.refreshMatch);
  const headToHead = useChallengesStore((s) => s.headToHead);
  const loadHeadToHead = useChallengesStore((s) => s.loadHeadToHead);

  const match = matchById(matchId);

  useFocusEffect(
    useCallback(() => {
      refreshMatch(matchId);
    }, [matchId, refreshMatch])
  );

  useEffect(() => {
    if (match?.opponentId) loadHeadToHead(match.opponentId);
  }, [match?.opponentId, match?.status]);

  if (!match) {
    return (
      <View style={styles.root}>
        <SubjectBackdrop color={CHALLENGE_TINT} />
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <View style={styles.centered}>
            <ActivityIndicator color={TEXT_MUTED} />
          </View>
        </SafeAreaView>
      </View>
    );
  }

  const tint = match.subject ? SUBJECT_COLORS[match.subject] : CHALLENGE_TINT;
  const opponent = displayName(match.opponent?.username);
  const total = match.questionIds.length;
  const unlocked = resultsUnlocked(match);
  const outcome = unlocked ? outcomeOf(match) : null;
  const record = headToHead[match.opponentId];

  const goHome = () => navigation.navigate('ChallengesHome');

  const rematch = () =>
    navigation.navigate('ChallengeCompose', {
      opponentId: match.opponentId,
      // A rematch re-draws the set rather than replaying it: the same questions
      // twice would reward memory, not speed.
      chapterId: match.chapterId,
      subject: match.subject,
    });

  const share = async () => {
    const mine = match.myAttempt;
    const theirs = match.theirAttempt;
    const headline =
      outcome === 'won'
        ? `I beat ${opponent} on HudJee`
        : outcome === 'lost'
          ? `${opponent} got me this time on HudJee`
          : `${opponent} and I drew on HudJee`;

    try {
      // A rendered result card is the spec's ask; text is what ships without a
      // view-to-image dependency, and it carries the same numbers.
      await Share.share({
        message: `${headline} — ${mine?.correctCount ?? 0}/${total} vs ${theirs?.correctCount ?? 0}/${total}${
          match.chapterName ? ` on ${match.chapterName}` : ''
        }.`,
      });
    } catch {
      useToastStore.getState().showToast('Could not open the share sheet', 'error');
    }
  };

  // ── holding screen ──
  if (!unlocked) {
    const mine = match.myAttempt;
    return (
      <View style={styles.root}>
        <SubjectBackdrop color={tint} />
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <ChallengeHeader
              eyebrow="READOUT PENDING"
              title={`Waiting on ${opponent}`}
              subtitle={
                justFinished
                  ? "Your set is locked in. We'll compare the two as soon as they finish theirs."
                  : `${opponent} hasn't finished their half yet — the comparison unlocks when they do.`
              }
              onBack={goHome}
            />

            <Animated.View entering={enter(2)} style={styles.soloCard}>
              <Text style={styles.soloLabel}>YOUR SET</Text>
              <Text style={styles.soloValue}>{attemptLine(mine, total)}</Text>
              <View style={styles.soloMetaRow}>
                <Text style={styles.soloMeta}>{formatDurationMs(mine?.totalTimeMs ?? 0)} total</Text>
                <View style={styles.metaDivider} />
                <Text style={styles.soloMeta}>
                  Best run of {mine?.longestStreak ?? 0}
                </Text>
                <View style={styles.metaDivider} />
                <Text style={styles.soloMeta}>Tier {match.tier}</Text>
              </View>
            </Animated.View>

            <Animated.View entering={enter(3)} style={styles.noteCard}>
              <Text style={styles.noteText}>
                Nothing about this challenge touches your mastery or your Arena rating — but
                finishing it counted towards today's streak.
              </Text>
            </Animated.View>
          </ScrollView>

          <View style={styles.footer}>
            <PressableScale onPress={goHome} scaleTo={0.97} style={styles.primaryButtonWide}>
              <Text style={styles.primaryText}>Back to Challenges</Text>
            </PressableScale>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  // ── comparison ──
  const mine = match.myAttempt;
  const theirs = match.theirAttempt;

  const myTime = mine?.completedAt ? mine.totalTimeMs : null;
  const theirTime = theirs?.completedAt ? theirs.totalTimeMs : null;
  const timeGap =
    myTime != null && theirTime != null ? Math.abs(myTime - theirTime) : null;

  const verdict =
    outcome === 'won'
      ? theirs?.completedAt
        ? timeGap != null && (mine?.correctCount ?? 0) === (theirs?.correctCount ?? 0)
          ? `You bested ${opponent} by ${formatDurationMs(timeGap)}.`
          : `You bested ${opponent}.`
        : `${opponent} never finished — this one's yours.`
      : outcome === 'lost'
        ? mine?.completedAt
          ? `${opponent} takes this one.`
          : `${opponent} finished and you didn't — theirs.`
        : 'Dead level, right down to the clock.';

  return (
    <View style={styles.root}>
      <SubjectBackdrop color={tint} />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <ChallengeHeader
            eyebrow={match.chapterName ? match.chapterName.toUpperCase() : 'CHALLENGE'}
            title="Result"
            onBack={goHome}
          />

          <Animated.View entering={enter(1)} style={styles.stampCard}>
            {outcome ? <ResultStamp outcome={outcome} /> : null}
            <Text style={styles.verdict}>{verdict}</Text>
            <TierBadge tier={match.tier} withBlurb />
          </Animated.View>

          {/* Side by side */}
          <Animated.View entering={enter(2)} style={styles.compareCard}>
            <View style={styles.compareHeader}>
              <View style={styles.compareWho}>
                {/* The student's own disc keeps their colour, the same one their
                    friends see next to their name on the board. */}
                <Avatar username={me?.username} size={34} />
                <Text style={styles.compareName}>You</Text>
              </View>
              <View style={[styles.compareWho, styles.compareWhoRight]}>
                <Text style={styles.compareName} numberOfLines={1}>
                  {opponent}
                </Text>
                <Avatar username={match.opponent?.username} size={34} />
              </View>
            </View>

            <CompareRow
              label="correct"
              mine={`${mine?.correctCount ?? 0}/${total}`}
              theirs={`${theirs?.correctCount ?? 0}/${total}`}
              mineWins={(mine?.correctCount ?? 0) > (theirs?.correctCount ?? 0)}
              theirsWin={(theirs?.correctCount ?? 0) > (mine?.correctCount ?? 0)}
            />
            <CompareRow
              label="total time"
              mine={myTime != null ? formatDurationMs(myTime) : '—'}
              theirs={theirTime != null ? formatDurationMs(theirTime) : '—'}
              mineWins={myTime != null && theirTime != null && myTime < theirTime}
              theirsWin={myTime != null && theirTime != null && theirTime < myTime}
            />
            <CompareRow
              label="best run"
              mine={`${mine?.longestStreak ?? 0}`}
              theirs={`${theirs?.longestStreak ?? 0}`}
              mineWins={(mine?.longestStreak ?? 0) > (theirs?.longestStreak ?? 0)}
              theirsWin={(theirs?.longestStreak ?? 0) > (mine?.longestStreak ?? 0)}
              last
            />

            {!mine?.completedAt || !theirs?.completedAt ? (
              <Text style={styles.dnfNote}>
                {!mine?.completedAt ? 'You' : opponent} did not finish before the window closed —
                marked as a no-show, with no streak penalty.
              </Text>
            ) : null}
          </Animated.View>

          {/* Standing between the two of you */}
          {record ? (
            <Animated.View entering={enter(3)} style={styles.recordCard}>
              <Text style={styles.recordLabel}>HEAD TO HEAD</Text>
              <Text style={styles.recordValue}>
                {record.wins}
                <Text style={styles.recordSep}> — </Text>
                {record.losses}
                {record.draws > 0 ? <Text style={styles.recordDraws}>  ·  {record.draws} drawn</Text> : null}
              </Text>
              <Text style={styles.recordCaption}>
                {record.wins === record.losses
                  ? `Level with ${opponent}`
                  : record.wins > record.losses
                    ? `You lead ${opponent}`
                    : `${opponent} leads you`}
              </Text>
            </Animated.View>
          ) : null}

          <Animated.View entering={enter(4)} style={styles.noteCard}>
            <Text style={styles.noteText}>
              Challenge results stay in the social layer: no mastery, no theta, no Arena rating moved
              here. What it did do is keep today's streak alive.
            </Text>
          </Animated.View>
        </ScrollView>

        <View style={styles.footer}>
          <PressableScale onPress={share} scaleTo={0.96} style={styles.secondaryButton}>
            <Share2 color={TEXT} size={16} strokeWidth={2.2} />
            <Text style={styles.secondaryText}>Share</Text>
          </PressableScale>
          <PressableScale onPress={rematch} scaleTo={0.97} style={styles.primaryButton}>
            <RefreshCw color="#0B0B0C" size={15} strokeWidth={2.4} />
            <Text style={styles.primaryText}>Rematch</Text>
          </PressableScale>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.hudjeeBgBase },
  safeArea: { flex: 1 },
  content: { paddingHorizontal: GUTTER, paddingTop: 8, paddingBottom: 32 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  stampCard: {
    alignItems: 'center',
    backgroundColor: SURFACE,
    borderRadius: RADIUS,
    borderWidth: 1,
    borderColor: SURFACE_BORDER,
    paddingVertical: 26,
    paddingHorizontal: 20,
    gap: 14,
  },
  verdict: {
    color: TEXT,
    fontSize: 17,
    fontFamily: typography.semiBold,
    letterSpacing: -0.3,
    textAlign: 'center',
    lineHeight: 24,
  },

  compareCard: {
    backgroundColor: SURFACE,
    borderRadius: RADIUS,
    borderWidth: 1,
    borderColor: SURFACE_BORDER,
    padding: 18,
    marginTop: GAP,
  },
  compareHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  compareWho: { flexDirection: 'row', alignItems: 'center', gap: 9, flex: 1 },
  compareWhoRight: { justifyContent: 'flex-end' },
  compareName: { color: TEXT, fontSize: 14, fontFamily: typography.semiBold, flexShrink: 1 },

  compareRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: DIVIDER,
  },
  compareValue: { flex: 1, color: TEXT_MUTED, fontSize: 18, fontFamily: typography.bold, letterSpacing: -0.4 },
  compareValueRight: { textAlign: 'right' },
  compareValueWin: { color: WIN },
  compareLabel: { color: TEXT_FAINT, fontSize: 11, fontFamily: typography.regular, textAlign: 'center', width: 88 },
  dnfNote: { color: LOSS, fontSize: 12, fontFamily: typography.regular, lineHeight: 18, marginTop: 14 },

  recordCard: {
    backgroundColor: SURFACE,
    borderRadius: RADIUS,
    borderWidth: 1,
    borderColor: SURFACE_BORDER,
    padding: 20,
    marginTop: GAP,
  },
  recordLabel: { color: TEXT_FAINT, fontSize: 10, fontFamily: typography.bold, letterSpacing: 1.4 },
  recordValue: { color: TEXT, fontSize: 28, fontFamily: typography.bold, letterSpacing: -0.8, marginTop: 10 },
  recordSep: { color: TEXT_FAINT, fontFamily: typography.regular },
  recordDraws: { color: TEXT_FAINT, fontSize: 13, fontFamily: typography.regular },
  recordCaption: { color: TEXT_MUTED, fontSize: 13, fontFamily: typography.regular, marginTop: 6 },

  soloCard: {
    backgroundColor: SURFACE,
    borderRadius: RADIUS,
    borderWidth: 1,
    borderColor: SURFACE_BORDER,
    padding: 20,
  },
  soloLabel: { color: TEXT_FAINT, fontSize: 10, fontFamily: typography.bold, letterSpacing: 1.4 },
  soloValue: { color: TEXT, fontSize: 24, fontFamily: typography.bold, letterSpacing: -0.6, marginTop: 10 },
  soloMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10, flexWrap: 'wrap' },
  soloMeta: { color: TEXT_FAINT, fontSize: 11, fontFamily: typography.regular },
  metaDivider: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: 'rgba(255,255,255,0.18)' },

  noteCard: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: SURFACE_BORDER,
    padding: 16,
    marginTop: SECTION_GAP,
  },
  noteText: { color: TEXT_MUTED, fontSize: 12, fontFamily: typography.regular, lineHeight: 18 },

  footer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: GUTTER,
    paddingTop: 12,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: SURFACE_BORDER,
    backgroundColor: 'rgba(11,11,12,0.86)',
  },
  secondaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 15,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: SURFACE_BORDER,
    backgroundColor: SURFACE,
  },
  secondaryText: { color: TEXT, fontSize: 14, fontFamily: typography.semiBold },
  primaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 15,
    borderRadius: 999,
    backgroundColor: '#F5F5F7',
  },
  primaryButtonWide: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 15,
    borderRadius: 999,
    backgroundColor: '#F5F5F7',
  },
  primaryText: { color: '#0B0B0C', fontSize: 14, fontFamily: typography.bold },
});
