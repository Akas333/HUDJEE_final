import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { typography } from '../../theme/typography';
import { RADIUS_INNER, TEXT_MUTED, TRACK } from '../../theme/ui';

export interface Slice {
  label: string;
  value: number;
  color: string;
}

/**
 * One bar split into its parts, with the legend carrying the numbers.
 *
 * Used for where the time went and how the attempts broke down. A slice under
 * about 6% of the bar is given that much anyway — below it the segment is a
 * sliver of colour that reads as a rendering artefact rather than as data — and
 * the percentage in the legend stays true regardless.
 */
export default function SplitBar({
  slices,
  height = 12,
  showLegend = true,
  unit,
}: {
  slices: Slice[];
  height?: number;
  showLegend?: boolean;
  /** Rendered after each legend value, e.g. "min". Percentages are shown when omitted. */
  unit?: string;
}) {
  const total = slices.reduce((acc, s) => acc + s.value, 0);
  const shown = slices.filter((s) => s.value > 0);

  return (
    <View>
      <View style={[styles.track, { height, borderRadius: height / 2 }]}>
        {total > 0 ? (
          shown.map((s, i) => (
            <View
              key={s.label}
              style={{
                flex: Math.max(s.value / total, 0.06),
                backgroundColor: s.color,
                marginLeft: i === 0 ? 0 : 1.5,
              }}
            />
          ))
        ) : null}
      </View>

      {showLegend ? (
        <View style={styles.legend}>
          {slices.map((s) => (
            <View key={s.label} style={styles.item}>
              <View style={[styles.dot, { backgroundColor: s.color }]} />
              <Text style={styles.itemLabel}>{s.label}</Text>
              <Text style={styles.itemValue}>
                {unit ? `${s.value} ${unit}` : total ? `${Math.round((s.value / total) * 100)}%` : '0%'}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  track: { flexDirection: 'row', backgroundColor: TRACK, overflow: 'hidden', borderRadius: RADIUS_INNER },
  legend: { marginTop: 14, gap: 10 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  itemLabel: { color: TEXT_MUTED, fontSize: 12.5, fontFamily: typography.regular, flex: 1 },
  itemValue: { color: TEXT_MUTED, fontSize: 12.5, fontFamily: typography.semiBold },
});
