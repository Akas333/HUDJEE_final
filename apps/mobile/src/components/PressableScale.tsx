import React from 'react';
import { Pressable } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { HapticService } from '../services/HapticService';

const FAST_OUT_SLOW_IN = Easing.bezier(0.4, 0, 0.2, 1);

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * The press behaviour used across the Home/Practice/Arena surfaces: an immediate
 * dip on touch down, a spring back on release, and a light haptic at the moment
 * of contact rather than on release, so the tap feels acknowledged before the
 * navigation happens.
 */
export default function PressableScale({
  children,
  onPress,
  onLongPress,
  style,
  scaleTo = 0.96,
  haptics = true,
  hitSlop,
  disabled = false,
}: {
  children: React.ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
  style?: any;
  scaleTo?: number;
  haptics?: boolean;
  hitSlop?: number;
  disabled?: boolean;
}) {
  const pressed = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - pressed.value * (1 - scaleTo) }],
    opacity: 1 - pressed.value * 0.1,
  }));

  return (
    <AnimatedPressable
      hitSlop={hitSlop}
      disabled={disabled}
      onPressIn={() => {
        pressed.value = withTiming(1, { duration: 110, easing: FAST_OUT_SLOW_IN });
        if (haptics) HapticService.light();
      }}
      onPressOut={() => {
        pressed.value = withSpring(0, { damping: 16, stiffness: 280, mass: 0.5 });
      }}
      onPress={onPress}
      onLongPress={onLongPress}
      style={[style, animatedStyle]}
    >
      {children}
    </AnimatedPressable>
  );
}
