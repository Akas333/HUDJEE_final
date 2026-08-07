import React, { useCallback } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Animated from 'react-native-reanimated';
import {
  Bell,
  BookOpen,
  Flame,
  Gauge,
  Settings,
  Swords,
  Target,
  Trophy,
} from 'lucide-react-native';

import PressableScale from '../../components/PressableScale';
import Screen from '../../components/ui/Screen';
import ScreenHeader from '../../components/ui/ScreenHeader';
import SectionHeader from '../../components/ui/SectionHeader';
import SettingsGroup from '../../components/settings/SettingsGroup';
import SettingsRow from '../../components/settings/SettingsRow';
import { StatTile } from '../../components/StatTile';
import { useAuthStore } from '../../store/authStore';
import { useHomeStore } from '../../store/homeStore';
import { typography } from '../../theme/typography';
import { CHALLENGE_TINT } from '../../theme/challenges';
import {
  CAUTION,
  enter,
  GAP,
  GLASS,
  GLASS_BORDER,
  GRADIENT,
  POSITIVE,
  PROFILE_TINT,
  RADIUS,
  SURFACE,
  SURFACE_BORDER,
  TEXT,
  TEXT_FAINT,
  TEXT_MUTED,
} from '../../theme/ui';

// Profile used to invent its own student — "Aspirant_123", a twelve-day streak,
// 68% accuracy, an arena rating of 1450 — none of which came from anywhere. It
// reads from the same snapshot Home does now, so the two tabs cannot disagree
// about the same student, and shows an em dash where a number does not exist yet
// rather than a plausible-looking lie.

const DASH = '—';

export default function ProfileScreen({ navigation }: any) {
  const account = useAuthStore((s) => s.user ?? s.session?.user ?? null);
  const snapshot = useHomeStore((s) => s.snapshot);
  const load = useHomeStore((s) => s.load);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const email = account?.email ?? null;
  const displayName =
    snapshot?.displayName ?? (email ? email.split('@')[0] : null) ?? 'Student';
  const initial = displayName.trim().charAt(0).toUpperCase() || 'H';

  const streak = snapshot ? `${snapshot.streakDays}` : DASH;
  const accuracy =
    snapshot?.accuracyPct != null ? `${Math.round(snapshot.accuracyPct)}%` : DASH;
  const readiness = snapshot ? `${Math.round(snapshot.readinessScore)}` : DASH;

  return (
    <Screen tint={PROFILE_TINT}>
      <ScreenHeader
        title="Profile"
        subtitle={
          snapshot?.hasActivity === false
            ? 'Your numbers fill in once you have practised.'
            : undefined
        }
        action={
          <PressableScale
            scaleTo={0.9}
            style={styles.iconButton}
            onPress={() => navigation.navigate('SettingsStack')}
            accessibilityLabel="Settings"
          >
            <Settings color={TEXT_MUTED} size={19} strokeWidth={1.8} />
          </PressableScale>
        }
        leading={
          <Animated.View entering={enter(2)} style={styles.identityCard}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initial}</Text>
            </View>

            <View style={styles.identityText}>
              <Text style={styles.name} numberOfLines={1}>
                {displayName}
              </Text>
              <Text style={styles.handle} numberOfLines={1}>
                {account?.is_anonymous ? 'Guest session' : email ?? 'Signed in'}
              </Text>
            </View>

            {snapshot?.readinessBand ? (
              <View style={styles.bandPill}>
                <Gauge color={GRADIENT[0]} size={12} strokeWidth={2.2} />
                <Text style={styles.bandText} numberOfLines={1}>
                  {snapshot.readinessBand}
                </Text>
              </View>
            ) : null}
          </Animated.View>
        }
      />

      <Animated.View entering={enter(3)}>
        <SectionHeader title="Where you stand" meta={snapshot ? 'Live' : 'Loading'} />
      </Animated.View>

      <Animated.View entering={enter(4)} style={styles.statsRow}>
        <StatTile
          label="Streak"
          value={streak}
          caption={snapshot?.streakDays === 1 ? 'day' : 'days'}
          icon={Flame}
          accent={CAUTION}
        />
        <StatTile
          label="Accuracy"
          value={accuracy}
          caption="all time"
          icon={Target}
          accent={POSITIVE}
        />
        <StatTile
          label="Readiness"
          value={readiness}
          caption={snapshot?.readinessBand?.toLowerCase()}
          icon={Trophy}
          accent={GRADIENT[1]}
        />
      </Animated.View>

      <Animated.View entering={enter(5)} style={styles.sectionSpacer}>
        <SectionHeader title="Tools" />
      </Animated.View>

      <SettingsGroup index={4}>
        <SettingsRow
          icon={BookOpen}
          accent={CHALLENGE_TINT}
          title="Mistake notebook"
          subtitle="Everything that caught you out, ready to re-practise"
          onPress={() => navigation.navigate('MistakeNotebookScreen')}
        />
        <SettingsRow
          icon={Bell}
          title="Notifications"
          subtitle="Streaks, challenges and rating changes"
          onPress={() => navigation.navigate('NotificationsScreen')}
        />
        <SettingsRow
          icon={Swords}
          accent={CHALLENGE_TINT}
          title="Challenge history"
          subtitle="Every challenge that has closed"
          onPress={() =>
            navigation.navigate('Challenges', { screen: 'ChallengeHistory' })
          }
        />
      </SettingsGroup>

      <SettingsGroup index={5}>
        <SettingsRow
          icon={Settings}
          title="Settings"
          subtitle="Account, privacy, data and the way out"
          onPress={() => navigation.navigate('SettingsStack')}
        />
      </SettingsGroup>
    </Screen>
  );
}

const styles = StyleSheet.create({
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: GLASS,
    borderWidth: 1,
    borderColor: GLASS_BORDER,
    justifyContent: 'center',
    alignItems: 'center',
  },

  identityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: SURFACE,
    borderRadius: RADIUS,
    borderWidth: 1,
    borderColor: SURFACE_BORDER,
    padding: 18,
    marginBottom: 30,
  },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: `${GRADIENT[0]}1F`,
    borderWidth: 1,
    borderColor: `${GRADIENT[0]}3D`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { color: GRADIENT[0], fontSize: 22, fontFamily: typography.bold },
  identityText: { flex: 1, gap: 3 },
  name: { color: TEXT, fontSize: 17, fontFamily: typography.semiBold, letterSpacing: -0.3 },
  handle: { color: TEXT_FAINT, fontSize: 12, fontFamily: typography.regular },
  bandPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: `${GRADIENT[0]}14`,
    borderWidth: 1,
    borderColor: `${GRADIENT[0]}30`,
  },
  bandText: { color: GRADIENT[0], fontSize: 11, fontFamily: typography.semiBold },

  statsRow: { flexDirection: 'row', gap: GAP, marginBottom: 30 },
  sectionSpacer: { marginTop: 2 },
});
