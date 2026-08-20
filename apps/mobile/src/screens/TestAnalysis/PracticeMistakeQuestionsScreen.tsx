import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { PartyPopper } from 'lucide-react-native';

import AnalysisFrame from '../../components/analysis/AnalysisFrame';
import EmptyState from '../../components/ui/EmptyState';
import GradientButton from '../../components/ui/GradientButton';
import MathText from '../../components/MathText';
import SurfaceCard from '../../components/ui/SurfaceCard';
import SectionHeader from '../../components/ui/SectionHeader';
import { shortDuration } from '../../components/analysis/format';
import { supabase } from '../../lib/supabase';
import { AnalysedQuestion, BAND_LABEL, SessionAnalysis } from '../../services/analysisApi';
import { typography } from '../../theme/typography';
import {
  DIVIDER,
  GAP,
  NEGATIVE,
  POSITIVE,
  RADIUS_INNER,
  SECTION_GAP,
  SURFACE_BORDER,
  SURFACE_SUBTLE,
  TEXT,
  TEXT_FAINT,
  TEXT_MUTED,
  enter,
} from '../../theme/ui';

/**
 * The questions that cost marks, with their solutions, and a way back into the
 * concept they came from.
 *
 * The bodies are fetched here rather than carried through the analysis: a
 * session's worth of LaTeX would be loaded on every screen in the stack to be
 * read on one of them.
 */
export default function PracticeMistakeQuestionsScreen({ navigation, route }: any) {
  const { sessionId, title } = route.params || {};

  return (
    <AnalysisFrame
      sessionId={sessionId}
      title="Your mistakes"
      eyebrow={title || 'Analysis'}
      subtitle="What went wrong, and what the answer was."
    >
      {(a: SessionAnalysis) => <Body analysis={a} navigation={navigation} />}
    </AnalysisFrame>
  );
}

interface Detail {
  id: string;
  body: string;
  solution: string;
}

function Body({ analysis, navigation }: { analysis: SessionAnalysis; navigation: any }) {
  const mistakes = analysis.questions.filter((q) => q.verdict === 'wrong');
  const [details, setDetails] = useState<Map<string, Detail> | null>(null);

  useEffect(() => {
    if (mistakes.length === 0) {
      setDetails(new Map());
      return;
    }
    let cancelled = false;

    (async () => {
      const { data, error } = await supabase
        .from('questions')
        .select('id, question_body, solution')
        .in(
          'id',
          mistakes.map((q) => q.questionId)
        );

      if (cancelled) return;
      if (error) {
        console.warn('Could not load mistake bodies:', error.message);
        setDetails(new Map());
        return;
      }
      setDetails(
        new Map(
          (data || []).map((row: any) => [
            row.id,
            { id: row.id, body: row.question_body || '', solution: row.solution || '' },
          ])
        )
      );
    })();

    return () => {
      cancelled = true;
    };
  }, [analysis.sessionId]);

  if (mistakes.length === 0) {
    return (
      <EmptyState
        icon={PartyPopper}
        title="Nothing went wrong"
        body="You did not get a single question wrong in this session. There is nothing here to redo."
        accent={POSITIVE}
      />
    );
  }

  const first = mistakes[0];
  const canRedo = Boolean(first.chapterId);

  return (
    <>
      <SectionHeader
        title="Wrong answers"
        meta={`${mistakes.length} · ${analysis.totals.lost} marks`}
      />

      {details === null ? (
        <View style={styles.loading}>
          <ActivityIndicator color={TEXT_MUTED} />
        </View>
      ) : (
        mistakes.map((q, i) => (
          <Animated.View key={q.questionId} entering={enter(2 + i)} style={styles.cardWrap}>
            <SurfaceCard padding={18}>
              <View style={styles.head}>
                <Text style={styles.index}>Q{q.position}</Text>
                <Text style={styles.meta} numberOfLines={1}>
                  {BAND_LABEL[q.band]} · {shortDuration(q.timeMs)}
                </Text>
              </View>

              <MathText style={styles.body} numberOfLines={6}>
                {details.get(q.questionId)?.body || q.topic || 'Question unavailable'}
              </MathText>

              {details.get(q.questionId)?.solution ? (
                <View style={styles.solution}>
                  <Text style={styles.solutionLabel}>SOLUTION</Text>
                  <MathText style={styles.solutionBody}>
                    {details.get(q.questionId)!.solution}
                  </MathText>
                </View>
              ) : null}

              <Text style={styles.tag}>
                {q.topic || q.chapter} · {q.quality === 'wasted' ? 'answered too fast' : 'over time'}
              </Text>
            </SurfaceCard>
          </Animated.View>
        ))
      )}

      {canRedo ? (
        <Animated.View entering={enter(9)} style={styles.footer}>
          <GradientButton
            label="Practise this concept again"
            block
            height={50}
            radius={999}
            onPress={() =>
              navigation.navigate('AdaptiveSessionScreen', {
                chapterId: first.chapterId,
                chapterTitle: first.chapter,
                conceptId: first.conceptId || undefined,
              })
            }
          />
        </Animated.View>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  loading: { paddingVertical: 40, alignItems: 'center' },
  cardWrap: { marginBottom: GAP },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 },
  index: { color: NEGATIVE, fontSize: 13, fontFamily: typography.bold },
  meta: { color: TEXT_FAINT, fontSize: 11.5, fontFamily: typography.regular },
  body: { color: TEXT, fontSize: 14, lineHeight: 22 },

  solution: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: DIVIDER,
    gap: 6,
  },
  solutionLabel: { color: TEXT_FAINT, fontSize: 9.5, fontFamily: typography.bold, letterSpacing: 1 },
  solutionBody: { color: TEXT_MUTED, fontSize: 13, lineHeight: 21 },

  tag: {
    color: TEXT_MUTED,
    fontSize: 11,
    fontFamily: typography.regular,
    marginTop: 14,
    backgroundColor: SURFACE_SUBTLE,
    borderWidth: 1,
    borderColor: SURFACE_BORDER,
    borderRadius: RADIUS_INNER,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignSelf: 'flex-start',
    overflow: 'hidden',
  },

  footer: { marginTop: SECTION_GAP },
});
