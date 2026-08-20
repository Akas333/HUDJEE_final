import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Path, Text as SvgText } from 'react-native-svg';

import { AnalysedQuestion, BAND_LABEL, BAND_ORDER, Band } from '../../services/analysisApi';
import { typography } from '../../theme/typography';
import {
  DIVIDER,
  NEGATIVE,
  POSITIVE,
  SURFACE,
  TEXT,
  TEXT_FAINT,
  TEXT_MUTED,
  TRACK,
} from '../../theme/ui';

/**
 * The route the paper took through difficulty, question by question.
 *
 * Three lanes — easy at the floor, tough at the ceiling — and one line walking
 * left to right through them, with a mark at each question coloured by how it
 * went. It answers the question a table of totals cannot: *when* the hard ones
 * arrived, and what the student did when they did. "62% on tough questions"
 * and "climbed to tough on Q4, missed two, and was back on easy by Q7" are the
 * same three numbers and completely different pieces of information.
 *
 * The line is the point, so it is drawn white and full-weight; the lane rules
 * behind it are hairlines. Correctness is the one thing here allowed a hue —
 * the design system spends colour on right-and-wrong and on nothing else.
 *
 * Scrolls horizontally past about a dozen questions rather than compressing:
 * squeezing forty questions into a phone width turns the staircase into noise,
 * and the shape is the whole reason to draw it.
 */

/** Horizontal distance between two questions. Below this the marks collide. */
const STEP = 46;
const PAD_X = 26;
const PAD_TOP = 18;
const PAD_BOTTOM = 26;
const DOT = 6;
const LANE_LABEL_W = 74;

export interface JourneyChartProps {
  questions: AnalysedQuestion[];
  /** Plot height, excluding the legend. */
  height?: number;
  /** Drops the legend and the question numbers — for the preview on the hub. */
  compact?: boolean;
  onSelect?: (question: AnalysedQuestion) => void;
}

function colorFor(verdict: AnalysedQuestion['verdict']): string {
  if (verdict === 'correct') return POSITIVE;
  if (verdict === 'wrong') return NEGATIVE;
  return TEXT_FAINT;
}

export default function JourneyChart({
  questions,
  height = 190,
  compact = false,
  onSelect,
}: JourneyChartProps) {
  const plotHeight = height;
  const laneGap = (plotHeight - PAD_TOP - PAD_BOTTOM) / (BAND_ORDER.length - 1);

  /** Lane centres, measured from the top. Easy sits at the floor. */
  const laneY = useMemo(() => {
    const map = {} as Record<Band, number>;
    BAND_ORDER.forEach((band, i) => {
      map[band] = PAD_TOP + (BAND_ORDER.length - 1 - i) * laneGap;
    });
    return map;
  }, [laneGap]);

  const width = PAD_X * 2 + Math.max(0, questions.length - 1) * STEP;
  const x = (i: number) => PAD_X + i * STEP;

  const path = useMemo(() => {
    if (questions.length === 0) return '';
    return questions
      .map((q, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${laneY[q.band]}`)
      .join(' ');
  }, [questions, laneY]);

  if (questions.length === 0) return null;

  return (
    <View>
      <View style={styles.row}>
        {/* Fixed while the plot scrolls — a lane label that slides away with the
            line it names stops being an axis. */}
        <View style={[styles.lanes, { height: plotHeight }]}>
          {BAND_ORDER.map((band) => (
            <Text
              key={band}
              style={[styles.laneLabel, { top: laneY[band] - 8 }]}
              numberOfLines={1}
            >
              {BAND_LABEL[band]}
            </Text>
          ))}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.plot}
        >
          <Svg width={width} height={plotHeight}>
            {BAND_ORDER.map((band) => (
              <Line
                key={band}
                x1={0}
                y1={laneY[band]}
                x2={width}
                y2={laneY[band]}
                stroke={TRACK}
                strokeWidth={1}
                strokeDasharray="3 5"
              />
            ))}

            <Path
              d={path}
              stroke={TEXT}
              strokeWidth={1.75}
              strokeLinejoin="round"
              strokeLinecap="round"
              fill="none"
              opacity={0.55}
            />

            {questions.map((q, i) => {
              const cx = x(i);
              const cy = laneY[q.band];
              const fill = colorFor(q.verdict);
              const hollow = q.verdict === 'skipped';

              return (
                <React.Fragment key={`${q.questionId}-${q.position}`}>
                  {/* A ring in the card colour, so the marker punches a hole in
                      the line rather than sitting on top of it. */}
                  <Circle cx={cx} cy={cy} r={DOT + 2.5} fill={SURFACE} />
                  <Circle
                    cx={cx}
                    cy={cy}
                    r={DOT}
                    fill={hollow ? 'none' : fill}
                    stroke={fill}
                    strokeWidth={hollow ? 1.75 : 0}
                  />
                  {/* Hit target. The visible mark is 12pt across, which is not
                      something a thumb can be asked to find. */}
                  {onSelect ? (
                    <Circle
                      cx={cx}
                      cy={cy}
                      r={18}
                      fill="transparent"
                      onPress={() => onSelect(q)}
                    />
                  ) : null}
                </React.Fragment>
              );
            })}

            {!compact
              ? questions.map((q, i) => (
                  <SvgText
                    key={`${q.questionId}-n`}
                    x={x(i)}
                    y={plotHeight - 8}
                    fill={TEXT_FAINT}
                    fontSize={10}
                    fontFamily={typography.regular}
                    textAnchor="middle"
                  >
                    {q.position}
                  </SvgText>
                ))
              : null}
          </Svg>
        </ScrollView>
      </View>

      {!compact ? (
        <View style={styles.legend}>
          <Key color={POSITIVE} label="Correct" />
          <Key color={NEGATIVE} label="Wrong" />
          <Key color={TEXT_FAINT} label="Skipped" hollow />
        </View>
      ) : null}
    </View>
  );
}

function Key({ color, label, hollow }: { color: string; label: string; hollow?: boolean }) {
  return (
    <View style={styles.key}>
      <View
        style={[
          styles.keyDot,
          hollow
            ? { borderColor: color, borderWidth: 1.75, backgroundColor: 'transparent' }
            : { backgroundColor: color },
        ]}
      />
      <Text style={styles.keyLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  lanes: { width: LANE_LABEL_W, position: 'relative' },
  laneLabel: {
    position: 'absolute',
    left: 0,
    color: TEXT_MUTED,
    fontSize: 11,
    fontFamily: typography.semiBold,
  },
  plot: { flexDirection: 'column' },

  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: DIVIDER,
  },
  key: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  keyDot: { width: 10, height: 10, borderRadius: 5 },
  keyLabel: { color: TEXT_MUTED, fontSize: 12, fontFamily: typography.regular },
});
