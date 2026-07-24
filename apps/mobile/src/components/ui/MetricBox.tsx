import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';

interface MetricBoxProps {
  title: string;
  value: string | number;
  unit?: string;
  children?: React.ReactNode; // For custom graphics like the target or clipboard
  width?: string | number;
}

export default function MetricBox({ title, value, unit, children, width = '48%' }: MetricBoxProps) {
  return (
    <View style={[styles.container, { width }]}>
      <Text style={styles.title}>{title}</Text>
      
      <View style={styles.valueContainer}>
        <Text style={styles.value}>{value}</Text>
        {unit && <Text style={styles.unit}>{unit}</Text>}
      </View>
      
      {/* Absolute positioned background graphic if provided */}
      {children && (
        <View style={styles.graphicContainer}>
          {children}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    height: 110,
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  title: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    zIndex: 2,
    flexWrap: 'wrap',
    maxWidth: '80%',
  },
  valueContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    zIndex: 2,
  },
  value: {
    color: colors.primaryGradientStart,
    fontSize: 42,
    fontWeight: 'bold',
    lineHeight: 48,
  },
  unit: {
    color: colors.primaryGradientStart,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    marginLeft: 4,
  },
  graphicContainer: {
    position: 'absolute',
    right: -10,
    bottom: -10,
    zIndex: 1,
    opacity: 0.5, // Subtle background appearance
  },
});
