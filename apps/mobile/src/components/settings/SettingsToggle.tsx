import React from 'react';
import { Switch } from 'react-native';
import { SettingsRow } from './SettingsRow';
import { colors } from '../../theme/colors';

interface SettingsToggleProps {
  title: string;
  subtitle?: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
}

export function SettingsToggle({ title, subtitle, value, onValueChange }: SettingsToggleProps) {
  return (
    <SettingsRow
      title={title}
      subtitle={subtitle}
      onPress={() => onValueChange(!value)}
      rightElement={
        <Switch
          value={value}
          onValueChange={onValueChange}
          trackColor={{ false: colors.border, true: colors.chalkboardGreen }}
          thumbColor={colors.text}
          ios_backgroundColor={colors.border}
        />
      }
    />
  );
}
