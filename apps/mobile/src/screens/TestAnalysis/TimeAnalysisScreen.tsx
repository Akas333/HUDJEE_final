import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import AnalysisFrame from '../../components/analysis/AnalysisFrame';
import MetricBar from '../../components/analysis/MetricBar';
import SplitBar from '../../components/analysis/SplitBar';
import SurfaceCard from '../../components/ui/SurfaceCard';
import SectionHeader from '../../components/ui/SectionHeader';
import { minutesOf, shortDuration } from '../../components/analysis/format';
import { BAND_LABEL, SessionAnalysis } from '../../services/analysisApi';
import { typography } from '../../theme/typography';
import {
  DIVIDER,
  GAP,
  NEGATIVE,
  POSITIVE,
  RADIUS_INNER,
  SECTION_GAP,
  SURFACE,
  SURFACE_BORDER,
  TEXT,
  TEXT_FAINT,
  TEXT_MUTED,
  enter,
} from '../../theme/ui';

/**
 * Where the minutes went, and whether they bought anything.
 *
 * The split that matters is not "how long did you take" but how much of it
 * landed on questions you got right. Time on wrong answers is the expensive
 * kind: it is paid twice, once in minutes and once in negative marks.
 */
export default function TimeAnalysisScreen({ route }: any) {
  const { sessionId, title } = route.params || {};

  return (
    <AnalysisFrame
      sessionId={sessionId}
      title="Time analysis"
      eyebrow={title || 'Analysis'}
      subtitle="What the clock was spent on."
    >
      {(a: SessionAnalysis) => {
        const slowest = [...a.questions].sort((x, y) => y.timeMs - x.timeMs).slice(0, 5);
        const questionMs = a.timeSplit.correctMs + a.timeSplit.wrongMs + a.timeSplit.skippedMs;
        const productive = questionMs ? Math.round((a.timeSplit.correctMs / questionMs) * 100) : 0;

        return (
          <>
            <Animated.View entering={enter(2)} style={styles.tiles}>
              <Tile label="On the clock" value={shortDuration(a.durationMs)} />
              <Tile label="Per question" value={shortDuration(a.totals.avgMs)} />
              <Tile label="Productive" value={`${productive}%`} />
            </Animated.View>

            <View style={styles.section}>
              <SectionHeader title="Quality of time spent" meta={`${minutesOf(questionMs)} min`} />
              <Animated.View entering={enter(3)}>
                <SurfaceCard>
                  <SplitBar
                    slices={[
                      { label: 'On correct answers', value: a.timeSplit.correctMs, color: POSITIVE },
                      { label: 'On wrong answers', value: a.timeSplit.wrongMs, color: NEGATIVE },
                      { label: 'On skipped questions', value: a.timeSplit.skippedMs, color: TEXT_FAINT },
                    ]}
                    height={14}
                  />
                  <Text style={styles.readout}>
                    {productive >= 70
                      ? 'Most of the clock landed on questions you got right, which is what it is for.'
                      : `Only ${productive}% of your time bought marks. Time on a wrong answer is paid twice — once in minutes, once in negative marking.`}
                  </Text>
                </SurfaceCard>
              </Animated.View>
            </View>

            <View style={styles.section}>
              <SectionHeader title="By difficulty" meta="average per question" />
              <Animated.View entering={enter(4)}>
                <SurfaceCard style={styles.stack}>
                  {a.bands.map((band) => (
                    <MetricBar
                      key={band.band}
                      label={BAND_LABEL[band.band]}
                      meta={shortDuration(band.avgMs)}
                      value={band.avgMs}
                      max={Math.max(...a.bands.map((b) => b.avgMs), 1)}
                      caption={`${band.asked} question${band.asked === 1 ? '' : 's'} · ${band.accuracyPct}% correct`}
                    />
                  ))}
                </SurfaceCard>
              </Animated.View>
            </View>

            <View style={styles.section}>
              <SectionHeader title="Longest questions" meta="top 5" />
              <Animated.View entering={enter(5)} style={styles.list}>
                {slowest.map((q, i) => (
                  <View
                    key={q.questionId}
                    style={[styles.row, i === slowest.length - 1 ? styles.rowLast : null]}
                  >
                    <View style={styles.rowText}>
                      <Text style={styles.rowLabel}>
                        Q{q.position} · {BAND_LABEL[q.band]}
                      </Text>
                      <Text style={styles.rowSub} numberOfLines={1}>
                        {q.topic || q.chapter}
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.rowTime,
                        { color: q.timeMs > q.idealMs ? NEGATIVE : TEXT_MUTED },
                      ]}
                    >
                      {shortDuration(q.timeMs)}
                    </Text>
                  </View>
                ))}
              </Animated.View>
            </View>
          </>
        );
      }}
    </AnalysisFrame>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.tile}>
      <Text style={styles.tileLabel} numberOfLines={1}>
        {label}
      </Text>
      <Text style={styles.tileValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tiles: { flexDirection: 'row', gap: GAP },
  tile: {
    flex: 1,
    backgroundColor: SURFACE,
    borderRadius: RADIUS_INNER,
    borderWidth: 1,
    borderColor: SURFACE_BORDER,
    padding: 14,
    gap: 8,
  },
  tileLabel: {
    color: TEXT_MUTED,
    fontSize: 9.5,
    fontFamily: typography.bold,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  tileValue: { color: TEXT, fontSize: 17, fontFamily: typography.bold, letterSpacing: -0.4 },

  stack: { gap: 18 },
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
  },
  rowLast: { borderBottomWidth: 0 },
  rowText: { flex: 1, gap: 3 },
  rowLabel: { color: TEXT, fontSize: 13.5, fontFamily: typography.medium },
  rowSub: { color: TEXT_FAINT, fontSize: 11.5, fontFamily: typography.regular },
  rowTime: { fontSize: 13, fontFamily: typography.semiBold },
});
