import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { NotebookPen, RotateCcw } from 'lucide-react-native';

import PressableScale from '../../components/PressableScale';
import Screen from '../../components/ui/Screen';
import ScreenHeader from '../../components/ui/ScreenHeader';
import EmptyState from '../../components/ui/EmptyState';
import { typography } from '../../theme/typography';
import { SUBJECT_COLORS, SubjectKey } from '../../theme/subjects';
import {
  CAUTION,
  enter,
  GAP,
  POSITIVE,
  PROFILE_TINT,
  RADIUS,
  RADIUS_INNER,
  SURFACE,
  SURFACE_BORDER,
  SURFACE_STRONG,
  TEXT,
  TEXT_FAINT,
  TEXT_MUTED,
  TRACK,
} from '../../theme/ui';

type Mistake = {
  id: string;
  subject: SubjectKey;
  concept: string;
  chapter: string;
  when: string;
  reviewed: boolean;
};

// Placeholder rows until the notebook has a table behind it. The screen used to
// render an empty state *and* a list of these at the same time, which told the
// student both that they had no mistakes and which three they were.
const MISTAKES: Mistake[] = [
  {
    id: '1',
    subject: 'physics',
    concept: 'Conservation of angular momentum',
    chapter: 'Rotational Mechanics',
    when: '2 days ago',
    reviewed: false,
  },
  {
    id: '2',
    subject: 'maths',
    concept: 'Integration by parts',
    chapter: 'Definite Integrals',
    when: '3 days ago',
    reviewed: true,
  },
  {
    id: '3',
    subject: 'chemistry',
    concept: "Hess's law",
    chapter: 'Thermodynamics',
    when: '5 days ago',
    reviewed: false,
  },
];

const FILTERS = ['All', 'Physics', 'Chemistry', 'Maths'] as const;
type Filter = (typeof FILTERS)[number];

const SUBJECT_OF: Record<Exclude<Filter, 'All'>, SubjectKey> = {
  Physics: 'physics',
  Chemistry: 'chemistry',
  Maths: 'maths',
};

const SUBJECT_LABEL: Record<SubjectKey, string> = {
  physics: 'Physics',
  chemistry: 'Chemistry',
  maths: 'Maths',
};

function MistakeCard({ mistake, index }: { mistake: Mistake; index: number }) {
  const hue = SUBJECT_COLORS[mistake.subject];
  const statusColor = mistake.reviewed ? POSITIVE : CAUTION;

  return (
    <Animated.View entering={enter(4 + index, 35)} style={styles.card}>
      <View style={styles.cardTop}>
        <View style={[styles.subjectTag, { backgroundColor: `${hue}1F`, borderColor: `${hue}3D` }]}>
          <Text style={[styles.subjectText, { color: hue }]}>
            {SUBJECT_LABEL[mistake.subject].toUpperCase()}
          </Text>
        </View>
        <Text style={styles.when}>{mistake.when}</Text>
      </View>

      <Text style={styles.concept}>{mistake.concept}</Text>
      <Text style={styles.chapter}>{mistake.chapter}</Text>

      <View style={styles.cardFoot}>
        <View style={styles.statusRow}>
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          <Text style={[styles.statusText, { color: statusColor }]}>
            {mistake.reviewed ? 'Reviewed' : 'Needs review'}
          </Text>
        </View>

        <PressableScale scaleTo={0.94} style={styles.againButton}>
          <RotateCcw color={TEXT} size={13} strokeWidth={2.2} />
          <Text style={styles.againText}>Practise again</Text>
        </PressableScale>
      </View>
    </Animated.View>
  );
}

export default function MistakeNotebookScreen({ navigation }: any) {
  const [filter, setFilter] = useState<Filter>('All');

  const visible = useMemo(
    () =>
      filter === 'All'
        ? MISTAKES
        : MISTAKES.filter((m) => m.subject === SUBJECT_OF[filter]),
    [filter]
  );

  const pending = visible.filter((m) => !m.reviewed).length;

  return (
    <Screen tint={PROFILE_TINT}>
      <ScreenHeader
        eyebrow="Tools"
        title="Mistake notebook"
        subtitle={
          MISTAKES.length > 0
            ? `${pending} of ${visible.length} still need a second look`
            : undefined
        }
        onBack={() => navigation.goBack()}
      />

      {/* The old header had a filter button that opened nothing. Filtering three
          subjects is a row of chips, not a sheet. */}
      <Animated.View entering={enter(2)} style={styles.filters}>
        {FILTERS.map((option) => {
          const selected = option === filter;
          const hue = option === 'All' ? undefined : SUBJECT_COLORS[SUBJECT_OF[option]];
          return (
            <PressableScale
              key={option}
              scaleTo={0.94}
              onPress={() => setFilter(option)}
              style={[
                styles.chip,
                selected && styles.chipSelected,
                selected && hue ? { backgroundColor: `${hue}24`, borderColor: `${hue}59` } : null,
              ]}
            >
              <Text
                style={[
                  styles.chipText,
                  selected && styles.chipTextSelected,
                  selected && hue ? { color: hue } : null,
                ]}
              >
                {option}
              </Text>
            </PressableScale>
          );
        })}
      </Animated.View>

      {visible.length === 0 ? (
        <Animated.View entering={enter(3)}>
          <EmptyState
            icon={NotebookPen}
            title={filter === 'All' ? 'Nothing in the notebook' : `Nothing in ${filter}`}
            body={
              filter === 'All'
                ? 'Questions you get wrong in adaptive practice collect here, so you can come back to the concept rather than the question.'
                : 'Try another subject, or clear the filter.'
            }
            action={
              filter === 'All' ? undefined : { label: 'Show all', onPress: () => setFilter('All') }
            }
          />
        </Animated.View>
      ) : (
        <View style={{ gap: GAP }}>
          {visible.map((mistake, i) => (
            <MistakeCard key={mistake.id} mistake={mistake} index={i} />
          ))}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  filters: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: RADIUS_INNER,
    backgroundColor: TRACK,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  chipSelected: { backgroundColor: SURFACE_STRONG, borderColor: SURFACE_BORDER },
  chipText: { color: TEXT_MUTED, fontSize: 12, fontFamily: typography.medium },
  chipTextSelected: { color: TEXT, fontFamily: typography.bold },

  card: {
    backgroundColor: SURFACE,
    borderRadius: RADIUS,
    borderWidth: 1,
    borderColor: SURFACE_BORDER,
    padding: 18,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  subjectTag: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  subjectText: { fontSize: 9, fontFamily: typography.bold, letterSpacing: 1 },
  when: { color: TEXT_FAINT, fontSize: 11, fontFamily: typography.regular },

  concept: {
    color: TEXT,
    fontSize: 16,
    fontFamily: typography.semiBold,
    letterSpacing: -0.2,
    marginTop: 14,
  },
  chapter: { color: TEXT_MUTED, fontSize: 12, fontFamily: typography.regular, marginTop: 4 },

  cardFoot: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 18,
  },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 12, fontFamily: typography.semiBold },

  againButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: RADIUS_INNER,
    backgroundColor: SURFACE_STRONG,
    borderWidth: 1,
    borderColor: SURFACE_BORDER,
  },
  againText: { color: TEXT, fontSize: 12, fontFamily: typography.semiBold },
});
