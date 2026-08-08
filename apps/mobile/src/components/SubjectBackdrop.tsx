import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { backdropFor } from '../theme/subjects';

const FADE_DURATION = 600;
const FAST_OUT_SLOW_IN = Easing.bezier(0.4, 0, 0.2, 1);

/** Home's backdrop, in whatever colour it is handed. */
function Wash({ color }: { color: string }) {
  return (
    <LinearGradient
      colors={backdropFor(color)}
      start={{ x: 0.2, y: 0.1 }}
      end={{ x: 0.8, y: 0.8 }}
      style={StyleSheet.absoluteFill}
    />
  );
}

/**
 * The subject-tinted background: the same wash as Home, at the same angle and
 * stops, tinted by whichever subject the student is inside. Changing `color`
 * cross-fades the new wash in over the old one.
 */
export default function SubjectBackdrop({ color }: { color: string }) {
  // `from` is the colour being replaced; it sits underneath until the fade ends.
  const [pair, setPair] = useState({ from: color, to: color });
  const phase = useSharedValue(1);

  useEffect(() => {
    if (color === pair.to) return;
    setPair({ from: pair.to, to: color });
    phase.value = 0;
    phase.value = withTiming(1, { duration: FADE_DURATION, easing: FAST_OUT_SLOW_IN });
  }, [color]);

  const incoming = useAnimatedStyle(() => ({ opacity: phase.value }));

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Wash color={pair.from} />
      <Animated.View style={[StyleSheet.absoluteFill, incoming]}>
        <Wash color={pair.to} />
      </Animated.View>
    </View>
  );
}
