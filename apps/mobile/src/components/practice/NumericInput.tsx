import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Delete, Minus } from 'lucide-react-native';

import PressableScale from '../PressableScale';
import { typography } from '../../theme/typography';
import {
  NEGATIVE,
  POSITIVE,
  RADIUS,
  RADIUS_INNER,
  SURFACE,
  SURFACE_BORDER,
  SURFACE_STRONG,
  TEXT,
  TEXT_FAINT,
  TEXT_MUTED,
} from '../../theme/ui';

const ROWS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
];

interface NumericInputProps {
  value: string;
  /** `integer` refuses a decimal point; `numerical` allows one. */
  variant: 'integer' | 'numerical';
  accent: string;
  disabled?: boolean;
  /** Once answered: the key, and whether what was typed matched it. */
  reveal?: { correctAnswer: string; correct: boolean } | null;
  onChange: (next: string) => void;
}

/**
 * Numeric and integer answers are typed on a pad of our own rather than the
 * system keyboard: the OS keyboard covers the lower half of the screen — which
 * is where the question's own diagram usually sits — and on Android its numeric
 * layout still offers characters these answers can never contain.
 */
export default function NumericInput({
  value,
  variant,
  accent,
  disabled = false,
  reveal = null,
  onChange,
}: NumericInputProps) {
  const negative = value.startsWith('-');

  const press = (key: string) => {
    if (disabled) return;
    if (key === '.' && (variant === 'integer' || value.includes('.'))) return;
    // A leading "." is not a number the grader can read; make it "0.".
    if (key === '.' && (value === '' || value === '-')) {
      onChange(`${value}0.`);
      return;
    }
    onChange(value + key);
  };

  const backspace = () => {
    if (disabled) return;
    onChange(value.slice(0, -1));
  };

  const toggleSign = () => {
    if (disabled) return;
    onChange(negative ? value.slice(1) : `-${value}`);
  };

  const displayColor = reveal ? (reveal.correct ? POSITIVE : NEGATIVE) : TEXT;

  return (
    <View style={{ gap: 14 }}>
      <View
        style={[
          styles.display,
          !reveal && value ? { borderColor: `${accent}66` } : null,
          reveal ? { borderColor: `${reveal.correct ? POSITIVE : NEGATIVE}66` } : null,
        ]}
      >
        <Text
          style={[styles.value, { color: value ? displayColor : TEXT_FAINT }]}
          numberOfLines={1}
        >
          {value || (variant === 'integer' ? 'Enter a whole number' : 'Enter your answer')}
        </Text>

        {!disabled && (
          <View style={styles.displayActions}>
            <PressableScale
              onPress={toggleSign}
              scaleTo={0.9}
              accessibilityLabel="Toggle sign"
              style={[styles.chip, negative && { borderColor: `${accent}88`, backgroundColor: `${accent}1F` }]}
            >
              <Minus color={negative ? accent : TEXT_MUTED} size={15} strokeWidth={2.4} />
            </PressableScale>
            <PressableScale
              onPress={backspace}
              scaleTo={0.9}
              accessibilityLabel="Delete last digit"
              style={styles.chip}
            >
              <Delete color={TEXT_MUTED} size={16} strokeWidth={2} />
            </PressableScale>
          </View>
        )}
      </View>

      {/* The key, spelled out, when the typed answer missed it. */}
      {reveal && !reveal.correct ? (
        <Text style={styles.keyLine}>
          Correct answer: <Text style={{ color: POSITIVE }}>{reveal.correctAnswer}</Text>
        </Text>
      ) : null}

      {!disabled && (
        <View style={styles.pad}>
          {ROWS.map((row) => (
            <View key={row.join('')} style={styles.padRow}>
              {row.map((key) => (
                <Key key={key} label={key} onPress={() => press(key)} />
              ))}
            </View>
          ))}
          <View style={styles.padRow}>
            {variant === 'numerical' ? (
              <Key label="." onPress={() => press('.')} />
            ) : (
              <View style={styles.keySpacer} />
            )}
            <Key label="0" onPress={() => press('0')} />
            <View style={styles.keySpacer} />
          </View>
        </View>
      )}
    </View>
  );
}

function Key({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <PressableScale onPress={onPress} scaleTo={0.94} style={styles.key} accessibilityLabel={label}>
      <Text style={styles.keyText}>{label}</Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  display: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 62,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: RADIUS,
    borderWidth: 1,
    borderColor: SURFACE_BORDER,
    backgroundColor: SURFACE,
  },
  value: { flex: 1, fontSize: 24, fontFamily: typography.bold, letterSpacing: -0.5 },
  displayActions: { flexDirection: 'row', gap: 8 },
  chip: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: SURFACE_BORDER,
    backgroundColor: SURFACE_STRONG,
  },
  keyLine: { color: TEXT_MUTED, fontSize: 14, fontFamily: typography.semiBold },

  pad: { gap: 10 },
  padRow: { flexDirection: 'row', gap: 10 },
  key: {
    flex: 1,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADIUS_INNER,
    borderWidth: 1,
    borderColor: SURFACE_BORDER,
    backgroundColor: SURFACE,
  },
  keySpacer: { flex: 1 },
  keyText: { color: TEXT, fontSize: 20, fontFamily: typography.semiBold },
});
