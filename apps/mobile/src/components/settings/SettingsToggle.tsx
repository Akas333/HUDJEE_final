import React from 'react';
import { Switch } from 'react-native';

import SettingsRow from './SettingsRow';
import { HapticService } from '../../services/HapticService';
import { POSITIVE, SURFACE_STRONG, TEXT } from '../../theme/ui';

/**
 * A settings row whose control is a switch.
 *
 * The whole row is the target, not just the switch — a 34pt control at the far
 * right of a phone is a thumb-stretch for a decision this cheap. The switch is
 * still directly operable for anyone who reaches for it.
 */
export default function SettingsToggle({
  icon,
  accent,
  title,
  subtitle,
  value,
  onValueChange,
}: {
  icon?: any;
  accent?: string;
  title: string;
  subtitle?: string;
  value: boolean;
  onValueChange: (next: boolean) => void;
}) {
  // Tapping the row goes through PressableScale, which already fires the tick;
  // tapping the switch itself does not, so that path fires its own. Routing both
  // through one handler would double it on the row.
  return (
    <SettingsRow
      icon={icon}
      accent={accent}
      title={title}
      subtitle={subtitle}
      onPress={() => onValueChange(!value)}
      right={
        <Switch
          value={value}
          onValueChange={(next) => {
            HapticService.light();
            onValueChange(next);
          }}
          trackColor={{ false: SURFACE_STRONG, true: POSITIVE }}
          thumbColor={TEXT}
          ios_backgroundColor={SURFACE_STRONG}
        />
      }
    />
  );
}
