import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';

import { AnalysedQuestion } from '../../services/analysisApi';
import { typography } from '../../theme/typography';
import { TEXT, TEXT_FAINT, TEXT_MUTED, TRACK } from '../../theme/ui';

/**
 * The engine's read on the student, over the course of the run.
 *
 * `answer_events.theta_at_time` is the IRT ability estimate at the moment each
 * question was served — the number that actually decided what came next. The
 * journey chart shows which lane the paper was in; this shows why. A line that
 * climbs while the lanes stay flat means the engine had not caught up yet; a
 * line that falls two questions before the lane drops is the demotion arriving.
 *
 * Drawn only when the engine logged theta. Sessions recorded before that column
 * existed, and anonymous runs where no concept state is kept, have nothing here
 * and get nothing rather than a flat line at zero implying a measurement.
 */

const PAD = 10;
const H = 76;

export function hasLevelTrace(questions: AnalysedQuestion[]): boolean {
  return questions.filter((q) => q.theta != null).length >= 2;
}

export default function LevelTrace({
  questions,
  width,
}: {
  questions: AnalysedQuestion[];
  width: number;
}) {
  const points = useMemo(
    () => questions.filter((q) => q.theta != null).map((q) => ({ position: q.position, theta: q.theta as number })),
    [questions]
  );

  const geometry = useMemo(() => {
    if (points.length < 2) return null;

    const thetas = points.map((p) => p.theta);
    const rawMin = Math.min(...thetas);
    const rawMax = Math.max(...thetas);
    // A student whose estimate barely moved should read as a flat line, not as
    // a dramatic one — so the band never collapses tighter than a quarter
    // logit either side of the run.
    const mid = (rawMin + rawMax) / 2;
    const half = Math.max((rawMax - rawMin) / 2, 0.25);
    const min = mid - half;
    const max = mid + half;

    const innerW = width - PAD * 2;
    const innerH = H - PAD * 2;
    const x = (i: number) => PAD + (points.length === 1 ? innerW / 2 : (i / (points.length - 1)) * innerW);
    const y = (theta: number) => PAD + innerH - ((theta - min) / (max - min)) * innerH;

    const d = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(p.theta)}`).join(' ');

    return { d, x, y, min, max, first: points[0].theta, last: points[points.length - 1].theta };
  }, [points, width]);

  if (!geometry) return null;

  const delta = geometry.last - geometry.first;

  return (
    <View>
      <View style={styles.head}>
        <Text style={styles.label}>YOUR LEVEL, THROUGH THE RUN</Text>
        <Text style={styles.delta}>
          {delta >= 0 ? '+' : ''}
          {delta.toFixed(2)}
        </Text>
      </View>

      <Svg width={width} height={H}>
        <Line x1={0} y1={H / 2} x2={width} y2={H / 2} stroke={TRACK} strokeWidth={1} strokeDasharray="3 5" />
        <Path d={geometry.d} stroke={TEXT} strokeWidth={1.75} fill="none" strokeLinejoin="round" strokeLinecap="round" />
        <Circle cx={geometry.x(points.length - 1)} cy={geometry.y(geometry.last)} r={3.5} fill={TEXT} />
      </Svg>

      <Text style={styles.caption}>
        Started at {geometry.first.toFixed(2)}, ended at {geometry.last.toFixed(2)}. This is the
        engine's estimate of you, not a score.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 },
  label: { color: TEXT_MUTED, fontSize: 10, fontFamily: typography.bold, letterSpacing: 1 },
  delta: { color: TEXT, fontSize: 13, fontFamily: typography.semiBold },
  caption: { color: TEXT_FAINT, fontSize: 11, fontFamily: typography.regular, lineHeight: 17, marginTop: 8 },
});
