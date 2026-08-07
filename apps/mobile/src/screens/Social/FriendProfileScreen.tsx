import React, { useCallback } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { BellOff, Swords, UserMinus } from 'lucide-react-native';

import PressableScale from '../../components/PressableScale';
import SubjectBackdrop from '../../components/SubjectBackdrop';
import Avatar from '../../components/challenges/Avatar';
import ChallengeHeader from '../../components/challenges/ChallengeHeader';
import ChallengeTicket from '../../components/challenges/ChallengeTicket';
import { useToastStore } from '../../services/ToastService';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { withAlpha } from '../../theme/subjects';
import {
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
} from '../../theme/challenges';
import { useChallengesStore } from '../../store/challengesStore';
import { displayName, resultsUnlocked } from '../../services/challengesApi';

// One friend: where the two of you stand, everything you have played, and the
// three switches that matter — challenge them, stop them challenging you, or
// remove them entirely.

const enter = (index: number) =>
  FadeInDown.springify().damping(18).mass(0.6).delay(Math.min(index, 8) * 45);

export default function FriendProfileScreen({ navigation, route }: any) {
  const userId: string = route.params?.userId;
  const fallbackName: string | undefined = route.params?.username;

  const friends = useChallengesStore((s) => s.friends);
  const matches = useChallengesStore((s) => s.matches);
  const leaderboard = useChallengesStore((s) => s.leaderboard);
  const headToHead = useChallengesStore((s) => s.headToHead);
  const loadHeadToHead = useChallengesStore((s) => s.loadHeadToHead);
  const toggleMute = useChallengesStore((s) => s.toggleMute);
  const dropFriend = useChallengesStore((s) => s.dropFriend);

  const friend = friends.find((f) => f.userId === userId) || null;
  const name = displayName(friend?.username || fallbackName);
  const record = headToHead[userId];
  // Their week, if this screen was reached from a board that already has it.
  const board = leaderboard.find((r) => r.userId === userId) || null;

  useFocusEffect(
    useCallback(() => {
      loadHeadToHead(userId);
    }, [userId, loadHeadToHead])
  );

  const shared = matches.filter((m) => m.opponentId === userId);
  const played = shared.filter((m) => resultsUnlocked(m));

  const isFriend = friend?.status === 'accepted';

  const onRemove = () => {
    if (!friend) return;
    dropFriend(friend.friendshipId);
    useToastStore.getState().showToast(`${name} removed`);
    navigation.goBack();
  };

  return (
    <View style={styles.root}>
      <SubjectBackdrop color={CHALLENGE_TINT} />

      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <ChallengeHeader title={name} onBack={() => navigation.goBack()} />

          {/* Who, and the record between you */}
          <Animated.View entering={enter(2)} style={styles.heroCard}>
            <Avatar username={friend?.username || fallbackName} size={64} />

            <Text style={styles.heroName} numberOfLines={1}>
              {name}
            </Text>
            <Text style={styles.heroMeta}>
              {friend ? `Level ${friend.level}` : 'Not on your roster'}
              {board ? ` · ${board.questions} question${board.questions === 1 ? '' : 's'} this week` : ''}
            </Text>

            {record ? (
              <View style={styles.recordRow}>
                <View style={styles.recordCell}>
                  <Text style={styles.recordValue}>{record.wins}</Text>
                  <Text style={styles.recordLabel}>you won</Text>
                </View>
                <View style={styles.recordDivider} />
                <View style={styles.recordCell}>
                  <Text style={styles.recordValue}>{record.losses}</Text>
                  <Text style={styles.recordLabel}>they won</Text>
                </View>
                <View style={styles.recordDivider} />
                <View style={styles.recordCell}>
                  <Text style={styles.recordValue}>{record.draws}</Text>
                  <Text style={styles.recordLabel}>drawn</Text>
                </View>
              </View>
            ) : null}

            <Text style={styles.heroVerdict}>
              {!record || record.wins + record.losses + record.draws === 0
                ? "You haven't finished a challenge against each other yet."
                : record.wins === record.losses
                  ? `Level with ${name}.`
                  : record.wins > record.losses
                    ? `You lead ${name} ${record.wins}–${record.losses}.`
                    : `${name} leads you ${record.losses}–${record.wins}.`}
            </Text>
          </Animated.View>

          {/* Actions */}
          {isFriend ? (
            <Animated.View entering={enter(3)} style={styles.actionRow}>
              <PressableScale
                scaleTo={0.97}
                style={styles.primaryButton}
                onPress={() => navigation.navigate('ChallengeCompose', { opponentId: userId })}
              >
                <Swords color="#0B0B0C" size={16} strokeWidth={2.2} />
                <Text style={styles.primaryText}>Challenge</Text>
              </PressableScale>

              <PressableScale
                scaleTo={0.94}
                style={[styles.iconButton, friend!.muted && styles.iconButtonActive]}
                onPress={() => toggleMute(userId, !friend!.muted)}
                accessibilityLabel={friend!.muted ? 'Unmute their challenges' : 'Mute their challenges'}
              >
                <BellOff color={friend!.muted ? TEXT : TEXT_MUTED} size={17} strokeWidth={2} />
              </PressableScale>

              <PressableScale
                scaleTo={0.94}
                style={styles.iconButton}
                onPress={onRemove}
                accessibilityLabel={`Remove ${name}`}
              >
                <UserMinus color={TEXT_MUTED} size={17} strokeWidth={2} />
              </PressableScale>
            </Animated.View>
          ) : null}

          {friend?.muted ? (
            <Animated.View entering={enter(4)} style={styles.mutedCard}>
              <Text style={styles.mutedText}>
                Muted — {name} can't send you challenges. You can still send them one.
              </Text>
            </Animated.View>
          ) : null}

          {/* Everything you have played */}
          <Animated.View entering={enter(5)} style={{ marginTop: SECTION_GAP }}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Between you</Text>
              {shared.length > 0 ? (
                <Text style={styles.sectionMeta}>
                  {played.length} finished
                  {shared.length > played.length ? ` · ${shared.length - played.length} open` : ''}
                </Text>
              ) : null}
            </View>

            {shared.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyText}>
                  No challenges yet. Five questions is a two-minute job — send one.
                </Text>
              </View>
            ) : (
              <View style={{ gap: GAP }}>
                {shared.map((match) => (
                  <ChallengeTicket
                    key={match.id}
                    match={match}
                    onPress={() =>
                      navigation.navigate(
                        resultsUnlocked(match) ? 'ChallengeResult' : 'ChallengeDetail',
                        { matchId: match.id }
                      )
                    }
                  />
                ))}
              </View>
            )}
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

  heroCard: {
    alignItems: 'center',
    backgroundColor: SURFACE,
    borderRadius: RADIUS,
    borderWidth: 1,
    borderColor: SURFACE_BORDER,
    padding: 24,
  },
  heroName: { color: TEXT, fontSize: 21, fontFamily: typography.bold, letterSpacing: -0.4, marginTop: 14 },
  heroMeta: { color: TEXT_MUTED, fontSize: 12, fontFamily: typography.regular, marginTop: 5 },

  recordRow: { flexDirection: 'row', alignItems: 'center', gap: 18, marginTop: 20 },
  recordCell: { alignItems: 'center' },
  recordValue: { color: TEXT, fontSize: 24, fontFamily: typography.bold, letterSpacing: -0.6 },
  recordLabel: { color: TEXT_FAINT, fontSize: 10, fontFamily: typography.regular, marginTop: 3 },
  recordDivider: { width: 1, height: 26, backgroundColor: SURFACE_BORDER },

  heroVerdict: {
    color: TEXT_MUTED,
    fontSize: 13,
    fontFamily: typography.regular,
    textAlign: 'center',
    lineHeight: 19,
    marginTop: 18,
  },

  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: GAP },
  primaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 15,
    borderRadius: 999,
    backgroundColor: '#F5F5F7',
  },
  primaryText: { color: '#0B0B0C', fontSize: 14, fontFamily: typography.bold },
  iconButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: SURFACE_BORDER,
    backgroundColor: SURFACE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconButtonActive: {
    backgroundColor: withAlpha(CHALLENGE_TINT, 0.24),
    borderColor: withAlpha(CHALLENGE_TINT, 0.5),
  },

  mutedCard: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: SURFACE_BORDER,
    padding: 14,
    marginTop: GAP,
  },
  mutedText: { color: TEXT_MUTED, fontSize: 12, fontFamily: typography.regular, lineHeight: 18 },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 14,
  },
  sectionTitle: { color: TEXT, fontSize: 17, fontFamily: typography.semiBold, letterSpacing: -0.2 },
  sectionMeta: { color: TEXT_FAINT, fontSize: 12, fontFamily: typography.regular },

  emptyCard: {
    backgroundColor: SURFACE,
    borderRadius: RADIUS,
    borderWidth: 1,
    borderColor: SURFACE_BORDER,
    padding: 20,
  },
  emptyText: { color: TEXT_MUTED, fontSize: 13, fontFamily: typography.regular, lineHeight: 20 },
});
