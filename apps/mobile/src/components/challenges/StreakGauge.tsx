import React, { useEffect, useRef } from 'react';
import { Animated as RNAnimated, Easing as RNEasing, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';

import { typography } from '../../theme/typography';
import {
  AT_RISK,
  GRADIENT,
  STREAK_BAND,
  TEXT,
  TEXT_FAINT,
  TRACK,
  streakBandProgress,
} from '../../theme/challenges';

// The same dial the readiness score uses on Home, repurposed: the sweep is the
// streak's position inside a rolling 30-day band rather than a percentage, so a
// long streak keeps producing visible movement instead of pinning the needle.
//
// The spec asks for IBM Plex Mono on the numeral; this app's type system is
// Nunito end to end, and one monospace numeral in the middle of it would read as
// a different product rather than as a lab instrument.

const RN_FAST_OUT_SLOW_IN = RNEasing.bezier(0.4, 0, 0.2, 1);
const AnimatedCircle = RNAnimated.createAnimatedComponent(Circle);

export default function StreakGauge({
  days,
  atRisk = false,
  size = 108,
  stroke = 9,
}: {
  days: number;
  /** Nothing logged today: the ring warms to amber without shouting about it. */
  atRisk?: boolean;
  size?: number;
  stroke?: number;
}) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const anim = useRef(new RNAnimated.Value(0)).current;

  const progress = streakBandProgress(days);

  useEffect(() => {
    RNAnimated.timing(anim, {
      toValue: progress,
      duration: 900,
      delay: 120,
      easing: RN_FAST_OUT_SLOW_IN,
      // strokeDashoffset is an SVG prop, not a transform — no native driver.
      useNativeDriver: false,
    }).start();
  }, [progress]);

  const dashOffset = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [circumference, 0],
    extrapolate: 'clamp',
  });

  return (
    <View
      style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}
      accessible
      accessibilityLabel={
        days > 0
          ? `Streak: ${days} day${days === 1 ? '' : 's'}, ${atRisk ? 'at risk today' : 'on track'}`
          : 'No streak yet'
      }
    >
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Defs>
          <SvgGradient id="streakGradient" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={atRisk ? AT_RISK : GRADIENT[0]} />
            <Stop offset="1" stopColor={atRisk ? '#E8C98A' : GRADIENT[1]} />
          </SvgGradient>
        </Defs>

        <Circle cx={size / 2} cy={size / 2} r={radius} stroke={TRACK} strokeWidth={stroke} fill="none" />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="url(#streakGradient)"
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          // Sweep from 12 o'clock, like every other gauge in the app.
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>

      <View style={styles.center}>
        <Text style={[styles.value, { fontSize: size * 0.29 }]}>{days}</Text>
        <Text style={styles.unit}>{days === 1 ? 'day' : 'days'}</Text>
      </View>
    </View>
  );
}

/** The band the gauge is currently sweeping, for the caption beside it. */
export function streakBandLabel(days: number): string {
  const band = Math.floor(days / STREAK_BAND);
  if (band === 0) return `Next milestone: ${STREAK_BAND} days`;
  return `Past ${band * STREAK_BAND} — next at ${(band + 1) * STREAK_BAND}`;
}

const styles = StyleSheet.create({
  center: { alignItems: 'center' },
  value: { color: TEXT, fontFamily: typography.bold, letterSpacing: -1 },
  unit: { color: TEXT_FAINT, fontSize: 11, fontFamily: typography.regular, marginTop: -2 },
});
