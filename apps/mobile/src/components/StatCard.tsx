import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { colors } from '../theme/colors';

interface StatCardProps {
  title: string;
  value: string | number;
  unit?: string;
  valueColor?: string;
  bgImage?: any;
}

export default function StatCard({ title, value, unit, valueColor = colors.primary, bgImage }: StatCardProps) {
  const titleParts = title.split(' ');

  return (
    <View style={styles.card}>
      {bgImage && (
        <Image source={bgImage} style={styles.bgImage} resizeMode="contain" />
      )}
      <View style={styles.titleContainer}>
        {titleParts.map((part, index) => (
          <Text key={index} style={styles.title}>{part}</Text>
        ))}
      </View>
      <View style={styles.valueContainer}>
        <Text style={[styles.value, { color: valueColor }]}>{value}</Text>
        {unit && <Text style={styles.unit}>{unit}</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: colors.border,
    borderBottomWidth: 6,
    borderBottomColor: colors.border,
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 8,
    marginBottom: 16,
    position: 'relative',
    overflow: 'hidden',
  },
  bgImage: {
    position: 'absolute',
    right: -15,
    bottom: -15,
    width: 80,
    height: 80,
    opacity: 0.1, 
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    color: colors.textSecondary,
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 20,
    textTransform: 'uppercase',
  },
  valueContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  value: {
    fontSize: 42,
    fontWeight: '900',
    lineHeight: 48,
    includeFontPadding: false,
  },
  unit: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '800',
    marginLeft: 4,
  }
});
