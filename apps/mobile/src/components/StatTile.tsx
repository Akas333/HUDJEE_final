import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';

interface StatTileProps {
  label: string;
  value: string;
  icon: any;
}

export const StatTile: React.FC<StatTileProps> = ({ label, value, icon }) => {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.label}>{label}</Text>
        <View style={styles.iconContainer}>{icon}</View>
      </View>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.hudjeeSurfaceCard,
    borderRadius: 20,
    padding: 16,
    flex: 1,
    width: '48%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  label: {
    ...typography.hudjee.label,
    color: colors.hudjeeTextSecondary,
    flex: 1,
  },
  iconContainer: {
    marginLeft: 8,
  },
  value: {
    ...typography.hudjee.headingLg,
    color: colors.hudjeeTextPrimary,
  },
});
