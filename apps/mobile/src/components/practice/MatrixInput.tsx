import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Check } from 'lucide-react-native';

import PressableScale from '../PressableScale';
import RichContent from './RichContent';
import { typography } from '../../theme/typography';
import {
  GAP,
  NEGATIVE,
  POSITIVE,
  RADIUS,
  RADIUS_INNER,
  SURFACE,
  SURFACE_BORDER,
  TEXT,
  TEXT_FAINT,
  TEXT_MUTED,
} from '../../theme/ui';
import { MatrixSpec } from '../../lib/questionFormat';

const CELL = 46;
const ROW_LABEL = 34;

/** Left ids are A, B, C…; right ids are P, Q, R… — the CMS's own defaults. */
export function leftIdAt(spec: MatrixSpec, index: number): string {
  return spec.left[index]?.id ?? String.fromCharCode(65 + index);
}

export function rightIdAt(spec: MatrixSpec, index: number): string {
  return spec.right[index]?.id ?? String.fromCharCode(80 + index);
}

interface MatrixInputProps {
  spec: MatrixSpec;
  matches: Record<string, string[]>;
  accent: string;
  disabled?: boolean;
  /** Once answered: the key, parsed the same way the draft is held. */
  correct?: Record<string, string[]> | null;
  onToggle: (leftId: string, rightId: string) => void;
}

/**
 * A matrix-match question: List I down the left, List II across the top, and a
 * grid of toggles between them. A row may legitimately match more than one
 * column, so every cell is an independent toggle rather than a radio group.
 */
export default function MatrixInput({
  spec,
  matches,
  accent,
  disabled = false,
  correct = null,
  onToggle,
}: MatrixInputProps) {
  const revealing = correct !== null;

  return (
    <View style={{ gap: 18 }}>
      {/* The lists themselves. The grid below is only ids, which mean nothing
          without the statements they stand for. */}
      <View style={styles.lists}>
        <ListColumn title="List I" items={spec.left.map((o, i) => ({ id: leftIdAt(spec, i), option: o }))} />
        <ListColumn title="List II" items={spec.right.map((o, i) => ({ id: rightIdAt(spec, i), option: o }))} />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.gridPad}>
        <View>
          <View style={styles.gridRow}>
            <View style={{ width: ROW_LABEL }} />
            {spec.right.map((_, c) => (
              <Text key={c} style={styles.headCell}>
                {rightIdAt(spec, c)}
              </Text>
            ))}
          </View>

          {spec.left.map((_, r) => {
            const leftId = leftIdAt(spec, r);
            return (
              <View key={leftId} style={styles.gridRow}>
                <Text style={styles.rowLabel}>{leftId}</Text>

                {spec.right.map((_unused, c) => {
                  const rightId = rightIdAt(spec, c);
                  const picked = (matches[leftId] ?? []).includes(rightId);
                  const expected = revealing && (correct![leftId] ?? []).includes(rightId);
                  const wrongPick = revealing && picked && !expected;

                  return (
                    <PressableScale
                      key={rightId}
                      onPress={() => onToggle(leftId, rightId)}
                      disabled={disabled}
                      scaleTo={0.9}
                      accessibilityRole="checkbox"
                      accessibilityLabel={`Match ${leftId} to ${rightId}`}
                      style={[
                        styles.cell,
                        picked && !revealing && { borderColor: accent, backgroundColor: `${accent}26` },
                        expected && { borderColor: POSITIVE, backgroundColor: 'rgba(63,232,166,0.16)' },
                        wrongPick && { borderColor: NEGATIVE, backgroundColor: 'rgba(248,113,113,0.16)' },
                      ]}
                    >
                      {picked || expected ? (
                        <Check
                          color={revealing ? (expected ? POSITIVE : NEGATIVE) : accent}
                          size={16}
                          strokeWidth={2.8}
                        />
                      ) : null}
                    </PressableScale>
                  );
                })}
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

function ListColumn({
  title,
  items,
}: {
  title: string;
  items: { id: string; option: { text: string; imageUrl: string | null } }[];
}) {
  return (
    <View style={styles.listColumn}>
      <Text style={styles.listTitle}>{title}</Text>
      {items.map(({ id, option }) => (
        <View key={id} style={styles.listRow}>
          <Text style={styles.listId}>{id}</Text>
          <View style={{ flex: 1, gap: 6 }}>
            <RichContent content={option.text} textStyle={styles.listText} />
            {option.imageUrl ? (
              <RichContent blocks={[{ kind: 'image', url: option.imageUrl, alt: 'List item image' }]} />
            ) : null}
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  lists: { gap: GAP },
  listColumn: {
    gap: 10,
    padding: 14,
    borderRadius: RADIUS,
    borderWidth: 1,
    borderColor: SURFACE_BORDER,
    backgroundColor: SURFACE,
  },
  listTitle: { color: TEXT_FAINT, fontSize: 10, fontFamily: typography.bold, letterSpacing: 1 },
  listRow: { flexDirection: 'row', gap: 10 },
  listId: { color: TEXT, fontSize: 13, fontFamily: typography.bold, width: 18, lineHeight: 21 },
  listText: { color: TEXT_MUTED, fontSize: 14, lineHeight: 21 },

  gridPad: { paddingVertical: 2 },
  gridRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  headCell: {
    width: CELL,
    textAlign: 'center',
    color: TEXT_FAINT,
    fontSize: 12,
    fontFamily: typography.bold,
  },
  rowLabel: { width: ROW_LABEL, color: TEXT, fontSize: 13, fontFamily: typography.bold },
  cell: {
    width: CELL,
    height: CELL,
    borderRadius: RADIUS_INNER,
    borderWidth: 1,
    borderColor: SURFACE_BORDER,
    backgroundColor: SURFACE,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
