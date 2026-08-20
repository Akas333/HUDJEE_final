import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { Sparkles } from 'lucide-react-native';

import AnalysisFrame from '../../components/analysis/AnalysisFrame';
import SurfaceCard from '../../components/ui/SurfaceCard';
import SectionHeader from '../../components/ui/SectionHeader';
import { shortDuration } from '../../components/analysis/format';
import { BAND_LABEL, SessionAnalysis } from '../../services/analysisApi';
import { typography } from '../../theme/typography';
import {
  DIVIDER,
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
 * The run, read back in sentences.
 *
 * Every line here is a rule over the session — a threshold on wasted attempts,
 * a gap between two bands — evaluated in `analysisApi`. Nothing on this screen
 * is a model call, and the footnote says so, because a student who thinks a
 * model looked at their paper will read these with more authority than they
 * have earned.
 */
export default function AISummaryScreen({ route }: any) {
  const { sessionId, title } = route.params || {};

  return (
    <AnalysisFrame
      sessionId={sessionId}
      title="What this says"
      eyebrow={title || 'Analysis'}
      subtitle="The run, in the order the problems matter."
    >
      {(a: SessionAnalysis) => (
        <>
          <Animated.View entering={enter(2)}>
            <SurfaceCard style={styles.headline}>
              <View style={styles.badge}>
                <Sparkles color={TEXT_MUTED} size={15} strokeWidth={1.8} />
              </View>
              <Text style={styles.headlineText}>{verdictLine(a)}</Text>
            </SurfaceCard>
          </Animated.View>

          {a.insights.length > 0 ? (
            <View style={styles.section}>
              <SectionHeader title="What to fix" meta="worst first" />
              <Animated.View entering={enter(3)} style={styles.list}>
                {a.insights.map((line, i) => (
                  <View
                    key={line}
                    style={[styles.item, i === a.insights.length - 1 ? styles.itemLast : null]}
                  >
                    <Text style={styles.itemIndex}>{i + 1}</Text>
                    <Text style={styles.itemText}>{line}</Text>
                  </View>
                ))}
              </Animated.View>
            </View>
          ) : null}

          <View style={styles.section}>
            <SectionHeader title="Do this next" />
            <Animated.View entering={enter(4)}>
              <SurfaceCard>
                <Text style={styles.nextText}>{nextStep(a)}</Text>
              </SurfaceCard>
            </Animated.View>
          </View>

          <Animated.View entering={enter(5)} style={styles.section}>
            <Text style={styles.footnote}>
              These are worked out from your answers — times, difficulties and the order things
              happened in. No model read your paper.
            </Text>
          </Animated.View>
        </>
      )}
    </AnalysisFrame>
  );
}

/** One sentence on the run as a whole, before the list of problems. */
function verdictLine(a: SessionAnalysis): string {
  const { totals, shape } = a;

  if (totals.attempted === 0) {
    return 'You opened this session but did not answer anything, so there is nothing to read yet.';
  }

  const climbed = shape?.direction === 'up';
  const held = shape?.direction === 'flat';

  if (totals.accuracyPct >= 85) {
    return `${totals.correct} of ${totals.attempted} right${
      climbed ? `, climbing from ${BAND_LABEL[shape!.opened].toLowerCase()} to ${BAND_LABEL[shape!.closed].toLowerCase()}` : ''
    }. This set is no longer testing you — the next one should be harder.`;
  }

  if (totals.accuracyPct >= 60) {
    return `${totals.correct} of ${totals.attempted} right, at ${shortDuration(
      totals.avgMs
    )} a question. ${
      held
        ? 'You held your level throughout, which means the engine found it early.'
        : climbed
          ? 'You finished above the level you opened on.'
          : 'You finished below the level you opened on — the misses came in a run.'
    }`;
  }

  return `${totals.correct} of ${totals.attempted} right. At this accuracy the negative marking is doing more work than the questions are — ${totals.lost} marks came straight back off.`;
}

/** The one thing worth doing before the next session. */
function nextStep(a: SessionAnalysis): string {
  const worstTopic = a.topics.filter((t) => t.asked >= 2)[0];

  if (a.quality.wasted >= 2) {
    return `Slow down on the first read. ${a.quality.wasted} of your wrong answers took less than the time the question was worth — those are marks given away, not marks lost.`;
  }

  if (a.quality.overtime >= 3) {
    return 'Set a hard ceiling per question and leave when you hit it. Three or more questions ran over, and on a real paper each one of those is a question you never reach.';
  }

  if (worstTopic && worstTopic.accuracyPct < 60) {
    return `Go back to ${worstTopic.topic || worstTopic.chapter} before anything else — it is the weakest thing this session touched, at ${worstTopic.correct} of ${worstTopic.asked}.`;
  }

  if (a.totals.accuracyPct >= 85) {
    return 'Take a harder set. Nothing in this one found an edge worth working on.';
  }

  return 'Redo the questions you got wrong, then take the same concept again. The list is one screen back.';
}

const styles = StyleSheet.create({
  headline: { gap: 14 },
  badge: {
    width: 32,
    height: 32,
    borderRadius: 11,
    backgroundColor: SURFACE_SUBTLE,
    borderWidth: 1,
    borderColor: SURFACE_BORDER,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headlineText: { color: TEXT, fontSize: 15, fontFamily: typography.regular, lineHeight: 24 },

  section: { marginTop: SECTION_GAP },
  list: {
    backgroundColor: SURFACE,
    borderRadius: RADIUS_INNER,
    borderWidth: 1,
    borderColor: SURFACE_BORDER,
    overflow: 'hidden',
  },
  item: {
    flexDirection: 'row',
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: DIVIDER,
  },
  itemLast: { borderBottomWidth: 0 },
  itemIndex: { color: TEXT_FAINT, fontSize: 12, fontFamily: typography.bold, width: 12, lineHeight: 21 },
  itemText: { color: TEXT_MUTED, flex: 1, fontSize: 13, fontFamily: typography.regular, lineHeight: 21 },

  nextText: { color: TEXT, fontSize: 14, fontFamily: typography.regular, lineHeight: 23 },
  footnote: { color: TEXT_FAINT, fontSize: 12, fontFamily: typography.regular, lineHeight: 19 },
});
