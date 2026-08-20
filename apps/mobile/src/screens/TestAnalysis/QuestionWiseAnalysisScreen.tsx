import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { Check, Minus, X } from 'lucide-react-native';

import AnalysisFrame from '../../components/analysis/AnalysisFrame';
import PressableScale from '../../components/PressableScale';
import SectionHeader from '../../components/ui/SectionHeader';
import SurfaceCard from '../../components/ui/SurfaceCard';
import { shortDuration } from '../../components/analysis/format';
import {
  AnalysedQuestion,
  BAND_LABEL,
  QUALITY_LABEL,
  SessionAnalysis,
} from '../../services/analysisApi';
import { typography } from '../../theme/typography';
import {
  CAUTION,
  DIVIDER,
  GAP,
  NEGATIVE,
  ON_LIGHT,
  POSITIVE,
  RADIUS_INNER,
  SECTION_GAP,
  SURFACE,
  SURFACE_BORDER,
  SURFACE_SUBTLE,
  TEXT,
  TEXT_FAINT,
  TEXT_MUTED,
  enter,
} from '../../theme/ui';

/**
 * Every question, in order, with what it cost.
 *
 * The web version of this is a nine-column table. On a phone that is a
 * horizontal scroll nobody performs, so it is a grid you can scan at a glance
 * and a list of rows you can read — the same nine facts, arranged for a thumb.
 */

type Filter = 'all' | 'correct' | 'wrong' | 'skipped' | 'overtime';

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'correct', label: 'Correct' },
  { key: 'wrong', label: 'Wrong' },
  { key: 'skipped', label: 'Skipped' },
  { key: 'overtime', label: 'Over time' },
];

export default function QuestionWiseAnalysisScreen({ route }: any) {
  const { sessionId, title } = route.params || {};
  const [filter, setFilter] = useState<Filter>('all');

  return (
    <AnalysisFrame
      sessionId={sessionId}
      title="Question by question"
      eyebrow={title || 'Analysis'}
      subtitle="Every question you were served, in the order you met them."
    >
      {(a: SessionAnalysis) => <Body analysis={a} filter={filter} setFilter={setFilter} />}
    </AnalysisFrame>
  );
}

function Body({
  analysis,
  filter,
  setFilter,
}: {
  analysis: SessionAnalysis;
  filter: Filter;
  setFilter: (f: Filter) => void;
}) {
  const rows = useMemo(() => {
    const all = analysis.questions;
    if (filter === 'all') return all;
    if (filter === 'overtime') return all.filter((q) => q.timeMs > q.idealMs);
    return all.filter((q) => q.verdict === filter);
  }, [analysis.questions, filter]);

  const countFor = (key: Filter) => {
    if (key === 'all') return analysis.questions.length;
    if (key === 'overtime') return analysis.questions.filter((q) => q.timeMs > q.idealMs).length;
    return analysis.questions.filter((q) => q.verdict === key).length;
  };

  return (
    <>
      <Animated.View entering={enter(2)}>
        <SurfaceCard padding={16}>
          <View style={styles.grid}>
            {analysis.questions.map((q) => (
              <Chip key={q.questionId} question={q} />
            ))}
          </View>
        </SurfaceCard>
      </Animated.View>

      <View style={styles.section}>
        <SectionHeader title="Complete breakdown" meta={`${rows.length} shown`} />

        <Animated.View entering={enter(3)} style={styles.filters}>
          {FILTERS.map((f) => {
            const active = filter === f.key;
            const count = countFor(f.key);
            if (count === 0 && f.key !== 'all') return null;
            return (
              <PressableScale
                key={f.key}
                scaleTo={0.95}
                onPress={() => setFilter(f.key)}
                style={[styles.filter, active ? styles.filterActive : null]}
              >
                <Text style={[styles.filterText, active ? styles.filterTextActive : null]}>
                  {f.label} {count}
                </Text>
              </PressableScale>
            );
          })}
        </Animated.View>

        <Animated.View entering={enter(4)} style={styles.list}>
          {rows.map((q, i) => (
            <Row key={q.questionId} question={q} last={i === rows.length - 1} />
          ))}
        </Animated.View>
      </View>
    </>
  );
}

function Chip({ question }: { question: AnalysedQuestion }) {
  const correct = question.verdict === 'correct';
  const wrong = question.verdict === 'wrong';
  const Icon = correct ? Check : wrong ? X : Minus;
  const color = correct ? POSITIVE : wrong ? NEGATIVE : TEXT_FAINT;

  return (
    <View style={styles.chip}>
      <Text style={styles.chipNumber}>{question.position}</Text>
      <Icon color={color} size={12} strokeWidth={2.5} />
    </View>
  );
}

function Row({ question, last }: { question: AnalysedQuestion; last: boolean }) {
  const over = question.timeMs > question.idealMs;
  const tone =
    question.verdict === 'correct' ? POSITIVE : question.verdict === 'wrong' ? NEGATIVE : TEXT_FAINT;

  return (
    <View style={[styles.row, last ? styles.rowLast : null]}>
      <View style={[styles.rowIndex, { borderColor: tone }]}>
        <Text style={[styles.rowIndexText, { color: tone }]}>{question.position}</Text>
      </View>

      <View style={styles.rowBody}>
        <Text style={styles.rowTitle} numberOfLines={1}>
          {question.topic || question.chapter}
        </Text>
        <Text style={styles.rowMeta} numberOfLines={1}>
          {BAND_LABEL[question.band]} · {question.chapter}
        </Text>
      </View>

      <View style={styles.rowRight}>
        <Text style={[styles.rowTime, over ? { color: CAUTION } : null]}>
          {shortDuration(question.timeMs)}
        </Text>
        <Text style={styles.rowQuality}>{QUALITY_LABEL[question.quality]}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    width: 42,
    height: 42,
    borderRadius: RADIUS_INNER,
    backgroundColor: SURFACE_SUBTLE,
    borderWidth: 1,
    borderColor: SURFACE_BORDER,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
  },
  chipNumber: { color: TEXT, fontSize: 12, fontFamily: typography.semiBold },

  section: { marginTop: SECTION_GAP },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  filter: {
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: SURFACE_SUBTLE,
    borderWidth: 1,
    borderColor: SURFACE_BORDER,
  },
  filterActive: { backgroundColor: TEXT, borderColor: TEXT },
  filterText: { color: TEXT_MUTED, fontSize: 12, fontFamily: typography.medium },
  filterTextActive: { color: ON_LIGHT, fontFamily: typography.semiBold },

  list: {
    backgroundColor: SURFACE,
    borderRadius: RADIUS_INNER,
    borderWidth: 1,
    borderColor: SURFACE_BORDER,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: GAP,
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: DIVIDER,
  },
  rowLast: { borderBottomWidth: 0 },
  rowIndex: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowIndexText: { fontSize: 12, fontFamily: typography.bold },
  rowBody: { flex: 1, gap: 3 },
  rowTitle: { color: TEXT, fontSize: 13.5, fontFamily: typography.medium },
  rowMeta: { color: TEXT_FAINT, fontSize: 11.5, fontFamily: typography.regular },
  rowRight: { alignItems: 'flex-end', gap: 3 },
  rowTime: { color: TEXT_MUTED, fontSize: 12.5, fontFamily: typography.semiBold },
  rowQuality: { color: TEXT_FAINT, fontSize: 11, fontFamily: typography.regular },
});
