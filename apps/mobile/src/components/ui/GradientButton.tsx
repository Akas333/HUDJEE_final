import React from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import PressableScale from '../PressableScale';
import { typography } from '../../theme/typography';
import { ACCENT_GRADIENT } from '../../theme/ui';

/** The border is the whole effect, so it has to survive rounding on every dpr. */
const BORDER = 1.5;

/** Matches the near-black the app sits on, so the fill reads as a cut-out. */
const FILL = '#0A0A0C';

/**
 * The app's primary action: a near-black pill outlined in the accent ramp.
 *
 * It replaces the solid white button the two primary CTAs used to be. White
 * worked when it was the only bright thing on screen, but it is a slab of light
 * in a flat dark system, and it reads as a different product's button. This
 * gives the same emphasis with none of the surface area — the colour lives in a
 * hairline, and the button itself stays the same value as the page.
 *
 * Laid out as a gradient view with `padding: BORDER` around an opaque inner
 * view, rather than a real border: React Native cannot draw a gradient into
 * `borderColor`, and an inner radius one border-width smaller keeps the two
 * curves concentric instead of leaving a bright wedge at each corner.
 */
export default function GradientButton({
  label,
  icon,
  onPress,
  height = 46,
  radius = 14,
  /** Fills the row it is in. Off by default: a CTA sized to its label reads as
   *  one action, and a full-width bar reads as a section. */
  block = false,
  style,
  accessibilityLabel,
  accessibilityHint,
}: {
  label: string;
  /** Trailing glyph. Tint it `#FFFFFF` — the label is white on this button. */
  icon?: React.ReactNode;
  onPress: () => void;
  height?: number;
  radius?: number;
  block?: boolean;
  style?: ViewStyle | ViewStyle[];
  accessibilityLabel?: string;
  accessibilityHint?: string;
}) {
  return (
    <PressableScale
      onPress={onPress}
      scaleTo={0.97}
      style={[block ? styles.block : styles.hug, style]}
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={accessibilityHint}
    >
      <LinearGradient
        colors={ACCENT_GRADIENT}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[styles.border, { borderRadius: radius }]}
      >
        <View
          style={[
            styles.inner,
            { height, borderRadius: radius - BORDER, paddingHorizontal: 22 },
          ]}
        >
          <Text style={styles.label} numberOfLines={1}>
            {label}
          </Text>
          {icon}
        </View>
      </LinearGradient>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  hug: { alignSelf: 'flex-start' },
  block: { alignSelf: 'stretch' },
  border: { padding: BORDER },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: FILL,
  },
  label: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: typography.bold,
    letterSpacing: -0.2,
  },
});
