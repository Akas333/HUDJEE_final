import React from 'react';
import { View, Text, StyleSheet, ScrollView, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Bell, ChevronRight, Gauge } from 'lucide-react-native';

import PressableScale from '../../components/PressableScale';
import SubjectBackdrop from '../../components/SubjectBackdrop';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { DEFAULT_TINT } from '../../theme/subjects';
import {
  ARENA_MODES,
  ArenaMode,
  GAP,
  GUTTER,
  RADIUS,
  SURFACE,
  SURFACE_BORDER,
  TEXT,
  TEXT_FAINT,
  TEXT_MUTED,
} from '../../theme/arena';

// Entrance timing, matching Practice: cards settle in sequence rather than all
// arriving at once.
const enter = (index: number) =>
  FadeInDown.springify().damping(18).mass(0.6).delay(Math.min(index, 10) * 40);

function ModeCard({ mode, index, onPress }: { mode: ArenaMode; index: number; onPress: () => void }) {
  const Icon = mode.icon;

  return (
    <Animated.View entering={enter(3 + index)}>
      <PressableScale onPress={onPress} style={styles.card} scaleTo={0.97}>
        <View style={styles.cardTop}>
          <View
            style={[
              styles.iconBadge,
              { backgroundColor: `${mode.accent}22`, borderColor: `${mode.accent}44` },
            ]}
          >
            <Icon color={mode.accent} size={20} strokeWidth={2} />
          </View>

          <View style={styles.cardTitleGroup}>
            <Text style={styles.cardTitle}>{mode.name}</Text>
            <View style={styles.metaRow}>
              <View style={[styles.metaDot, { backgroundColor: mode.accent }]} />
              <Text style={styles.metaText}>{mode.meta}</Text>
            </View>
          </View>

          <ChevronRight color={TEXT_FAINT} size={18} strokeWidth={2} />
        </View>

        <Text style={styles.cardTagline}>{mode.tagline}</Text>
      </PressableScale>
    </Animated.View>
  );
}

/**
 * The Arena tab lands on a choice of format, not on a session. Which of the four
 * a student wants says more about their intent right now — grind, sprint, hit a
 * number, sit a paper — than any single "start" button could.
 */
export default function ArenaScreen({ navigation }: any) {
  return (
    <View style={styles.root}>
      {/* Arena is not scoped to one subject until the student picks chapters, so
          the landing screen wears the brand tint rather than a subject's. */}
      <SubjectBackdrop color={DEFAULT_TINT} />

      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View entering={enter(0)} style={styles.header}>
            <Image source={require('../../../assets/logo.png')} style={styles.logo} resizeMode="contain" />
            <PressableScale
              scaleTo={0.9}
              style={styles.iconButton}
              onPress={() => navigation.navigate('Profile', { screen: 'NotificationsScreen' })}
            >
              <Bell color={TEXT_MUTED} size={19} strokeWidth={1.8} />
            </PressableScale>
          </Animated.View>

          <Animated.View entering={enter(1)} style={styles.titleBlock}>
            <Text style={styles.title}>Arena</Text>
            <Text style={styles.subtitle}>Pick a format, then choose what to be tested on</Text>
          </Animated.View>

          <Animated.View entering={enter(2)} style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Modes</Text>
            <Text style={styles.sectionMeta}>{ARENA_MODES.length} formats</Text>
          </Animated.View>

          <View style={{ gap: GAP }}>
            {ARENA_MODES.map((mode, i) => (
              <ModeCard
                key={mode.id}
                mode={mode}
                index={i}
                onPress={() => navigation.navigate('ArenaSetup', { modeId: mode.id })}
              />
            ))}
          </View>

          <Animated.View entering={enter(8)} style={styles.footerNote}>
            <Gauge color={TEXT_FAINT} size={14} strokeWidth={1.8} />
            <Text style={styles.footerText}>Every subject keeps its own live difficulty</Text>
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.hudjeeBgBase },
  safeArea: { flex: 1 },
  container: { flex: 1 },
  content: { paddingHorizontal: GUTTER, paddingTop: 8, paddingBottom: 48 },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 },
  logo: { width: 120, height: 30, tintColor: '#FFFFFF' },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: SURFACE_BORDER,
    justifyContent: 'center',
    alignItems: 'center',
  },

  titleBlock: { marginBottom: 32 },
  title: { color: TEXT, fontSize: 28, fontFamily: typography.bold, letterSpacing: -0.4 },
  subtitle: { color: TEXT_MUTED, fontSize: 15, fontFamily: typography.regular, marginTop: 6 },

  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 16 },
  sectionTitle: { color: TEXT, fontSize: 17, fontFamily: typography.semiBold, letterSpacing: -0.2 },
  sectionMeta: { color: TEXT_FAINT, fontSize: 12, fontFamily: typography.regular },

  card: {
    backgroundColor: SURFACE,
    borderRadius: RADIUS,
    borderWidth: 1,
    borderColor: SURFACE_BORDER,
    padding: 20,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center' },
  iconBadge: {
    width: 42,
    height: 42,
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  cardTitleGroup: { flex: 1, paddingRight: 12 },
  cardTitle: { color: TEXT, fontSize: 18, fontFamily: typography.semiBold, letterSpacing: -0.3 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 5 },
  metaDot: { width: 5, height: 5, borderRadius: 2.5 },
  metaText: { color: TEXT_MUTED, fontSize: 10, fontFamily: typography.semiBold, letterSpacing: 1 },
  cardTagline: {
    color: TEXT_MUTED,
    fontSize: 13,
    fontFamily: typography.regular,
    lineHeight: 20,
    marginTop: 16,
  },

  footerNote: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, marginTop: 28 },
  footerText: { color: TEXT_FAINT, fontSize: 12, fontFamily: typography.regular },
});
