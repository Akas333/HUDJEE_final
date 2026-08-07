import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import PressableScale from '../PressableScale';
import Avatar from './Avatar';
import { typography } from '../../theme/typography';
import { DIVIDER, GOLD, TEXT, TEXT_FAINT, TEXT_MUTED } from '../../theme/challenges';
import { LeaderboardRow, displayName } from '../../services/challengesApi';

// A ruled line, not a card: the leaderboard is a ledger and stacking twenty
// bordered cards would turn a ranking into a list of unrelated objects.
//
// Rank in brass gold for the top three, but the numeral is always present and
// always legible — gold is the flourish, never the thing carrying the meaning
// (a colour-blind reader loses nothing).

export default function LedgerRow({
  row,
  onPress,
  last = false,
}: {
  row: LeaderboardRow;
  onPress?: () => void;
  last?: boolean;
}) {
  const podium = row.rank <= 3;
  const name = row.isSelf ? 'You' : displayName(row.username);

  const body = (
    <View style={[styles.row, last && styles.rowLast, row.isSelf && styles.rowSelf]}>
      <Text style={[styles.rank, podium && { color: GOLD }]}>{row.rank}</Text>

      <Avatar username={row.username} size={34} quiet={row.isSelf} />

      <View style={styles.nameGroup}>
        <Text style={[styles.name, row.isSelf && styles.nameSelf]} numberOfLines={1}>
          {name}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {row.activeDays} active day{row.activeDays === 1 ? '' : 's'}
          {row.questions > 0 ? ` · ${row.accuracyPct}% accuracy` : ''}
        </Text>
      </View>

      <View style={styles.scoreGroup}>
        <Text style={styles.score}>{row.questions}</Text>
        <Text style={styles.scoreUnit}>Qs</Text>
      </View>
    </View>
  );

  if (!onPress) return body;

  return (
    <PressableScale
      onPress={onPress}
      scaleTo={0.99}
      accessibilityLabel={`Rank ${row.rank}, ${name}, ${row.questions} questions this week`}
    >
      {body}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: DIVIDER,
  },
  rowLast: { borderBottomWidth: 0 },
  // The student's own row is lifted a hair rather than boxed, so the ruled run
  // stays unbroken.
  rowSelf: { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 10, paddingHorizontal: 8 },

  rank: { width: 22, color: TEXT_MUTED, fontSize: 13, fontFamily: typography.bold, textAlign: 'center' },

  nameGroup: { flex: 1 },
  name: { color: TEXT, fontSize: 15, fontFamily: typography.semiBold, letterSpacing: -0.2 },
  nameSelf: { fontFamily: typography.bold },
  meta: { color: TEXT_FAINT, fontSize: 11, fontFamily: typography.regular, marginTop: 2 },

  scoreGroup: { flexDirection: 'row', alignItems: 'baseline', gap: 3 },
  score: { color: TEXT, fontSize: 16, fontFamily: typography.bold, letterSpacing: -0.3 },
  scoreUnit: { color: TEXT_FAINT, fontSize: 10, fontFamily: typography.regular },
});
