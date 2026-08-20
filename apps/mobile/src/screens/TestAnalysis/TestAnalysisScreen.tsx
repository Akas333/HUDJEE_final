import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import {
  ChevronRight,
  Clock,
  ListChecks,
  Route,
  Sparkles,
  Target,
  TrendingUp,
  Timer,
  NotebookPen,
  RotateCcw,
} from 'lucide-react-native';

import AnalysisFrame from '../../components/analysis/AnalysisFrame';
import JourneyChart from '../../components/analysis/JourneyChart';
import PressableScale from '../../components/PressableScale';
import SurfaceCard from '../../components/ui/SurfaceCard';
import SectionHeader from '../../components/ui/SectionHeader';
import { compactDuration } from '../../components/analysis/format';
import { BAND_LABEL, SessionAnalysis } from '../../services/analysisApi';
import { typography } from '../../theme/typography';
import {
  DIVIDER,
  GAP,
  NEGATIVE,
  POSITIVE,
  RADIUS,
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
 * Where a finished session lands.
 *
 * The top of the screen is the one number that answers "how did I do", and
 * everything under it is a way in to *why*. The journey chart sits third rather
 * than buried in its own section on purpose — it is the thing the student
 * cannot get from any other screen, and a preview of it is what makes the
 * section worth opening.
 */
export default function TestAnalysisScreen({ navigation, route }: any) {
  const { sessionId, title } = route.params || {};

  if (!sessionId) {
    return (
      <AnalysisFrame sessionId="" title="Analysis">
        {() => null}
      </AnalysisFrame>
    );
  }

  const go = (screen: string) => navigation.navigate(screen, { sessionId, title });

  return (
    <AnalysisFrame
      sessionId={sessionId}
      title="Analysis"
      eyebrow="After the paper"
      subtitle={title || undefined}
    >
      {(a: SessionAnalysis) => (
        <>
          <Animated.View entering={enter(2)}>
            <SurfaceCard style={styles.hero}>
              <Text style={styles.heroLabel}>SCORE</Text>
              <View style={styles.heroRow}>
                <Text style={styles.heroValue}>{a.totals.score}</Text>
                <Text style={styles.heroMax}>/{a.totals.maxScore}</Text>
              </View>
              <Text style={styles.heroCaption}>
                {a.totals.correct} right, {a.totals.wrong} wrong
                {a.totals.skipped > 0 ? `, ${a.totals.skipped} skipped` : ''} · {a.totals.accuracyPct}%
                accuracy on what you attempted
              </Text>
            </SurfaceCard>
          </Animated.View>

          <Animated.View entering={enter(3)} style={styles.tiles}>
            <Tile label="Attempted" value={`${a.totals.attempted}/${a.totals.asked}`} icon={ListChecks} />
            <Tile label="Accuracy" value={`${a.totals.accuracyPct}%`} icon={Target} />
          </Animated.View>

          <Animated.View entering={enter(4)} style={styles.tiles}>
            <Tile label="Earned" value={`+${a.totals.positive}`} icon={TrendingUp} accent={POSITIVE} />
            <Tile
              label="Marks lost"
              value={a.totals.lost ? `−${a.totals.lost}` : '0'}
              icon={Timer}
              accent={a.totals.lost ? NEGATIVE : TEXT}
            />
            <Tile label="Time" value={compactDuration(a.durationMs)} icon={Clock} />
          </Animated.View>

          <View style={styles.section}>
            <SectionHeader title="Your journey" meta={`${a.totals.asked} questions`} />
            <Animated.View entering={enter(5)}>
              <SurfaceCard onPress={() => go('QuestionJourneyScreen')} padding={18}>
                <JourneyChart questions={a.questions} height={168} compact />
                {a.shape ? (
                  <Text style={styles.journeyRead}>
                    Opened on {BAND_LABEL[a.shape.opened].toLowerCase()}, peaked at{' '}
                    {BAND_LABEL[a.shape.peak].toLowerCase()}, closed on{' '}
                    {BAND_LABEL[a.shape.closed].toLowerCase()} — {a.shape.swings} change
                    {a.shape.swings === 1 ? '' : 's'} of level.
                  </Text>
                ) : null}
              </SurfaceCard>
            </Animated.View>
          </View>

          <View style={styles.section}>
            <SectionHeader title="Go deeper" />
            <Animated.View entering={enter(6)} style={styles.list}>
              <Row
                icon={Route}
                title="Question journey"
                blurb="The climb, question by question"
                onPress={() => go('QuestionJourneyScreen')}
              />
              <Row
                icon={TrendingUp}
                title="Performance"
                blurb="Difficulty, chapters and what the paper was worth"
                onPress={() => go('PerformanceAnalysisScreen')}
              />
              <Row
                icon={Target}
                title="Quality of attempts"
                blurb="Perfect, wasted, overtime, abandoned"
                onPress={() => go('AttemptQualityScreen')}
              />
              <Row
                icon={Clock}
                title="Time analysis"
                blurb="Where the minutes actually went"
                onPress={() => go('TimeAnalysisScreen')}
              />
              <Row
                icon={ListChecks}
                title="Question by question"
                blurb="Every question, with its time and verdict"
                onPress={() => go('QuestionWiseAnalysisScreen')}
              />
              <Row
                icon={Sparkles}
                title="What this says"
                blurb="The run read back to you in sentences"
                onPress={() => go('AISummaryScreen')}
              />
              <Row
                icon={RotateCcw}
                title="Redo your mistakes"
                blurb={`${a.totals.wrong} question${a.totals.wrong === 1 ? '' : 's'} to take again`}
                onPress={() => go('PracticeMistakeQuestionsScreen')}
                last={false}
              />
              <Row
                icon={NotebookPen}
                title="Note what you learned"
                blurb="Up to three things, before you forget them"
                onPress={() => go('PostAnalysisNotesScreen')}
                last
              />
            </Animated.View>
          </View>
        </>
      )}
    </AnalysisFrame>
  );
}

function Tile({
  label,
  value,
  icon: Icon,
  accent = TEXT,
}: {
  label: string;
  value: string;
  icon: any;
  accent?: string;
}) {
  return (
    <View style={styles.tile}>
      <View style={styles.tileHead}>
        <Text style={styles.tileLabel} numberOfLines={1}>
          {label}
        </Text>
        <Icon color={accent} size={14} strokeWidth={2} />
      </View>
      <Text style={[styles.tileValue, { color: accent }]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

function Row({
  icon: Icon,
  title,
  blurb,
  onPress,
  last,
}: {
  icon: any;
  title: string;
  blurb: string;
  onPress: () => void;
  last?: boolean;
}) {
  return (
    <PressableScale onPress={onPress} scaleTo={0.98} style={[styles.row, last ? styles.rowLast : null]}>
      <View style={styles.rowIcon}>
        <Icon color={TEXT_MUTED} size={17} strokeWidth={1.8} />
      </View>
      <View style={styles.rowText}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowBlurb} numberOfLines={1}>
          {blurb}
        </Text>
      </View>
      <ChevronRight color={TEXT_FAINT} size={18} strokeWidth={2} />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  hero: { gap: 6 },
  heroLabel: { color: TEXT_MUTED, fontSize: 10, fontFamily: typography.bold, letterSpacing: 1.2 },
  heroRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  heroValue: { color: TEXT, fontSize: 46, fontFamily: typography.bold, letterSpacing: -1.5 },
  heroMax: { color: TEXT_FAINT, fontSize: 18, fontFamily: typography.semiBold },
  heroCaption: { color: TEXT_MUTED, fontSize: 13, fontFamily: typography.regular, lineHeight: 20, marginTop: 4 },

  tiles: { flexDirection: 'row', gap: GAP, marginTop: GAP },
  tile: {
    flex: 1,
    backgroundColor: SURFACE,
    borderRadius: RADIUS,
    borderWidth: 1,
    borderColor: SURFACE_BORDER,
    padding: 14,
    gap: 8,
  },
  tileHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 },
  tileLabel: {
    color: TEXT_MUTED,
    fontSize: 10,
    fontFamily: typography.bold,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    flexShrink: 1,
  },
  tileValue: { fontSize: 21, fontFamily: typography.bold, letterSpacing: -0.5 },

  section: { marginTop: SECTION_GAP },
  journeyRead: {
    color: TEXT_MUTED,
    fontSize: 12.5,
    fontFamily: typography.regular,
    lineHeight: 19,
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: DIVIDER,
  },

  list: {
    backgroundColor: SURFACE,
    borderRadius: RADIUS,
    borderWidth: 1,
    borderColor: SURFACE_BORDER,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: DIVIDER,
  },
  rowLast: { borderBottomWidth: 0 },
  rowIcon: {
    width: 34,
    height: 34,
    borderRadius: RADIUS_INNER,
    backgroundColor: SURFACE_SUBTLE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rowText: { flex: 1, gap: 3 },
  rowTitle: { color: TEXT, fontSize: 14.5, fontFamily: typography.semiBold },
  rowBlurb: { color: TEXT_FAINT, fontSize: 12, fontFamily: typography.regular },
});
