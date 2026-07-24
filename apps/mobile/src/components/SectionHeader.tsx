import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors } from '../theme/colors';

interface SectionHeaderProps {
  title: string;
  actionText?: string;
  onActionPress?: () => void;
  actionColor?: string;
}

export default function SectionHeader({ title, actionText, onActionPress, actionColor }: SectionHeaderProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      {actionText && (
        <TouchableOpacity onPress={onActionPress}>
          <Text style={[styles.actionText, actionColor ? { color: actionColor } : {}]}>{actionText}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 16,
    marginTop: 8,
  },
  title: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '600',
  },
  actionText: {
    color: colors.primaryLight,
    fontSize: 12,
    fontWeight: '600',
  }
});
