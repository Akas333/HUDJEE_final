import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ChevronRight } from 'lucide-react-native';

import PressableScale from '../PressableScale';
import Avatar from './Avatar';
import TierBadge from './TierBadge';
import { typography } from '../../theme/typography';
import { SUBJECT_COLORS, SubjectKey } from '../../theme/subjects';
import {
  DRAW,
  GAP,
  LOSS,
  RADIUS,
  SURFACE,
  SURFACE_BORDER,
  TEXT,
  TEXT_FAINT,
  TEXT_MUTED,
  WIN,
  formatTimeLeft,
} from '../../theme/challenges';
import {
  ChallengeMatch,
  displayName,
  outcomeOf,
  resultsUnlocked,
  stateOf,
} from '../../services/challengesApi';

// The atomic unit of the Challenges tab: one card per challenge, in every list it
// appears in. The requisition-slip motif from the spec survives as the perforated
// left edge — a column of notches down the card — rather than as a second card
// style, because a differently-shaped card here would break the run of surfaces
// Home and Practice establish.

const STATE_ACCENT: Record<string, string> = {
  your_turn: WIN,
  waiting_on_them: '#40C9FF',
  awaiting_response: TEXT_MUTED,
  declined: DRAW,
  expired: DRAW,
  void: DRAW,
};

function NotchStrip() {
  // Purely decorative; the card's own accessibility label carries the content.
  return (
    <View style={styles.notches} pointerEvents="none">
      {Array.from({ length: 9 }).map((_, i) => (
        <View key={i} style={styles.notch} />
      ))}
    </View>
  );
}

export default function ChallengeTicket({
  match,
  onPress,
}: {
  match: ChallengeMatch;
  onPress: () => void;
}) {
  const state = stateOf(match);
  const opponent = displayName(match.opponent?.username);
  const outcome = resultsUnlocked(match) ? outcomeOf(match) : null;

  const accent =
    outcome === 'won' ? WIN : outcome === 'lost' ? LOSS : STATE_ACCENT[state.key] || TEXT_MUTED;

  const subjectAccent = match.subject ? SUBJECT_COLORS[match.subject as SubjectKey] : TEXT_FAINT;
  const count = match.questionIds.length;

  const closed = state.key === 'resolved' || state.key === 'expired' || state.key === 'void' || state.key === 'declined';

  return (
    <PressableScale
      onPress={onPress}
      scaleTo={0.97}
      style={styles.card}
      accessibilityLabel={`Challenge versus ${opponent}. ${state.label}. ${count} questions${
        match.chapterName ? `, ${match.chapterName}` : ''
      }.`}
    >
      <NotchStrip />

      <View style={styles.top}>
        <Avatar username={match.opponent?.username} size={40} />

        <View style={styles.titleGroup}>
          <Text style={styles.opponent} numberOfLines={1}>
            {match.isSender ? `You vs ${opponent}` : `${opponent} vs you`}
          </Text>
          <View style={styles.stateRow}>
            <View style={[styles.stateDot, { backgroundColor: accent }]} />
            <Text style={[styles.stateText, { color: accent }]}>{state.label.toUpperCase()}</Text>
          </View>
        </View>

        <ChevronRight color={TEXT_FAINT} size={18} strokeWidth={2} />
      </View>

      <View style={styles.metaRow}>
        {match.chapterName ? (
          <>
            <View style={[styles.subjectDot, { backgroundColor: subjectAccent }]} />
            <Text style={styles.metaText} numberOfLines={1}>
              {match.chapterName}
            </Text>
            <View style={styles.metaDivider} />
          </>
        ) : null}
        <Text style={styles.metaText}>
          {count} question{count === 1 ? '' : 's'}
        </Text>
        <View style={styles.metaDivider} />
        <Text style={styles.metaText}>
          {closed ? scoreLine(match) : formatTimeLeft(match.expiresAt)}
        </Text>
      </View>

      <View style={styles.footer}>
        <TierBadge tier={match.tier} />
        {/* Once the comparison is unlocked the card carries the numbers itself,
            so the list reads as a record and not as a queue of links. */}
        {outcome ? (
          <Text style={[styles.outcomeText, { color: accent }]}>
            {match.myAttempt?.correctCount ?? 0} — {match.theirAttempt?.correctCount ?? 0}
          </Text>
        ) : (
          <Text style={styles.timerText}>{match.timerSeconds}s per question</Text>
        )}
      </View>
    </PressableScale>
  );
}

/** The trailing meta on a closed card: who did what, in one phrase. */
function scoreLine(match: ChallengeMatch): string {
  const state = stateOf(match);
  if (state.key === 'declined') return 'No penalty';
  if (state.key === 'void') return 'Nobody finished';
  if (state.key === 'expired') return 'Window closed';

  const mine = match.myAttempt;
  const theirs = match.theirAttempt;
  if (mine?.completedAt && !theirs?.completedAt) return 'They did not finish';
  if (!mine?.completedAt && theirs?.completedAt) return 'You did not finish';
  return `${match.questionIds.length} answered`;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: SURFACE,
    borderRadius: RADIUS,
    borderWidth: 1,
    borderColor: SURFACE_BORDER,
    padding: 18,
    paddingLeft: 26,
    overflow: 'hidden',
  },

  // The perforation: a hairline column of notches, inset from the left edge.
  notches: {
    position: 'absolute',
    left: 9,
    top: 14,
    bottom: 14,
    justifyContent: 'space-between',
  },
  notch: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: 'rgba(255,255,255,0.14)' },

  top: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  titleGroup: { flex: 1 },
  opponent: { color: TEXT, fontSize: 16, fontFamily: typography.semiBold, letterSpacing: -0.2 },
  stateRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 5 },
  stateDot: { width: 5, height: 5, borderRadius: 2.5 },
  stateText: { fontSize: 10, fontFamily: typography.bold, letterSpacing: 1.1 },

  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16, flexWrap: 'wrap' },
  subjectDot: { width: 5, height: 5, borderRadius: 2.5 },
  metaText: { color: TEXT_FAINT, fontSize: 11, fontFamily: typography.regular, flexShrink: 1 },
  metaDivider: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: 'rgba(255,255,255,0.18)' },

  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: GAP,
  },
  timerText: { color: TEXT_FAINT, fontSize: 11, fontFamily: typography.regular },
  outcomeText: { fontSize: 14, fontFamily: typography.bold, letterSpacing: -0.2 },
});
