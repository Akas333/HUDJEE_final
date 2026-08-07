import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import PressableScale from '../PressableScale';
import { typography } from '../../theme/typography';
import {
  RADIUS_INNER,
  SURFACE_BORDER,
  SURFACE_STRONG,
  TEXT,
  TEXT_MUTED,
  TRACK,
} from '../../theme/ui';

/**
 * A settings row where the choice is small and closed — three session lengths,
 * two visibility levels. Laid out as chips under the label rather than as a
 * drill-down, because pushing a whole screen to choose between three numbers
 * costs two taps and a screen transition to save one line of height.
 */
export default function SettingsChoice<T extends string | number>({
  title,
  subtitle,
  options,
  value,
  onChange,
  format,
  accent,
}: {
  title: string;
  subtitle?: string;
  options: readonly T[];
  value: T;
  onChange: (next: T) => void;
  /** Chip label for an option. Defaults to the value itself. */
  format?: (option: T) => string;
  /** Tints the selected chip. Defaults to plain white-on-raised. */
  accent?: string;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.text}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>

      <View style={styles.chips}>
        {options.map((option) => {
          const selected = option === value;
          return (
            <PressableScale
              key={String(option)}
              scaleTo={0.94}
              onPress={() => onChange(option)}
              accessibilityLabel={`${title}: ${format ? format(option) : String(option)}`}
              style={[
                styles.chip,
                selected && styles.chipSelected,
                selected && accent
                  ? { backgroundColor: `${accent}24`, borderColor: `${accent}59` }
                  : null,
              ]}
            >
              <Text
                style={[
                  styles.chipText,
                  selected && styles.chipTextSelected,
                  selected && accent ? { color: accent } : null,
                ]}
              >
                {format ? format(option) : String(option)}
              </Text>
            </PressableScale>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { paddingHorizontal: 16, paddingVertical: 16, gap: 14 },
  text: { gap: 3 },
  title: { color: TEXT, fontSize: 15, fontFamily: typography.medium, letterSpacing: -0.1 },
  subtitle: { color: TEXT_MUTED, fontSize: 12, fontFamily: typography.regular, lineHeight: 17 },

  chips: { flexDirection: 'row', gap: 8 },
  chip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: RADIUS_INNER,
    backgroundColor: TRACK,
    borderWidth: 1,
    borderColor: 'transparent',
    alignItems: 'center',
  },
  chipSelected: { backgroundColor: SURFACE_STRONG, borderColor: SURFACE_BORDER },
  chipText: { color: TEXT_MUTED, fontSize: 13, fontFamily: typography.medium },
  chipTextSelected: { color: TEXT, fontFamily: typography.bold },
});
