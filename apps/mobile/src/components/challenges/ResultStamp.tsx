import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { HapticService } from '../../services/HapticService';
import { typography } from '../../theme/typography';
import { DRAW, LOSS, WIN } from '../../theme/challenges';
import { ChallengeOutcome } from '../../services/challengesApi';

// The reveal. This is the one moment in Challenges allowed to feel celebratory —
// everywhere else the tab holds the same measured tone as Practice and Arena.
// An ink stamp rather than confetti: it lands hard once, tilts, and stays put.

const OUT_SLOW_IN = Easing.bezier(0.2, 0, 0, 1);

const COPY: Record<ChallengeOutcome, { label: string; color: string }> = {
  won: { label: 'WON', color: WIN },
  lost: { label: 'LOST', color: LOSS },
  draw: { label: 'DRAW', color: DRAW },
};

export default function ResultStamp({
  outcome,
  delay = 260,
}: {
  outcome: ChallengeOutcome;
  delay?: number;
}) {
  const scale = useSharedValue(2.4);
  const opacity = useSharedValue(0);
  const tilt = useSharedValue(-14);

  useEffect(() => {
    // Down fast and hard from oversize, then a small bounce as the ink sets.
    opacity.value = withDelay(delay, withTiming(1, { duration: 90 }));
    scale.value = withDelay(
      delay,
      withSequence(
        withTiming(0.94, { duration: 260, easing: OUT_SLOW_IN }),
        withSpring(1, { damping: 9, stiffness: 220, mass: 0.6 })
      )
    );
    tilt.value = withDelay(delay, withSpring(-6, { damping: 12, stiffness: 160 }));

    // Fires as the stamp lands, not when the screen mounts.
    const id = setTimeout(() => HapticService.medium(), delay + 200);
    return () => clearTimeout(id);
  }, [outcome, delay]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }, { rotate: `${tilt.value}deg` }],
  }));

  const { label, color } = COPY[outcome];

  return (
    <View style={styles.wrap} accessible accessibilityLabel={`Result: ${label.toLowerCase()}`}>
      <Animated.View style={[styles.stamp, { borderColor: color }, style]}>
        <Text style={[styles.label, { color }]}>{label}</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center', paddingVertical: 8 },
  stamp: {
    borderWidth: 3,
    borderRadius: 10,
    paddingHorizontal: 22,
    paddingVertical: 8,
    // Ink sits on the page, not in a box: no fill, so the card shows through.
    backgroundColor: 'transparent',
  },
  label: { fontSize: 30, fontFamily: typography.black, letterSpacing: 3 },
});
