import React from 'react';
import { View, StyleSheet, Text, ViewStyle } from 'react-native';
import { colors } from '../theme/colors';
import { LinearGradient } from 'expo-linear-gradient';

interface ProgressBarProps {
  progress: number; // 0 to 100
  label?: string;
  showText?: boolean;
  gradientColors?: readonly [string, string, ...string[]];
  textFormat?: string;
  textColor?: string;
  style?: ViewStyle;
}

export default function ProgressBar({ 
  progress, 
  label, 
  showText = true, 
  gradientColors = [colors.primaryGradientStart, colors.primaryGradientEnd], 
  textFormat, 
  textColor,
  style
}: ProgressBarProps) {
  const safeProgress = Math.min(Math.max(progress, 0), 100);
  
  return (
    <View style={[styles.container, style]}>
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
        {/* 3D highlight strip */}
        <View style={[styles.highlight, { width: `${safeProgress}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginVertical: 12,
  },
  labelContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 8,
  },
  label: {
    display: 'none',
  },
  progressText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '800',
  },
  track: {
    height: 16,
    backgroundColor: '#1F2937', // dark background for track
    borderRadius: 8,
    overflow: 'hidden',
    width: '100%',
  },
  fill: {
    height: '100%',
    borderRadius: 8,
  },
  highlight: {
    position: 'absolute',
    top: 2,
    left: 8,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 4,
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
  }
});
