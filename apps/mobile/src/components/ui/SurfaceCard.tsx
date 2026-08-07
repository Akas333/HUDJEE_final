import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';

import PressableScale from '../PressableScale';
import { RADIUS, SURFACE, SURFACE_BORDER } from '../../theme/ui';

/**
 * The raised dark card the whole app is built out of. Given an `onPress` it
 * becomes a control — the same dip-and-spring every other tappable surface uses,
 * so a card never has to choose between looking right and behaving right.
 */
export default function SurfaceCard({
  children,
  onPress,
  style,
  padding = 20,
  accessibilityLabel,
}: {
  children: React.ReactNode;
  onPress?: () => void;
  style?: ViewStyle | ViewStyle[];
  padding?: number;
  accessibilityLabel?: string;
}) {
  const cardStyle = [styles.card, { padding }, style];

  if (onPress) {
    return (
      <PressableScale
        onPress={onPress}
        scaleTo={0.97}
        style={cardStyle}
        accessibilityLabel={accessibilityLabel}
      >
        {children}
      </PressableScale>
    );
  }

  return <View style={cardStyle}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: SURFACE,
    borderRadius: RADIUS,
    borderWidth: 1,
    borderColor: SURFACE_BORDER,
  },
});
