import React, { useCallback } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Check } from 'lucide-react-native';

import SubjectBackdrop from '../../components/SubjectBackdrop';
import Skeleton from '../../components/Skeleton';
import ChallengeHeader from '../../components/challenges/ChallengeHeader';
import StreakGauge, { streakBandLabel } from '../../components/challenges/StreakGauge';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { withAlpha } from '../../theme/subjects';
import {
  AT_RISK,
  CHALLENGE_TINT,
  GAP,
  GUTTER,
  RADIUS,
  SECTION_GAP,
  SURFACE,
  SURFACE_BORDER,
  TEXT,
  TEXT_FAINT,
  TEXT_MUTED,
  nextStreakMilestone,
} from '../../theme/challenges';
import { useChallengesStore } from '../../store/challengesStore';
import { StreakDay } from '../../services/challengesApi';

// The streak, in full. Five Sunday-aligned weeks rather than a scrolling year:
// the question this screen answers is "am I keeping this up?", and that is a
// month-shaped question.

const enter = (index: number) =>
  FadeInDown.springify().damping(18).mass(0.6).delay(Math.min(index, 8) * 45);

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export default function StreakDetailScreen({ navigation }: any) {
  const streak = useChallengesStore((s) => s.streak);
  const load = useChallengesStore((s) => s.load);

  useFocusEffect(
    useCallback(() => {
      if (!streak) load();
    }, [streak, load])
  );

  const days = streak?.current ?? 0;
  const atRisk = !!streak?.atRisk;

  // Five rows of seven, oldest first — the API hands the grid over already
  // aligned so the columns line up under the weekday letters.
  const weeks: StreakDay[][] = [];
  if (streak) {
    for (let i = 0; i < streak.calendar.length; i += 7) {
      weeks.push(streak.calendar.slice(i, i + 7));
    }
  }

  const activeDays = streak?.calendar.filter((d) => d.active).length ?? 0;

  return (
    <View style={styles.root}>
      <SubjectBackdrop color={CHALLENGE_TINT} />

      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <ChallengeHeader
            eyebrow="STREAK LEDGER"
            title={days > 0 ? `${days} day${days === 1 ? '' : 's'}` : 'No streak yet'}
            subtitle={
              atRisk
                ? "Nothing logged today yet — one set keeps the run alive."
                : days > 0
                  ? streakBandLabel(days)
                  : 'Answer a few questions today and the count starts.'
            }
            onBack={() => navigation.goBack()}
          />

          {!streak ? (
            <Skeleton width="100%" height={196} borderRadius={RADIUS} />
          ) : (
            <Animated.View entering={enter(2)} style={styles.gaugeCard}>
              <StreakGauge days={days} atRisk={atRisk} size={132} stroke={11} />
              <Text style={styles.gaugeCaption}>
                {days > 0
                  ? `${nextStreakMilestone(days) - days} day${
                      nextStreakMilestone(days) - days === 1 ? '' : 's'
                    } to ${nextStreakMilestone(days)}`
                  : 'First day is the hard one'}
              </Text>
            </Animated.View>
          )}

          <Animated.View entering={enter(3)} style={styles.statRow}>
            <Stat label="current" value={`${days}`} />
            <Stat label="best run" value={`${streak?.longest ?? 0}`} />
            <Stat label="active in 5 weeks" value={`${activeDays}`} />
          </Animated.View>

          {/* Calendar */}
          <Animated.View entering={enter(4)} style={styles.calendarCard}>
            <View style={styles.weekdayRow}>
              {WEEKDAYS.map((label, i) => (
                <Text key={`${label}-${i}`} style={styles.weekdayLabel}>
                  {label}
                </Text>
              ))}
            </View>

            {weeks.map((week, wi) => (
              <View key={wi} style={styles.weekRow}>
                {week.map((day) => (
                  <View key={day.key} style={styles.dayCell}>
                    <View
                      style={[
                        styles.dayGlyph,
                        day.active && styles.dayGlyphActive,
                        day.isFuture && styles.dayGlyphFuture,
                        day.isToday && styles.dayGlyphToday,
                      ]}
                    >
                      {day.active ? <Check color="#0B0B0C" size={13} strokeWidth={3} /> : null}
                    </View>
                    <Text style={[styles.dayNum, day.isToday && styles.dayNumToday]}>
                      {new Date(day.date).getDate()}
                    </Text>
                  </View>
                ))}
              </View>
            ))}
          </Animated.View>

          <Animated.View entering={enter(5)} style={styles.noteCard}>
            <Text style={styles.noteTitle}>What keeps it going</Text>
            <Text style={styles.noteText}>
              Any answering counts: a Practice session, an Arena run, or finishing a challenge set.
              One question is enough to mark the day — the streak measures showing up, not volume.
            </Text>
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.hudjeeBgBase },
  safeArea: { flex: 1 },
  content: { paddingHorizontal: GUTTER, paddingTop: 8, paddingBottom: 48 },

  gaugeCard: {
    alignItems: 'center',
    gap: 16,
    backgroundColor: SURFACE,
    borderRadius: RADIUS,
    borderWidth: 1,
    borderColor: SURFACE_BORDER,
    paddingVertical: 26,
  },
  gaugeCaption: { color: TEXT_MUTED, fontSize: 13, fontFamily: typography.regular },

  statRow: { flexDirection: 'row', gap: GAP, marginTop: GAP },
  stat: {
    flex: 1,
    backgroundColor: SURFACE,
    borderRadius: RADIUS,
    borderWidth: 1,
    borderColor: SURFACE_BORDER,
    paddingVertical: 16,
    paddingHorizontal: 14,
  },
  statValue: { color: TEXT, fontSize: 20, fontFamily: typography.bold, letterSpacing: -0.5 },
  statLabel: { color: TEXT_FAINT, fontSize: 11, fontFamily: typography.regular, marginTop: 3 },

  calendarCard: {
    backgroundColor: SURFACE,
    borderRadius: RADIUS,
    borderWidth: 1,
    borderColor: SURFACE_BORDER,
    padding: 16,
    marginTop: SECTION_GAP,
  },
  weekdayRow: { flexDirection: 'row', marginBottom: 10 },
  weekdayLabel: {
    flex: 1,
    color: TEXT_FAINT,
    fontSize: 10,
    fontFamily: typography.semiBold,
    textAlign: 'center',
    letterSpacing: 0.6,
  },
  weekRow: { flexDirection: 'row', marginBottom: 8 },
  dayCell: { flex: 1, alignItems: 'center', gap: 4 },
  dayGlyph: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayGlyphActive: { backgroundColor: '#FFFFFF', borderColor: '#FFFFFF' },
  // A day that has not happened yet is drawn but not claimed either way.
  dayGlyphFuture: { backgroundColor: 'transparent', borderColor: 'rgba(255,255,255,0.07)' },
  dayGlyphToday: { borderColor: withAlpha(AT_RISK, 0.7), borderWidth: 2 },
  dayNum: { color: TEXT_FAINT, fontSize: 9, fontFamily: typography.regular },
  dayNumToday: { color: TEXT_MUTED, fontFamily: typography.semiBold },

  noteCard: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: SURFACE_BORDER,
    padding: 18,
    marginTop: SECTION_GAP,
  },
  noteTitle: { color: TEXT, fontSize: 14, fontFamily: typography.semiBold, marginBottom: 6 },
  noteText: { color: TEXT_MUTED, fontSize: 12, fontFamily: typography.regular, lineHeight: 19 },
});
