import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Check, X } from 'lucide-react-native';

import PressableScale from '../PressableScale';
import RichContent from './RichContent';
import { typography } from '../../theme/typography';
import {
  GAP,
  NEGATIVE,
  POSITIVE,
  RADIUS,
  SURFACE,
  SURFACE_BORDER,
  TEXT_FAINT,
  TEXT_MUTED,
} from '../../theme/ui';
import { NormalizedOption } from '../../lib/questionFormat';

interface OptionListProps {
  options: NormalizedOption[];
  /** `multi` draws checkboxes and keeps every pick; `single` replaces the pick. */
  mode: 'single' | 'multi';
  selected: number[];
  accent: string;
  disabled?: boolean;
  /** Once answered, which options the key names — drawn whether picked or not. */
  correct?: number[] | null;
  onToggle: (index: number) => void;
}

export default function OptionList({
  options,
  mode,
  selected,
  accent,
  disabled = false,
  correct = null,
  onToggle,
}: OptionListProps) {
  const revealing = correct !== null;

  return (
    <View style={{ gap: GAP }}>
      {options.map((option, index) => {
        const isSelected = selected.includes(index);
        const isCorrect = revealing && correct!.includes(index);
        const isWrongPick = revealing && isSelected && !isCorrect;

        return (
          <PressableScale
            key={option.id ?? index}
            onPress={() => onToggle(index)}
            disabled={disabled}
            scaleTo={0.985}
            accessibilityRole={mode === 'multi' ? 'checkbox' : 'radio'}
            accessibilityLabel={`Option ${String.fromCharCode(65 + index)}. ${option.text}`}
            style={[
              styles.option,
              isSelected && !revealing && { borderColor: `${accent}88`, backgroundColor: `${accent}18` },
              isCorrect && { borderColor: `${POSITIVE}99`, backgroundColor: 'rgba(63,232,166,0.10)' },
              isWrongPick && { borderColor: `${NEGATIVE}99`, backgroundColor: 'rgba(248,113,113,0.10)' },
            ]}
          >
            <View
              style={[
                styles.marker,
                mode === 'multi' ? styles.markerBox : styles.markerDisc,
                isSelected && !revealing && { borderColor: accent, backgroundColor: `${accent}2E` },
                isCorrect && { borderColor: POSITIVE, backgroundColor: 'rgba(63,232,166,0.18)' },
                isWrongPick && { borderColor: NEGATIVE, backgroundColor: 'rgba(248,113,113,0.18)' },
              ]}
            >
              <Text
                style={[
                  styles.markerText,
                  isSelected && !revealing && { color: accent },
                  isCorrect && { color: POSITIVE },
                  isWrongPick && { color: NEGATIVE },
                ]}
              >
                {String.fromCharCode(65 + index)}
              </Text>
            </View>

            <View style={styles.body}>
              <RichContent content={option.text} textStyle={styles.optionText} />
              {option.imageUrl ? <RichContent blocks={[{ kind: 'image', url: option.imageUrl, alt: 'Option image' }]} /> : null}
            </View>

            {isCorrect ? <Check color={POSITIVE} size={17} strokeWidth={2.6} /> : null}
            {isWrongPick ? <X color={NEGATIVE} size={17} strokeWidth={2.6} /> : null}
          </PressableScale>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: SURFACE,
    borderRadius: RADIUS,
    borderWidth: 1,
    borderColor: SURFACE_BORDER,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  body: { flex: 1, gap: 8 },
  optionText: { color: TEXT_MUTED, fontSize: 15, lineHeight: 22 },

  marker: {
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: SURFACE_BORDER,
  },
  /** A disc reads as "one of these"; a box reads as "as many as you like". */
  markerDisc: { borderRadius: 13 },
  markerBox: { borderRadius: 8 },
  markerText: { color: TEXT_FAINT, fontSize: 12, fontFamily: typography.bold },
});
