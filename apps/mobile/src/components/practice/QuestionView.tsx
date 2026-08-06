import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import RichContent from './RichContent';
import OptionList from './OptionList';
import NumericInput from './NumericInput';
import MatrixInput from './MatrixInput';
import { typography } from '../../theme/typography';
import { RADIUS, SURFACE, SURFACE_BORDER, TEXT, TEXT_FAINT, TEXT_MUTED } from '../../theme/ui';
import {
  AnswerDraft,
  FORMAT_HINTS,
  FORMAT_LABELS,
  NormalizedQuestion,
  parseMatrixKey,
  resolveCorrectIndices,
} from '../../lib/questionFormat';

interface QuestionViewProps {
  question: NormalizedQuestion;
  draft: AnswerDraft;
  accent: string;
  /** Set once the answer is in: the inputs stop taking edits and start showing the key. */
  reveal: { correctAnswer: string; correct: boolean } | null;
  onDraftChange: (draft: AnswerDraft) => void;
}

/**
 * One question, whatever its format — the seven the CMS can author all come
 * through here, so a screen that shows a question never has to know which kind
 * it is holding. The body renders the same way for all of them; only the answer
 * surface below it changes.
 */
export default function QuestionView({
  question,
  draft,
  accent,
  reveal,
  onDraftChange,
}: QuestionViewProps) {
  const locked = reveal !== null;
  const statements = useMemo(
    () => (question.format === 'assertion_reason' ? splitAssertionReason(question.body) : null),
    [question.format, question.body]
  );

  const select = (index: number) => {
    if (locked) return;
    if (draft.kind === 'single') {
      onDraftChange({ kind: 'single', index });
    } else if (draft.kind === 'multi') {
      const has = draft.indices.includes(index);
      onDraftChange({
        kind: 'multi',
        indices: has
          ? draft.indices.filter((i) => i !== index)
          : [...draft.indices, index].sort((a, b) => a - b),
      });
    }
  };

  const toggleMatch = (leftId: string, rightId: string) => {
    if (locked || draft.kind !== 'matrix') return;
    const current = draft.matches[leftId] ?? [];
    const next = current.includes(rightId)
      ? current.filter((r) => r !== rightId)
      : [...current, rightId];
    onDraftChange({ kind: 'matrix', matches: { ...draft.matches, [leftId]: next } });
  };

  return (
    <View style={{ gap: 20 }}>
      <View style={styles.formatRow}>
        <View style={[styles.formatChip, { borderColor: `${accent}55`, backgroundColor: `${accent}14` }]}>
          <Text style={[styles.formatLabel, { color: accent }]}>
            {FORMAT_LABELS[question.format].toUpperCase()}
          </Text>
        </View>
        <Text style={styles.formatHint}>{FORMAT_HINTS[question.format]}</Text>
      </View>

      {/* Passage-based questions carry the passage inside the body, so it gets a
          surface of its own — a wall of text at prompt weight is unreadable. */}
      {question.format === 'passage' ? (
        <View style={styles.passage}>
          <RichContent content={question.body} textStyle={styles.passageText} />
        </View>
      ) : statements ? (
        <View style={{ gap: 10 }}>
          <StatementCard label="ASSERTION" content={statements.assertion} />
          <StatementCard label="REASON" content={statements.reason} />
        </View>
      ) : (
        <RichContent content={question.body} />
      )}

      {renderAnswerSurface()}
    </View>
  );

  function renderAnswerSurface() {
    switch (draft.kind) {
      case 'single':
      case 'multi':
        return (
          <OptionList
            options={question.options}
            mode={draft.kind}
            selected={draft.kind === 'single' ? (draft.index === null ? [] : [draft.index]) : draft.indices}
            accent={accent}
            disabled={locked}
            correct={reveal ? resolveCorrectIndices(question.options, reveal.correctAnswer) : null}
            onToggle={select}
          />
        );

      case 'numeric':
        return (
          <NumericInput
            value={draft.text}
            variant={question.format === 'integer' ? 'integer' : 'numerical'}
            accent={accent}
            disabled={locked}
            reveal={reveal}
            onChange={(text) => onDraftChange({ kind: 'numeric', text })}
          />
        );

      case 'matrix':
        return question.matrix ? (
          <MatrixInput
            spec={question.matrix}
            matches={draft.matches}
            accent={accent}
            disabled={locked}
            correct={reveal ? parseMatrixKey(reveal.correctAnswer) : null}
            onToggle={toggleMatch}
          />
        ) : null;
    }
  }
}

function StatementCard({ label, content }: { label: string; content: string }) {
  return (
    <View style={styles.statement}>
      <Text style={styles.statementLabel}>{label}</Text>
      <RichContent content={content} textStyle={styles.statementText} />
    </View>
  );
}

/**
 * Assertion-reason bodies are authored as one string with the two statements
 * labelled inside it. When both labels are there the statements get a card
 * each; when they are not, the caller falls back to the plain body rather than
 * guessing where one statement ends.
 */
function splitAssertionReason(body: string): { assertion: string; reason: string } | null {
  const match = /^([\s\S]*?)\b(?:reason|statement\s*(?:ii|2))\s*[:\-–]\s*([\s\S]*)$/i.exec(body);
  if (!match) return null;

  const head = match[1].replace(/\b(?:assertion|statement\s*(?:i|1))\s*[:\-–]\s*/i, '').trim();
  const reason = match[2].trim();
  if (!head || !reason) return null;
  return { assertion: head, reason };
}

const styles = StyleSheet.create({
  formatRow: { gap: 8 },
  formatChip: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
  },
  formatLabel: { fontSize: 9, fontFamily: typography.bold, letterSpacing: 1 },
  formatHint: { color: TEXT_FAINT, fontSize: 12, fontFamily: typography.regular },

  passage: {
    padding: 16,
    borderRadius: RADIUS,
    borderWidth: 1,
    borderColor: SURFACE_BORDER,
    backgroundColor: SURFACE,
  },
  passageText: { color: TEXT_MUTED, fontSize: 15, lineHeight: 24 },

  statement: {
    gap: 8,
    padding: 16,
    borderRadius: RADIUS,
    borderWidth: 1,
    borderColor: SURFACE_BORDER,
    backgroundColor: SURFACE,
  },
  statementLabel: { color: TEXT_FAINT, fontSize: 9, fontFamily: typography.bold, letterSpacing: 1.2 },
  statementText: { color: TEXT, fontSize: 15, lineHeight: 23 },
});
