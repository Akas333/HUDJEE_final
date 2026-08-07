import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { typography } from '../../theme/typography';
import { DifficultyTier, TIER_BLURBS, TIER_COLORS, TIER_LABELS } from '../../theme/challenges';

/**
 * The coarse difficulty band. Challenges shows this and never the raw number:
 * visibility here is competitive context, not the instrument reading Arena
 * deliberately exposes.
 */
export default function TierBadge({
  tier,
  withBlurb = false,
}: {
  tier: DifficultyTier;
  /** Adds "Standard" / "Brutal" beside the tier, for config and detail screens. */
  withBlurb?: boolean;
}) {
  const accent = TIER_COLORS[tier];

  return (
    <View style={[styles.badge, { backgroundColor: `${accent}1F`, borderColor: `${accent}52` }]}>
      <Text style={[styles.label, { color: accent }]}>{TIER_LABELS[tier]}</Text>
      {withBlurb ? <Text style={styles.blurb}>{TIER_BLURBS[tier]}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  label: { fontSize: 10, fontFamily: typography.bold, letterSpacing: 0.8 },
  blurb: { color: 'rgba(245,245,247,0.55)', fontSize: 10, fontFamily: typography.regular },
});
