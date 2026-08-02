import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';

interface SettingsRowProps {
  title: string;
  subtitle?: string;
  onPress?: () => void;
  rightElement?: React.ReactNode;
  icon?: React.ReactNode;
  iconColor?: string;
  textColor?: string;
}

export function SettingsRow({ title, subtitle, onPress, rightElement, icon, iconColor, textColor }: SettingsRowProps) {
  const content = (
    <View style={styles.container}>
      {icon && (
        <View style={styles.iconContainer}>
          {icon}
        </View>
      )}
      <View style={styles.textContainer}>
        <Text style={[styles.title, textColor ? { color: textColor } : undefined]}>{title}</Text>
        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>
      <View style={styles.rightContainer}>
        {rightElement ? (
          rightElement
        ) : onPress ? (
          <ChevronRight color={colors.textSecondary} size={20} />
        ) : null}
      </View>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={styles.touchable}>
        {content}
      </TouchableOpacity>
    );
  }

  return <View style={styles.touchable}>{content}</View>;
}

const styles = StyleSheet.create({
  touchable: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    minHeight: 64,
  },
  iconContainer: {
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    ...typography.hudjee.body,
    color: colors.text,
  },
  subtitle: {
    ...typography.hudjee.caption,
    color: colors.textSecondary,
    marginTop: 4,
  },
  rightContainer: {
    marginLeft: 16,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
});
