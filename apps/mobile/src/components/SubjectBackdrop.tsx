import React from 'react';
import { StyleSheet, View } from 'react-native';

import { BG } from '../theme/ui';

/**
 * The page every screen sits on: flat near-black, edge to edge.
 *
 * This used to be a subject-tinted wash — a gradient from the area's colour
 * down to black, cross-fading whenever the student changed subject. It is flat
 * now, and that is the point of the system: a wash is brightest at the top of
 * the screen, so the same card read as two different shades depending on how
 * far you had scrolled, and a translucent card over it came out darker than the
 * page lower down. Solid cards on a flat page hold their weight anywhere.
 *
 * `color` is still accepted, and still passed by every screen, because a screen
 * declaring which area it belongs to is worth keeping — the tint drives the
 * accent marks (subject badges, segmented pills, chapter dots) that now carry
 * that job on their own. Nothing paints it full-bleed any more.
 */
export default function SubjectBackdrop({ color: _color }: { color: string }) {
  return <View style={styles.page} pointerEvents="none" />;
}

const styles = StyleSheet.create({
  // Written out rather than spread from `StyleSheet.absoluteFill`, which is a
  // registered style rather than a plain object on some versions.
  page: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: BG },
});
