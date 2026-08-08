import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ArrowRight, Clock, Target, TrendingDown, TrendingUp } from 'lucide-react-native';

import PressableScale from '../../components/PressableScale';
import SubjectBackdrop from '../../components/SubjectBackdrop';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { DEFAULT_TINT, SUBJECT_COLORS, SubjectKey, tintFor } from '../../theme/subjects';
import { ArenaSummary } from '../../services/arenaApi';
import {
  GAP,
  GUTTER,
  MODE_BY_ID,
  NEGATIVE,
  POSITIVE,
  RADIUS,
  SECTION_GAP,
  SUBJECT_LABELS,
  SURFACE,
  SURFACE_BORDER,
  TEXT,
  TEXT_FAINT,
  TEXT_MUTED,
  TRACK,
  formatClock,
} from '../../theme/arena';

const enter = (index: number) =>
  FadeInDown.springify().damping(18).mass(0.6).delay(Math.min(index, 10) * 45);

const REASON_COPY: Record<string, string> = {
  time: 'The clock ran out',
  target: 'You hit your target',
  manual: 'You ended the session',
};

function StatTile({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <View style={styles.statTile}>
      {icon ? <View style={styles.statIcon}>{icon}</View> : null}
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

/**
 * What the session actually did to each subject. Arena has no separate rating —
 * the number that moves here is the same mastery that drives readiness and
 * coverage everywhere else in the app, which is why a session is worth sitting.
 */
function SubjectCard({ subject, index }: { subject: ArenaSummary['subjects'][number]; index: number }) {
  const accent = SUBJECT_COLORS[subject.subject as SubjectKey] || TEXT_MUTED;
  const up = subject.mastery_delta >= 0;

  return (
    <Animated.View entering={enter(4 + index)} style={styles.subjectCard}>
      <View style={styles.subjectTop}>
        <View style={[styles.subjectDot, { backgroundColor: accent }]} />
        <Text style={styles.subjectName}>{SUBJECT_LABELS[subject.subject as SubjectKey]}</Text>
        <View
          style={[
            styles.deltaPill,
            { backgroundColor: up ? 'rgba(63,232,166,0.12)' : 'rgba(248,113,113,0.12)' },
          ]}
        >
          {up ? (
            <TrendingUp color={POSITIVE} size={13} strokeWidth={2.5} />
          ) : (
            <TrendingDown color={NEGATIVE} size={13} strokeWidth={2.5} />
          )}
          <Text style={[styles.deltaText, { color: up ? POSITIVE : NEGATIVE }]}>
            {up ? `+${subject.mastery_delta}` : subject.mastery_delta}
          </Text>
        </View>
      </View>

      {/* Before → after, on the same 0–100 scale the chapter cards use. */}
      <View style={styles.masteryRow}>
        <Text style={styles.masteryFrom}>{subject.starting_mastery_pct}</Text>
        <ArrowRight color={TEXT_FAINT} size={14} strokeWidth={2.2} />
        <Text style={[styles.masteryTo, { color: accent }]}>{subject.ending_mastery_pct}</Text>
        <Text style={styles.masterySuffix}>/100</Text>
      </View>

      <View style={styles.track}>
        <View
          style={[
            styles.trackFill,
            { width: `${Math.max(0, Math.min(100, subject.ending_mastery_pct))}%`, backgroundColor: accent },
          ]}
        />
      </View>

      <View style={styles.subjectStats}>
        <Text style={styles.subjectStatText}>
          {subject.questions_answered} answered
          {subject.target_count ? ` / ${subject.target_count}` : ''}
        </Text>
        <View style={styles.statDivider} />
        <Text style={styles.subjectStatText}>{subject.accuracy}% accuracy</Text>
        {subject.skipped_count > 0 ? (
          <>
            <View style={styles.statDivider} />
            <Text style={styles.subjectStatText}>{subject.skipped_count} skipped</Text>
          </>
        ) : null}
        <View style={styles.statDivider} />
        <Text style={styles.subjectStatText}>{formatClock(Math.floor(subject.elapsed_ms / 1000))}</Text>
      </View>
    </Animated.View>
  );
}

export default function ArenaSummaryScreen({ navigation, route }: any) {
  const summary: ArenaSummary | null = route.params?.summary || null;

  const mode = summary?.mode ? MODE_BY_ID[summary.mode] : null;
  const single = summary?.subjects.length === 1 ? (summary.subjects[0].subject as SubjectKey) : null;

  const goHome = () => navigation.navigate('ArenaHome');

  if (!summary) {
    return (
      <View style={styles.root}>
        <SubjectBackdrop color={DEFAULT_TINT} />
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <View style={styles.centered}>
            <Text style={styles.centeredTitle}>Session saved</Text>
            <Text style={styles.centeredText}>
              Your answers are in, but the summary could not be loaded this time.
            </Text>
            <PressableScale onPress={goHome} style={styles.primaryButton}>
              <Text style={styles.primaryText}>Back to Arena</Text>
            </PressableScale>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <SubjectBackdrop color={single ? tintFor(single) : DEFAULT_TINT} />

      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View entering={enter(0)} style={styles.titleBlock}>
            <Text style={styles.eyebrow}>{mode?.name.toUpperCase() || 'ARENA'}</Text>
            <Text style={styles.title}>Session complete</Text>
            <Text style={styles.subtitle}>
              {REASON_COPY[summary.ended_reason || 'manual'] || 'Session ended'}
            </Text>
          </Animated.View>

          <Animated.View entering={enter(1)} style={styles.statRow}>
            <StatTile
              label="answered"
              value={`${summary.questions_answered}`}
              icon={<Target color={TEXT_MUTED} size={15} strokeWidth={2} />}
            />
            <StatTile label="accuracy" value={`${summary.accuracy}%`} />
            <StatTile
              label="on the clock"
              value={formatClock(summary.duration_seconds)}
              icon={<Clock color={TEXT_MUTED} size={15} strokeWidth={2} />}
            />
          </Animated.View>

          <Animated.View entering={enter(2)} style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>By subject</Text>
            <Text style={styles.sectionMeta}>Mastery before → after</Text>
          </Animated.View>

          <View style={{ gap: GAP }}>
            {summary.subjects.map((subject, i) => (
              <SubjectCard key={subject.subject} subject={subject} index={i} />
            ))}
          </View>

          {summary.missed_questions.length > 0 && (
            <>
              <Animated.View entering={enter(7)} style={[styles.sectionHeader, { marginTop: SECTION_GAP }]}>
                <Text style={styles.sectionTitle}>Worth another look</Text>
                <Text style={styles.sectionMeta}>{summary.missed_questions.length} missed</Text>
              </Animated.View>

              <View style={{ gap: GAP }}>
                {summary.missed_questions.map((missed, i) => (
                  <Animated.View key={missed.question_id} entering={enter(8 + i)}>
                    <PressableScale
                      scaleTo={0.98}
                      style={styles.missedCard}
                      onPress={() =>
                        navigation.navigate('Profile', { screen: 'MistakeNotebookScreen' })
                      }
                    >
                      <View style={styles.missedTop}>
                        <View
                          style={[
                            styles.subjectDot,
                            { backgroundColor: SUBJECT_COLORS[missed.subject as SubjectKey] || TEXT_MUTED },
                          ]}
                        />
                        <Text style={styles.missedConcept} numberOfLines={1}>
                          {missed.concept_name || SUBJECT_LABELS[missed.subject as SubjectKey] || 'Question'}
                        </Text>
                      </View>
                      <Text style={styles.missedPrompt} numberOfLines={2}>
                        {missed.prompt}
                      </Text>
                    </PressableScale>
                  </Animated.View>
                ))}
              </View>
            </>
          )}
        </ScrollView>

        <View style={styles.footer}>
          <PressableScale
            onPress={() => navigation.navigate('Profile', { screen: 'MistakeNotebookScreen' })}
            scaleTo={0.97}
            style={styles.secondaryButton}
          >
            <Text style={styles.secondaryText}>Review misses</Text>
          </PressableScale>
          <PressableScale onPress={goHome} scaleTo={0.97} style={styles.primaryButtonInline}>
            <Text style={styles.primaryText}>Another run</Text>
          </PressableScale>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.hudjeeBgBase },
  safeArea: { flex: 1 },
  container: { flex: 1 },
  content: { paddingHorizontal: GUTTER, paddingTop: 16, paddingBottom: 32 },

  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: GUTTER, gap: 10 },
  centeredTitle: { color: TEXT, fontSize: 19, fontFamily: typography.bold },
  centeredText: { color: TEXT_MUTED, fontSize: 14, fontFamily: typography.regular, textAlign: 'center', lineHeight: 20 },

  titleBlock: { marginBottom: 26 },
  eyebrow: { color: TEXT_FAINT, fontSize: 10, fontFamily: typography.bold, letterSpacing: 1.4, marginBottom: 8 },
  title: { color: TEXT, fontSize: 28, fontFamily: typography.bold, letterSpacing: -0.4 },
  subtitle: { color: TEXT_MUTED, fontSize: 14, fontFamily: typography.regular, marginTop: 6 },

  statRow: { flexDirection: 'row', gap: GAP, marginBottom: SECTION_GAP },
  statTile: {
    flex: 1,
    backgroundColor: SURFACE,
    borderRadius: RADIUS,
    borderWidth: 1,
    borderColor: SURFACE_BORDER,
    paddingVertical: 16,
    paddingHorizontal: 14,
  },
  statIcon: { marginBottom: 10 },
  statValue: { color: TEXT, fontSize: 20, fontFamily: typography.bold, letterSpacing: -0.5 },
  statLabel: { color: TEXT_FAINT, fontSize: 11, fontFamily: typography.regular, marginTop: 3 },

  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 },
  sectionTitle: { color: TEXT, fontSize: 17, fontFamily: typography.semiBold, letterSpacing: -0.2 },
  sectionMeta: { color: TEXT_FAINT, fontSize: 12, fontFamily: typography.regular },

  subjectCard: {
    backgroundColor: SURFACE,
    borderRadius: RADIUS,
    borderWidth: 1,
    borderColor: SURFACE_BORDER,
    padding: 20,
  },
  subjectTop: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  subjectDot: { width: 7, height: 7, borderRadius: 3.5 },
  subjectName: { flex: 1, color: TEXT, fontSize: 16, fontFamily: typography.semiBold, letterSpacing: -0.2 },
  deltaPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999 },
  deltaText: { fontSize: 11, fontFamily: typography.bold },

  masteryRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginTop: 16, marginBottom: 12 },
  masteryFrom: { color: TEXT_FAINT, fontSize: 20, fontFamily: typography.semiBold, letterSpacing: -0.4 },
  masteryTo: { fontSize: 28, fontFamily: typography.bold, letterSpacing: -0.8 },
  masterySuffix: { color: TEXT_FAINT, fontSize: 12, fontFamily: typography.regular },

  track: { height: 6, borderRadius: 3, backgroundColor: TRACK, overflow: 'hidden' },
  trackFill: { height: '100%', borderRadius: 3 },

  subjectStats: { flexDirection: 'row', alignItems: 'center', gap: 9, marginTop: 14, flexWrap: 'wrap' },
  subjectStatText: { color: TEXT_FAINT, fontSize: 11, fontFamily: typography.regular },
  statDivider: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: 'rgba(255,255,255,0.18)' },

  missedCard: {
    backgroundColor: SURFACE,
    borderRadius: RADIUS,
    borderWidth: 1,
    borderColor: SURFACE_BORDER,
    padding: 16,
  },
  missedTop: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  missedConcept: { flex: 1, color: TEXT_MUTED, fontSize: 11, fontFamily: typography.semiBold, letterSpacing: 0.6 },
  missedPrompt: { color: TEXT, fontSize: 14, fontFamily: typography.regular, lineHeight: 20 },

  footer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: GUTTER,
    paddingTop: 12,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: SURFACE_BORDER,
    backgroundColor: 'rgba(11,11,12,0.86)',
  },
  secondaryButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 15,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: SURFACE_BORDER,
    backgroundColor: SURFACE,
  },
  secondaryText: { color: TEXT, fontSize: 14, fontFamily: typography.semiBold },
  primaryButton: { paddingHorizontal: 26, paddingVertical: 14, borderRadius: 999, backgroundColor: '#F5F5F7', marginTop: 8 },
  primaryButtonInline: { flex: 1, alignItems: 'center', paddingVertical: 15, borderRadius: 999, backgroundColor: '#F5F5F7' },
  primaryText: { color: '#0B0B0C', fontSize: 14, fontFamily: typography.bold },
});
