import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../../theme/colors';

interface ProgressBarProps {
  progress: number; // 0 to 100
  height?: number;
  showLabel?: boolean;
}

export default function ProgressBar({ progress, height = 8, showLabel = false }: ProgressBarProps) {
  const clampedProgress = Math.min(Math.max(progress, 0), 100);

  return (
    <View style={styles.container}>
      <View style={[styles.track, { height }]}>
        <LinearGradient
          colors={[colors.primaryGradientStart, colors.primaryGradientEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.fill, { width: `${clampedProgress}%` }]}
        />
      </View>
      {showLabel && (
        <Text style={styles.label}>{Math.round(clampedProgress)}%</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  track: {
    width: '100%',
    backgroundColor: colors.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 4,
  },
  label: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 4,
    textAlign: 'right',
  },
});
