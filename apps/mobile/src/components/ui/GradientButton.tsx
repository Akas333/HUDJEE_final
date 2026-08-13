import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import PressableScale from '../PressableScale';
import { typography } from '../../theme/typography';
import { ACCENT_GRADIENT, SURFACE_BORDER, TEXT_FAINT } from '../../theme/ui';

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
  disabled = false,
  loading = false,
  /** Which side of the label the glyph sits on. Trailing by default: a "→" that
   *  leads the label points back at the screen you are already on. */
  iconSide = 'trailing',
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
  disabled?: boolean;
  loading?: boolean;
  iconSide?: 'leading' | 'trailing';
  style?: ViewStyle | ViewStyle[];
  accessibilityLabel?: string;
  accessibilityHint?: string;
}) {
  const frame = { borderRadius: radius };
  const inner = [
    styles.inner,
    { height, borderRadius: radius - BORDER, paddingHorizontal: 22 },
  ];
  const content = (
    <View style={inner}>
      {loading ? (
        // Sized to the label's line height so the button does not resize the
        // moment it starts working.
        <ActivityIndicator color="#FFFFFF" size="small" />
      ) : (
        <>
          {iconSide === 'leading' ? icon : null}
          <Text style={[styles.label, disabled && styles.labelDisabled]} numberOfLines={1}>
            {label}
          </Text>
          {iconSide === 'trailing' ? icon : null}
        </>
      )}
    </View>
  );

  return (
    <PressableScale
      onPress={onPress}
      scaleTo={0.97}
      disabled={disabled || loading}
      style={[block ? styles.block : styles.hug, style]}
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={accessibilityHint}
    >
      {/* Disabled drops the ramp for a plain border rather than fading the whole
          button: a dimmed gradient still reads as the accent, so a button you
          cannot press goes on looking like the one thing you should. */}
      {disabled ? (
        <View style={[styles.border, styles.borderDisabled, frame]}>{content}</View>
      ) : (
        <LinearGradient
          colors={ACCENT_GRADIENT}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.border, frame]}
        >
          {content}
        </LinearGradient>
      )}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  hug: { alignSelf: 'flex-start' },
  block: { alignSelf: 'stretch' },
  border: { padding: BORDER },
  borderDisabled: { backgroundColor: SURFACE_BORDER },
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
  labelDisabled: { color: TEXT_FAINT },
});
