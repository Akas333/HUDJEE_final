import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { typography } from '../../theme/typography';
import { SURFACE_BORDER, SURFACE_STRONG, TEXT } from '../../theme/challenges';
import { initialsOf } from '../../services/challengesApi';

// There are no uploaded avatars in the product yet, so the social surfaces stand
// on initials. A tinted disc per person rather than one grey disc for everybody:
// the hue is derived from the handle, so the same friend is always the same
// colour in the roster, the leaderboard and on their challenge cards.

const HUES = ['#6D5BD0', '#3EADCF', '#E3B24C', '#DE6E4B', '#4FB477', '#B45FA8', '#5A7FD0'];

function hueFor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) % 100000;
  return HUES[hash % HUES.length];
}

export default function Avatar({
  username,
  size = 40,
  /** A muted disc for someone who is not the subject of the row. */
  quiet = false,
}: {
  username: string | null | undefined;
  size?: number;
  quiet?: boolean;
}) {
  const accent = quiet ? SURFACE_STRONG : hueFor(username || 'hudjee');

  return (
    <View
      style={[
        styles.disc,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: quiet ? SURFACE_STRONG : `${accent}33`,
          borderColor: quiet ? SURFACE_BORDER : `${accent}66`,
        },
      ]}
    >
      <Text style={[styles.initials, { fontSize: size * 0.34, color: quiet ? TEXT : accent }]}>
        {initialsOf(username)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  disc: { borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  initials: { fontFamily: typography.bold, letterSpacing: 0.2 },
});
