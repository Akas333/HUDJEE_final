import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { CircleCheck, CircleSlash, Clock, HelpCircle } from 'lucide-react-native';

import AnalysisFrame from '../../components/analysis/AnalysisFrame';
import SplitBar from '../../components/analysis/SplitBar';
import SurfaceCard from '../../components/ui/SurfaceCard';
import SectionHeader from '../../components/ui/SectionHeader';
import { shortDuration } from '../../components/analysis/format';
import { BAND_LABEL, IDEAL_MS, Quality, SessionAnalysis } from '../../services/analysisApi';
import { typography } from '../../theme/typography';
import {
  CAUTION,
  DIVIDER,
  GAP,
  NEGATIVE,
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
 * Right and wrong is one axis; fast and slow is the other. This screen is the
 * second one.
 *
 * A correct answer that took four minutes cost the two questions it displaced,
 * and a wrong answer given in eight seconds was not a knowledge failure at all.
 * Accuracy alone cannot separate those, which is why a student can hold 80%
 * across a term and never find out what is actually costing them the paper.
 */

const DEFINITIONS: {
  key: Exclude<Quality, 'left'>;
  label: string;
  blurb: string;
  color: string;
  icon: any;
}[] = [
  {
    key: 'perfect',
    label: 'Perfect',
    blurb: 'Right, and inside the time the question deserved.',
    color: POSITIVE,
    icon: CircleCheck,
  },
  {
    key: 'wasted',
    label: 'Wasted',
    blurb: 'Wrong, and quick. The shape of a guess.',
    color: NEGATIVE,
    icon: CircleSlash,
  },
  {
    key: 'overtime',
    label: 'Overtime',
    blurb: 'Attempted, but over time — it cost another question.',
    color: CAUTION,
    icon: Clock,
  },
  {
    key: 'confused',
    label: 'Confused',
    blurb: 'Left, but only after sinking the time in anyway.',
    color: TEXT_MUTED,
    icon: HelpCircle,
  },
];

export default function AttemptQualityScreen({ route }: any) {
  const { sessionId, title } = route.params || {};

  return (
    <AnalysisFrame
      sessionId={sessionId}
      title="Quality of attempts"
      eyebrow={title || 'Analysis'}
      subtitle="Not whether you got it, but what getting it cost."
    >
      {(a: SessionAnalysis) => {
        const counts = a.quality;
        const worst = DEFINITIONS.filter((d) => d.key !== 'perfect')
          .map((d) => ({ ...d, count: counts[d.key] }))
          .sort((x, y) => y.count - x.count)[0];

        return (
          <>
            <Animated.View entering={enter(2)} style={styles.grid}>
              {DEFINITIONS.map((d) => (
                <View key={d.key} style={styles.cell}>
                  <View style={styles.cellHead}>
                    <d.icon color={d.color} size={15} strokeWidth={2} />
                    <Text style={styles.cellLabel}>{d.label}</Text>
                  </View>
                  <Text style={[styles.cellValue, { color: d.color }]}>{counts[d.key]}</Text>
                  <Text style={styles.cellBlurb}>{d.blurb}</Text>
                </View>
              ))}
            </Animated.View>

            <View style={styles.section}>
              <SectionHeader title="The whole run" meta={`${a.totals.asked} questions`} />
              <Animated.View entering={enter(3)}>
                <SurfaceCard>
                  <SplitBar
                    slices={[
                      { label: 'Perfect', value: counts.perfect, color: POSITIVE },
                      { label: 'Wasted', value: counts.wasted, color: NEGATIVE },
                      { label: 'Overtime', value: counts.overtime, color: CAUTION },
                      { label: 'Confused', value: counts.confused, color: TEXT_MUTED },
                      { label: 'Left early', value: counts.left, color: TEXT_FAINT },
                    ]}
                    height={14}
                  />
                  {worst && worst.count > 0 ? (
                    <Text style={styles.readout}>
                      {worst.count} {worst.label.toLowerCase()} attempt
                      {worst.count === 1 ? '' : 's'} is the biggest thing between this score and a
                      better one.
                    </Text>
                  ) : (
                    <Text style={styles.readout}>
                      Nothing was rushed and nothing ran over. This is what a clean run looks like.
                    </Text>
                  )}
                </SurfaceCard>
              </Animated.View>
            </View>

            <View style={styles.section}>
              <SectionHeader title="Time allowed" meta="per question" />
              <Animated.View entering={enter(4)} style={styles.list}>
                {a.bands.map((band, i) => (
                  <View
                    key={band.band}
                    style={[styles.row, i === a.bands.length - 1 ? styles.rowLast : null]}
                  >
                    <Text style={styles.rowLabel}>{BAND_LABEL[band.band]}</Text>
                    <Text style={styles.rowMeta}>
                      {shortDuration(band.avgMs)} spent · {shortDuration(IDEAL_MS[band.band])}{' '}
                      allowed
                    </Text>
                  </View>
                ))}
              </Animated.View>
              <Text style={styles.footnote}>
                The allowance splits JEE Main's 2.4 minutes a question the way the paper intends it
                to be spent: an easy question is meant to buy time for a hard one.
              </Text>
            </View>

            {!a.skipsKnown ? (
              <Animated.View entering={enter(5)} style={styles.section}>
                <Text style={styles.footnote}>
                  Skipped questions are not counted in this run. A skip is not written down when it
                  happens, so it can only be measured while the session is still open.
                </Text>
              </Animated.View>
            ) : null}
          </>
        );
      }}
    </AnalysisFrame>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: GAP },
  cell: {
    width: '47.5%',
    flexGrow: 1,
    backgroundColor: SURFACE,
    borderRadius: RADIUS_INNER,
    borderWidth: 1,
    borderColor: SURFACE_BORDER,
    padding: 14,
    gap: 6,
  },
  cellHead: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  cellLabel: {
    color: TEXT_MUTED,
    fontSize: 10,
    fontFamily: typography.bold,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  cellValue: { fontSize: 26, fontFamily: typography.bold, letterSpacing: -0.6 },
  cellBlurb: { color: TEXT_FAINT, fontSize: 11.5, fontFamily: typography.regular, lineHeight: 17 },

  section: { marginTop: SECTION_GAP },
  readout: {
    color: TEXT_MUTED,
    fontSize: 12.5,
    fontFamily: typography.regular,
    lineHeight: 19,
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: DIVIDER,
  },

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
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: DIVIDER,
    gap: GAP,
    backgroundColor: SURFACE_SUBTLE,
  },
  rowLast: { borderBottomWidth: 0 },
  rowLabel: { color: TEXT, fontSize: 13.5, fontFamily: typography.medium },
  rowMeta: { color: TEXT_MUTED, fontSize: 12, fontFamily: typography.regular },

  footnote: {
    color: TEXT_FAINT,
    fontSize: 12,
    fontFamily: typography.regular,
    lineHeight: 19,
    marginTop: 14,
  },
});
