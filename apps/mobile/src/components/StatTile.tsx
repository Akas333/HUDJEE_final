import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { typography } from '../theme/typography';
import { RADIUS, SURFACE, SURFACE_BORDER, TEXT, TEXT_FAINT, TEXT_MUTED } from '../theme/ui';

/**
 * One number in a row of three. The label sits above the value rather than
 * below it, so a row of tiles has its numbers on a single baseline no matter how
 * long the labels run — with the label underneath, "Arena rating" wrapping to
 * two lines drops its number half a line below its neighbours'.
 */
export function StatTile({
  label,
  value,
  caption,
  icon: Icon,
  accent = TEXT_MUTED,
}: {
  label: string;
  value: string;
  /** A word under the number — a band, a trend. */
  caption?: string;
  icon?: any;
  accent?: string;
}) {
  return (
    <View style={styles.tile}>
      <View style={styles.head}>
        <Text style={styles.label} numberOfLines={1}>
          {label}
        </Text>
        {Icon ? <Icon color={accent} size={15} strokeWidth={2} /> : null}
      </View>

      <Text style={[styles.value, { color: accent }]} numberOfLines={1}>
        {value}
      </Text>
      {caption ? (
        <Text style={styles.caption} numberOfLines={1}>
          {caption}
        </Text>
      ) : null}
    </View>
  );
}

export default StatTile;

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    backgroundColor: SURFACE,
    borderRadius: RADIUS,
    borderWidth: 1,
    borderColor: SURFACE_BORDER,
    padding: 14,
    gap: 8,
  },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 },
  label: {
    color: TEXT_MUTED,
    fontSize: 10,
    fontFamily: typography.bold,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    flexShrink: 1,
  },
  value: { color: TEXT, fontSize: 24, fontFamily: typography.bold, letterSpacing: -0.6 },
  caption: { color: TEXT_FAINT, fontSize: 11, fontFamily: typography.regular },
});
