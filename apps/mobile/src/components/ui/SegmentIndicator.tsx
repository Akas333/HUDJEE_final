import React from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { ACCENT_GRADIENT, SURFACE_STRONG } from '../../theme/ui';

/** Same weight as the primary button's outline, so the two read as one system. */
const BORDER = 1.5;

/**
 * The sliding pill inside a segmented control — Practice's subject switcher,
 * the leaderboard's scope switcher — drawn in the accent ramp.
 *
 * It is the outline that moves, not a fill: a selected segment is the same kind
 * of thing as the primary button (the one control on screen the app is pointing
 * at), so it is marked the same way. Each control used to pick its own colour
 * for this — a subject tint in Practice, a purple in Challenges — which meant
 * the same gesture looked like a different mechanism on each screen.
 *
 * Render it *inside* the animated view that positions the pill, so the parent
 * keeps driving `translateX` and this only ever draws.
 */
export default function SegmentIndicator() {
  return (
    <LinearGradient
      colors={ACCENT_GRADIENT}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.frame}
    >
      <View style={styles.fill} />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  frame: { flex: 1, borderRadius: 999, padding: BORDER },
  // A step above the track it sits on, so the pill still reads as raised on the
  // screens where the segment sits on a card rather than on the page.
  fill: { flex: 1, borderRadius: 999, backgroundColor: SURFACE_STRONG },
});
