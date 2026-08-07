import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';

import { typography } from '../../theme/typography';
import {
  GRADIENT,
  RADIUS_INNER,
  SURFACE_BORDER,
  TEXT,
  TEXT_FAINT,
  TEXT_MUTED,
  TRACK,
} from '../../theme/ui';

/**
 * An editable field inside a `SettingsGroup`.
 *
 * The label sits above the value rather than beside it, so a long value gets the
 * full width instead of eliding at forty percent of it. Focus lights the border
 * in the brand's first gradient stop — the only place a settings screen uses
 * colour to say something is live.
 */
export default function SettingsInput({
  label,
  value,
  onChangeText,
  placeholder,
  hint,
  editable = true,
  ...rest
}: {
  label: string;
  value: string;
  onChangeText: (next: string) => void;
  placeholder?: string;
  /** Sits under the field — a format rule, a reason it is locked. */
  hint?: string;
  editable?: boolean;
} & Omit<TextInputProps, 'value' | 'onChangeText' | 'placeholder' | 'editable' | 'style'>) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label.toUpperCase()}</Text>

      <TextInput
        style={[
          styles.input,
          focused && styles.inputFocused,
          !editable && styles.inputLocked,
        ]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={TEXT_FAINT}
        editable={editable}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        autoCapitalize="none"
        autoCorrect={false}
        {...rest}
      />

      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { paddingHorizontal: 16, paddingVertical: 16, gap: 8 },
  label: {
    color: TEXT_FAINT,
    fontSize: 10,
    fontFamily: typography.bold,
    letterSpacing: 1.2,
  },
  input: {
    backgroundColor: TRACK,
    borderWidth: 1,
    borderColor: SURFACE_BORDER,
    borderRadius: RADIUS_INNER,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: TEXT,
    fontSize: 15,
    fontFamily: typography.medium,
  },
  inputFocused: { borderColor: GRADIENT[0] },
  inputLocked: { color: TEXT_MUTED },
  hint: { color: TEXT_MUTED, fontSize: 12, fontFamily: typography.regular, lineHeight: 17 },
});
