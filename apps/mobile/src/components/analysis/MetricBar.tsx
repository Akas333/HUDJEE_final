import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { typography } from '../../theme/typography';
import { ACCENT, TEXT, TEXT_FAINT, TEXT_MUTED, TRACK } from '../../theme/ui';

/**
 * A labelled row with a bar under it — one chapter, one difficulty band, one
 * anything measured against a maximum.
 *
 * The bar is white by default. A row of five bars in five colours makes a
 * palette, not a comparison; keeping them one value means the only thing that
 * differs between rows is their length, which is the thing being compared.
 */
export default function MetricBar({
  label,
  meta,
  value,
  max,
  caption,
  color = ACCENT,
}: {
  label: string;
  /** Right of the label — a count, a time. */
  meta?: string;
  value: number;
  max: number;
  /** Under the bar — the reading, in words. */
  caption?: string;
  color?: string;
}) {
  const fraction = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0;

  return (
    <View style={styles.row}>
      <View style={styles.head}>
        <Text style={styles.label} numberOfLines={1}>
          {label}
        </Text>
        {meta ? <Text style={styles.meta}>{meta}</Text> : null}
      </View>

      <View style={styles.track}>
        <View style={[styles.fill, { width: `${fraction * 100}%`, backgroundColor: color }]} />
      </View>

      {caption ? <Text style={styles.caption}>{caption}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { gap: 8 },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 },
  label: { color: TEXT, fontSize: 13.5, fontFamily: typography.medium, flex: 1 },
  meta: { color: TEXT_MUTED, fontSize: 12, fontFamily: typography.semiBold },
  track: { height: 6, borderRadius: 3, backgroundColor: TRACK, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 3 },
  caption: { color: TEXT_FAINT, fontSize: 11.5, fontFamily: typography.regular },
});
