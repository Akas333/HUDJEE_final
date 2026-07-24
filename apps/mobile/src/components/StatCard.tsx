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

export default function StatCard({ title, value, unit, valueColor = colors.primaryLight, bgImage }: StatCardProps) {
  // Split title into two lines if it contains a space for better formatting based on design
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
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 6,
    marginBottom: 12,
    position: 'relative',
    overflow: 'hidden',
  },
  bgImage: {
    position: 'absolute',
    right: -15,
    bottom: -15,
    width: 80,
    height: 80,
    opacity: 0.15, // faint watermark
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 20,
  },
  valueContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  value: {
    fontSize: 48,
    fontWeight: '800',
    fontStyle: 'italic',
    lineHeight: 48,
    includeFontPadding: false,
  },
  unit: {
    color: colors.warning, // typically the hrs unit is yellow in design
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 2,
  }
});
