import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { typography } from '../../theme/typography';
import { enter, RADIUS, SURFACE, SURFACE_BORDER, TEXT_FAINT, TEXT_MUTED } from '../../theme/ui';

/**
 * A run of related settings as one card, with hairline rules between rows.
 *
 * Settings used to be a column of eight identical floating cards, which said
 * that every row was its own idea and none of them were related. Grouping is the
 * whole information design of a settings screen: the card boundary is what tells
 * you "notifications" and "haptics" are the same kind of decision and "delete
 * account" is not.
 */
export default function SettingsGroup({
  label,
  footnote,
  children,
  index = 0,
}: {
  /** Small caps heading above the card. Omit for an unlabelled single group. */
  label?: string;
  /** Explanatory line under the card — the place for the caveat nobody reads. */
  footnote?: string;
  children: React.ReactNode;
  /** Position in the screen's stack, for the staggered entrance. */
  index?: number;
}) {
  const rows = React.Children.toArray(children).filter(Boolean);

  return (
    <Animated.View entering={enter(2 + index)} style={styles.block}>
      {label ? <GroupLabel>{label}</GroupLabel> : null}

      <View style={styles.card}>
        {rows.map((row, i) => (
          <View key={i}>
            {i > 0 ? <View style={styles.rule} /> : null}
            {row}
          </View>
        ))}
      </View>

      {footnote ? <Text style={styles.footnote}>{footnote}</Text> : null}
    </Animated.View>
  );
}

/**
 * The group's heading on its own, for the case where what sits under it is not a
 * grouped card — an empty state, say, which brings its own card and must not be
 * nested inside another one.
 */
export function GroupLabel({ children }: { children: string }) {
  return <Text style={styles.label}>{children.toUpperCase()}</Text>;
}

const styles = StyleSheet.create({
  block: { marginBottom: 28 },
  label: {
    color: TEXT_FAINT,
    fontSize: 10,
    fontFamily: typography.bold,
    letterSpacing: 1.4,
    marginBottom: 10,
    marginLeft: 4,
  },
  card: {
    backgroundColor: SURFACE,
    borderRadius: RADIUS,
    borderWidth: 1,
    borderColor: SURFACE_BORDER,
    overflow: 'hidden',
  },
  // Inset by the card's own padding so the rule stops short of the border and
  // reads as a division within one card, not as a seam between two. Held at the
  // padding rather than at the text edge because groups without icons would
  // otherwise get a rule floating a third of the way across them.
  rule: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: SURFACE_BORDER,
    marginLeft: 16,
  },
  footnote: {
    color: TEXT_MUTED,
    fontSize: 12,
    fontFamily: typography.regular,
    lineHeight: 18,
    marginTop: 10,
    marginHorizontal: 4,
  },
});
