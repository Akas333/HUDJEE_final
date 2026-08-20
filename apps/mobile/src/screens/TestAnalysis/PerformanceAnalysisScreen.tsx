import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import AnalysisFrame from '../../components/analysis/AnalysisFrame';
import MetricBar from '../../components/analysis/MetricBar';
import SurfaceCard from '../../components/ui/SurfaceCard';
import SectionHeader from '../../components/ui/SectionHeader';
import { shortDuration } from '../../components/analysis/format';
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
  TRACK,
  enter,
} from '../../theme/ui';

/**
 * What the paper was worth, cut three ways: by difficulty, by what it could
 * have been worth, and by the topics it came from.
 *
 * Score potential is deliberately narrow. It converts wrong answers into right
 * ones and leaves skipped questions alone — a student who skipped nine
 * questions is not "one perfect session away from 60/60", and a bar chart that
 * says so is flattery rather than analysis.
 */
export default function PerformanceAnalysisScreen({ route }: any) {
  const { sessionId, title } = route.params || {};

  return (
    <AnalysisFrame
      sessionId={sessionId}
      title="Performance"
      eyebrow={title || 'Analysis'}
      subtitle="Where the marks came from, and where they did not."
    >
      {(a: SessionAnalysis) => {
        const worstBand = [...a.bands].filter((b) => b.asked >= 2).sort((x, y) => x.accuracyPct - y.accuracyPct)[0];

        return (
          <>
            <SectionHeader title="By difficulty" meta={`${a.totals.asked} questions`} />
            <Animated.View entering={enter(2)}>
              <SurfaceCard style={styles.stack}>
                {a.bands.map((band) => (
                  <MetricBar
                    key={band.band}
                    label={BAND_LABEL[band.band]}
                    meta={`${band.correct}/${band.asked}`}
                    value={band.accuracyPct}
                    max={100}
                    caption={`${band.accuracyPct}% correct · ${shortDuration(band.avgMs)} average`}
                  />
                ))}
                {worstBand ? (
                  <Text style={styles.readout}>
                    {BAND_LABEL[worstBand.band]} questions are the weakest lane of this run, at{' '}
                    {worstBand.accuracyPct}%.
                  </Text>
                ) : null}
              </SurfaceCard>
            </Animated.View>

            <View style={styles.section}>
              <SectionHeader title="Score potential" meta={`out of ${a.totals.maxScore}`} />
              <Animated.View entering={enter(3)}>
                <SurfaceCard style={styles.stack}>
                  <PotentialBar label="What you scored" value={a.potential.actual} max={a.potential.max} highlight />
                  <PotentialBar
                    label="With half the errors"
                    value={a.potential.halfError}
                    max={a.potential.max}
                  />
                  <PotentialBar
                    label="With none of them"
                    value={a.potential.noError}
                    max={a.potential.max}
                  />
                  <Text style={styles.readout}>
                    Every wrong answer is worth five marks — the four it did not earn and the one it
                    gave back. Skipped questions are left out of this; it is a claim about mistakes,
                    not about coverage.
                  </Text>
                </SurfaceCard>
              </Animated.View>
            </View>

            <View style={styles.section}>
              <SectionHeader title="Marks" />
              <Animated.View entering={enter(4)} style={styles.ledger}>
                <LedgerRow label={`Correct × ${a.totals.correct}`} value={`+${a.totals.positive}`} tone={POSITIVE} />
                <LedgerRow label={`Wrong × ${a.totals.wrong}`} value={`−${a.totals.lost}`} tone={NEGATIVE} />
                <LedgerRow label={`Skipped × ${a.totals.skipped}`} value="0" tone={TEXT_MUTED} />
                <LedgerRow label="Net" value={String(a.totals.score)} tone={TEXT} strong />
              </Animated.View>
            </View>

            <View style={styles.section}>
              <SectionHeader title="By topic" meta="weakest first" />
              <Animated.View entering={enter(5)}>
                <SurfaceCard style={styles.stack}>
                  {a.topics.map((topic) => (
                    <MetricBar
                      key={topic.key}
                      label={topic.topic || topic.chapter}
                      meta={`${topic.correct}/${topic.asked}`}
                      value={topic.accuracyPct}
                      max={100}
                      caption={`${topic.chapter} · ${shortDuration(topic.timeMs)}`}
                    />
                  ))}
                </SurfaceCard>
              </Animated.View>
            </View>

            <Animated.View entering={enter(6)} style={styles.section}>
              <Text style={styles.footnote}>
                There is no rank or percentile here. Practice is adaptive, so no two students see
                the same questions — there is nothing to rank this against that would mean anything.
              </Text>
            </Animated.View>
          </>
        );
      }}
    </AnalysisFrame>
  );
}

function PotentialBar({
  label,
  value,
  max,
  highlight,
}: {
  label: string;
  value: number;
  max: number;
  highlight?: boolean;
}) {
  const fraction = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0;
  return (
    <View style={styles.potential}>
      <View style={styles.potentialHead}>
        <Text style={styles.potentialLabel}>{label}</Text>
        <Text style={[styles.potentialValue, highlight ? styles.potentialStrong : null]}>
          {value}
          <Text style={styles.potentialMax}>/{max}</Text>
        </Text>
      </View>
      <View style={styles.track}>
        <View
          style={[
            styles.fill,
            { width: `${fraction * 100}%`, backgroundColor: highlight ? TEXT : TEXT_FAINT },
          ]}
        />
      </View>
    </View>
  );
}

function LedgerRow({
  label,
  value,
  tone,
  strong,
}: {
  label: string;
  value: string;
  tone: string;
  strong?: boolean;
}) {
  return (
    <View style={[styles.ledgerRow, strong ? styles.ledgerRowStrong : null]}>
      <Text style={[styles.ledgerLabel, strong ? styles.ledgerLabelStrong : null]}>{label}</Text>
      <Text style={[styles.ledgerValue, { color: tone }, strong ? styles.ledgerValueStrong : null]}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: 18 },
  section: { marginTop: SECTION_GAP },
  readout: {
    color: TEXT_FAINT,
    fontSize: 12,
    fontFamily: typography.regular,
    lineHeight: 19,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: DIVIDER,
  },

  potential: { gap: 8 },
  potentialHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  potentialLabel: { color: TEXT_MUTED, fontSize: 13, fontFamily: typography.regular },
  potentialValue: { color: TEXT_MUTED, fontSize: 15, fontFamily: typography.semiBold },
  potentialStrong: { color: TEXT, fontSize: 17, fontFamily: typography.bold },
  potentialMax: { color: TEXT_FAINT, fontSize: 12, fontFamily: typography.regular },
  track: { height: 6, borderRadius: 3, backgroundColor: TRACK, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 3 },

  ledger: {
    backgroundColor: SURFACE,
    borderRadius: RADIUS_INNER,
    borderWidth: 1,
    borderColor: SURFACE_BORDER,
    overflow: 'hidden',
  },
  ledgerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: DIVIDER,
    gap: GAP,
  },
  ledgerRowStrong: { borderBottomWidth: 0, backgroundColor: 'rgba(255,255,255,0.03)' },
  ledgerLabel: { color: TEXT_MUTED, fontSize: 13, fontFamily: typography.regular },
  ledgerLabelStrong: { color: TEXT, fontFamily: typography.semiBold },
  ledgerValue: { fontSize: 14, fontFamily: typography.semiBold },
  ledgerValueStrong: { fontSize: 17, fontFamily: typography.bold },

  footnote: { color: TEXT_FAINT, fontSize: 12, fontFamily: typography.regular, lineHeight: 19 },
});
