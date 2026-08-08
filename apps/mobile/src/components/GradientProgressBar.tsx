import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { GRADIENT, TRACK } from '../theme/home';

// The Home-screen progress bar, shared so every surface fills at the same rate,
// in the same gradient, on the same track colour.
export default function GradientProgressBar({ value, height = 8 }: { value: number; height?: number }) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: Math.max(0, Math.min(100, value)),
      duration: 700,
      // Width is not a transform, so this one has to run on the JS driver.
      useNativeDriver: false,
    }).start();
  }, [value]);

  const barWidth = anim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
    extrapolate: 'clamp',
  });

  return (
    <View style={[styles.track, { height, borderRadius: height / 2 }]}>
      <Animated.View style={{ width: barWidth, height: '100%' }}>
        <LinearGradient
          colors={GRADIENT}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ flex: 1, borderRadius: height / 2 }}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  track: { width: '100%', backgroundColor: TRACK, overflow: 'hidden' },
});
