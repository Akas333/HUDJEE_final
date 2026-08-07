import React, { useEffect } from 'react';
import { Dimensions, Image, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import SubjectBackdrop from '../../components/SubjectBackdrop';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { DEFAULT_TINT } from '../../theme/subjects';
import { TEXT_MUTED } from '../../theme/ui';

const { width } = Dimensions.get('window');
const FAST_OUT_SLOW_IN = Easing.bezier(0.4, 0, 0.2, 1);

/** How long the mark holds before the sign-in screen replaces it. */
const HOLD_MS = 2200;

/**
 * The splash. It drew its own three-stop gradient with the brand indigo hard
 * coded, which meant the first thing the app ever showed was a near-match for
 * the wash behind every screen after it rather than the wash itself — and it
 * animated on the JS driver while the rest of the app runs on Reanimated.
 */
export default function OnboardingScreen({ navigation }: any) {
  const mark = useSharedValue(0);
  // Its own value rather than a delayed read of `mark`: a delay applied inside
  // an animated style re-runs on every frame of the value it reads.
  const tagline = useSharedValue(0);

  useEffect(() => {
    mark.value = withTiming(1, { duration: 900, easing: FAST_OUT_SLOW_IN });
    tagline.value = withDelay(320, withTiming(1, { duration: 600, easing: FAST_OUT_SLOW_IN }));

    const timer = setTimeout(() => navigation.replace('AuthScreen'), HOLD_MS);
    return () => clearTimeout(timer);
  }, [navigation, mark, tagline]);

  const markStyle = useAnimatedStyle(() => ({
    opacity: mark.value,
    transform: [{ scale: 0.92 + mark.value * 0.08 }],
  }));

  const taglineStyle = useAnimatedStyle(() => ({ opacity: tagline.value }));

  return (
    <View style={styles.root}>
      <SubjectBackdrop color={DEFAULT_TINT} />

      <View style={styles.centre}>
        <Animated.View style={markStyle}>
          <Image
            source={require('../../../assets/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </Animated.View>

        <Animated.Text style={[styles.tagline, taglineStyle]}>
          Adaptive JEE practice
        </Animated.Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.hudjeeBgBase },
  centre: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  logo: { width: width * 0.58, height: 96, tintColor: colors.hudjeeTextPrimary },
  tagline: {
    color: TEXT_MUTED,
    fontSize: 14,
    fontFamily: typography.regular,
    letterSpacing: 0.2,
    marginTop: 14,
  },
});
