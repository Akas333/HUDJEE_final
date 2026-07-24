import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { colors } from '../theme/colors';
// We will install expo-linear-gradient
import { LinearGradient } from 'expo-linear-gradient';

interface ProgressBarProps {
  progress: number; // 0 to 100
  label?: string;
  showText?: boolean;
  gradientColors?: string[];
  textFormat?: string; // allow overriding text format (e.g. "17%" vs "17/100")
  textColor?: string;
}

export default function ProgressBar({ progress, label, showText = true, gradientColors = ['#7C3AED', '#F59E0B'], textFormat, textColor }: ProgressBarProps) {
  const safeProgress = Math.min(Math.max(progress, 0), 100);
  
  return (
    <View style={styles.container}>
      {showText && (
        <View style={styles.labelContainer}>
          <Text style={styles.label}>{label}</Text>
          <Text style={[styles.progressText, textColor ? { color: textColor } : {}]}>
            {textFormat ? textFormat : `${safeProgress}/100`}
          </Text>
        </View>
      )}
      <View style={styles.track}>
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.fill, { width: `${safeProgress}%` }]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginVertical: 8,
  },
  labelContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 4,
  },
  label: {
    display: 'none', // hide by default if we just want the number on the right
  },
  progressText: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: '600',
  },
  track: {
    height: 8,
    backgroundColor: '#333',
    borderRadius: 4,
    overflow: 'hidden',
    width: '100%',
  },
  fill: {
    height: '100%',
    borderRadius: 4,
  }
});
