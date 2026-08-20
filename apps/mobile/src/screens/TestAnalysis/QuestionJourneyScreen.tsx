import React, { useState } from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react-native';

import AnalysisFrame from '../../components/analysis/AnalysisFrame';
import JourneyChart from '../../components/analysis/JourneyChart';
import LevelTrace, { hasLevelTrace } from '../../components/analysis/LevelTrace';
import SurfaceCard from '../../components/ui/SurfaceCard';
import SectionHeader from '../../components/ui/SectionHeader';
import { shortDuration, titleCase } from '../../components/analysis/format';
import {
  AnalysedQuestion,
  BAND_LABEL,
  QUALITY_LABEL,
  SessionAnalysis,
} from '../../services/analysisApi';
import { typography } from '../../theme/typography';
import {
  DIVIDER,
  GAP,
  GUTTER,
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

const CARD_PADDING = 18;
const CHART_WIDTH = Dimensions.get('window').width - GUTTER * 2 - CARD_PADDING * 2;

/**
 * The journey, at full size.
 *
 * A practice run is adaptive: the engine promotes after five right and demotes
 * after two wrong, so the shape of the line *is* the session's story. Every
 * other analysis screen aggregates that story away — this is the only one that
 * keeps the order events happened in, which is the only place a student can see
 * that they lost the tough lane by rushing two questions rather than by not
 * knowing the material.
 */
export default function QuestionJourneyScreen({ route }: any) {
  const { sessionId, title } = route.params || {};
  const [selected, setSelected] = useState<AnalysedQuestion | null>(null);

  return (
    <AnalysisFrame
      sessionId={sessionId}
      title="Question journey"
      eyebrow={title || 'Analysis'}
      subtitle="Which level each question came from, in the order you met them."
    >
      {(a: SessionAnalysis) => (
        <>
          <Animated.View entering={enter(2)}>
            <SurfaceCard padding={CARD_PADDING}>
              <JourneyChart questions={a.questions} height={230} onSelect={setSelected} />
            </SurfaceCard>
          </Animated.View>

          {selected ? (
            <Animated.View entering={enter(0)} style={styles.detail}>
              <View style={styles.detailHead}>
                <Text style={styles.detailTitle}>Question {selected.position}</Text>
                <View
                  style={[
                    styles.verdictPill,
                    {
                      backgroundColor:
                        selected.verdict === 'correct'
                          ? 'rgba(34,197,94,0.12)'
                          : selected.verdict === 'wrong'
                            ? 'rgba(239,68,68,0.12)'
                            : SURFACE_SUBTLE,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.verdictText,
                      {
                        color:
                          selected.verdict === 'correct'
                            ? POSITIVE
                            : selected.verdict === 'wrong'
                              ? NEGATIVE
                              : TEXT_MUTED,
                      },
                    ]}
                  >
                    {titleCase(selected.verdict)}
                  </Text>
                </View>
              </View>
              <Text style={styles.detailBody}>
                {BAND_LABEL[selected.band]} · {selected.topic || selected.chapter} ·{' '}
                {shortDuration(selected.timeMs)} against {shortDuration(selected.idealMs)} allowed —{' '}
                {QUALITY_LABEL[selected.quality].toLowerCase()}.
              </Text>
            </Animated.View>
          ) : (
            <Animated.View entering={enter(3)}>
              <Text style={styles.hint}>Tap any point to see what that question was.</Text>
            </Animated.View>
          )}

          {a.shape ? (
            <View style={styles.section}>
              <SectionHeader title="The shape of it" />
              <Animated.View entering={enter(4)} style={styles.tiles}>
                <Tile label="Opened on" value={BAND_LABEL[a.shape.opened]} />
                <Tile label="Peaked at" value={BAND_LABEL[a.shape.peak]} />
                <Tile label="Closed on" value={BAND_LABEL[a.shape.closed]} />
              </Animated.View>

              <Animated.View entering={enter(5)} style={[styles.tiles, { marginTop: GAP }]}>
                <Tile label="Level changes" value={String(a.shape.swings)} />
                <Tile label="Best run" value={`${a.shape.bestRun} right`} />
                <Tile
                  label="Direction"
                  value={
                    a.shape.direction === 'up'
                      ? 'Climbed'
                      : a.shape.direction === 'down'
                        ? 'Dropped'
                        : 'Held'
                  }
                  icon={
                    a.shape.direction === 'up'
                      ? ArrowUpRight
                      : a.shape.direction === 'down'
                        ? ArrowDownRight
                        : Minus
                  }
                />
              </Animated.View>
            </View>
          ) : null}

          {hasLevelTrace(a.questions) ? (
            <View style={styles.section}>
              <SectionHeader title="Under the lanes" />
              <Animated.View entering={enter(6)}>
                <SurfaceCard padding={CARD_PADDING}>
                  <LevelTrace questions={a.questions} width={CHART_WIDTH} />
                </SurfaceCard>
              </Animated.View>
            </View>
          ) : null}

          <View style={styles.section}>
            <SectionHeader title="How each level went" />
            <Animated.View entering={enter(7)} style={styles.list}>
              {a.bands.map((band, i) => (
                <View
                  key={band.band}
                  style={[styles.bandRow, i === a.bands.length - 1 ? styles.bandRowLast : null]}
                >
                  <Text style={styles.bandName}>{BAND_LABEL[band.band]}</Text>
                  <Text style={styles.bandMeta}>
                    {band.correct}/{band.asked} · {band.accuracyPct}% · {shortDuration(band.avgMs)} avg
                  </Text>
                </View>
              ))}
            </Animated.View>
          </View>

          <Animated.View entering={enter(8)} style={styles.note}>
            <Text style={styles.noteText}>
              The engine moves you up after five correct in a row and down after two wrong. A lane
              that changes often means it was still finding your level; a lane that never changes
              means it found it early.
            </Text>
          </Animated.View>
        </>
      )}
    </AnalysisFrame>
  );
}

function Tile({ label, value, icon: Icon }: { label: string; value: string; icon?: any }) {
  return (
    <View style={styles.tile}>
      <View style={styles.tileHead}>
        <Text style={styles.tileLabel} numberOfLines={1}>
          {label}
        </Text>
        {Icon ? <Icon color={TEXT_MUTED} size={13} strokeWidth={2} /> : null}
      </View>
      <Text style={styles.tileValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hint: {
    color: TEXT_FAINT,
    fontSize: 12,
    fontFamily: typography.regular,
    textAlign: 'center',
    marginTop: 14,
  },
  detail: {
    marginTop: 14,
    backgroundColor: SURFACE,
    borderRadius: RADIUS_INNER,
    borderWidth: 1,
    borderColor: SURFACE_BORDER,
    padding: 16,
    gap: 8,
  },
  detailHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  detailTitle: { color: TEXT, fontSize: 14.5, fontFamily: typography.semiBold },
  verdictPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  verdictText: { fontSize: 11, fontFamily: typography.bold, letterSpacing: 0.4 },
  detailBody: { color: TEXT_MUTED, fontSize: 12.5, fontFamily: typography.regular, lineHeight: 19 },

  section: { marginTop: SECTION_GAP },
  tiles: { flexDirection: 'row', gap: GAP },
  tile: {
    flex: 1,
    backgroundColor: SURFACE,
    borderRadius: RADIUS_INNER,
    borderWidth: 1,
    borderColor: SURFACE_BORDER,
    padding: 13,
    gap: 7,
  },
  tileHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 4 },
  tileLabel: {
    color: TEXT_MUTED,
    fontSize: 9.5,
    fontFamily: typography.bold,
    letterSpacing: 0.7,
    textTransform: 'uppercase',
    flexShrink: 1,
  },
  tileValue: { color: TEXT, fontSize: 16, fontFamily: typography.bold, letterSpacing: -0.3 },

  list: {
    backgroundColor: SURFACE,
    borderRadius: RADIUS_INNER,
    borderWidth: 1,
    borderColor: SURFACE_BORDER,
    overflow: 'hidden',
  },
  bandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: DIVIDER,
    gap: 12,
  },
  bandRowLast: { borderBottomWidth: 0 },
  bandName: { color: TEXT, fontSize: 13.5, fontFamily: typography.medium },
  bandMeta: { color: TEXT_MUTED, fontSize: 12, fontFamily: typography.regular },

  note: { marginTop: SECTION_GAP },
  noteText: { color: TEXT_FAINT, fontSize: 12, fontFamily: typography.regular, lineHeight: 19 },
});
