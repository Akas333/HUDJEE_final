import React, { useCallback, useEffect } from 'react';
import { Dimensions, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Animated, {
  FadeInDown,
  SharedValue,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { Bell, ChevronRight, Plus, Swords, UserPlus, Users } from 'lucide-react-native';

import PressableScale from '../../components/PressableScale';
import SubjectBackdrop from '../../components/SubjectBackdrop';
import Skeleton from '../../components/Skeleton';
import Avatar from '../../components/challenges/Avatar';
import ChallengeTicket from '../../components/challenges/ChallengeTicket';
import LedgerRow from '../../components/challenges/LedgerRow';
import StreakGauge, { streakBandLabel } from '../../components/challenges/StreakGauge';
import { HapticService } from '../../services/HapticService';
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
} from '../../theme/challenges';
import { useChallengesStore } from '../../store/challengesStore';
import { displayName } from '../../services/challengesApi';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - GUTTER * 2;

const enter = (index: number) =>
  FadeInDown.springify().damping(18).mass(0.6).delay(Math.min(index, 10) * 40);

/** After this hour, a day with nothing logged starts asking to be noticed. */
const AT_RISK_HOUR = 21;

const LEADERBOARD_PREVIEW = 5;
const HISTORY_PREVIEW = 3;

// ─── leaderboard scope switcher ──────────────────────────────────────────────
// The same sliding-indicator pill Practice uses for subjects, at two segments.

const SCOPES: Array<'friends' | 'global'> = ['friends', 'global'];
const SCOPE_LABELS = { friends: 'Friends', global: 'Global' };
const SEG_PAD = 4;
const SEG_WIDTH = (CARD_WIDTH - SEG_PAD * 2) / SCOPES.length;

function ScopeTabs({ active, onChange }: { active: number; onChange: (i: number) => void }) {
  const pos = useSharedValue(active);

  useEffect(() => {
    pos.value = withSpring(active, { damping: 18, stiffness: 180, mass: 0.7 });
  }, [active]);

  const indicator = useAnimatedStyle(() => ({
    transform: [{ translateX: pos.value * SEG_WIDTH }],
  }));

  return (
    <View style={styles.segment}>
      <Animated.View style={[styles.segmentIndicator, indicator]} />
      {SCOPES.map((scope, i) => (
        <ScopeTab
          key={scope}
          label={SCOPE_LABELS[scope]}
          index={i}
          pos={pos}
          onPress={() => onChange(i)}
        />
      ))}
    </View>
  );
}

function ScopeTab({
  label,
  index,
  pos,
  onPress,
}: {
  label: string;
  index: number;
  pos: SharedValue<number>;
  onPress: () => void;
}) {
  const textStyle = useAnimatedStyle(() => {
    const distance = Math.min(Math.abs(pos.value - index), 1);
    return { color: interpolateColor(distance, [0, 1], [TEXT, TEXT_MUTED]) };
  });

  return (
    <Pressable
      style={styles.segmentTab}
      onPress={() => {
        HapticService.light();
        onPress();
      }}
    >
      <Animated.Text style={[styles.segmentLabel, textStyle]}>{label}</Animated.Text>
    </Pressable>
  );
}

function SectionHeader({
  title,
  meta,
  actionLabel,
  onAction,
}: {
  title: string;
  meta?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {actionLabel && onAction ? (
        <PressableScale onPress={onAction} scaleTo={0.94} hitSlop={10} style={styles.sectionAction}>
          <Text style={styles.sectionActionText}>{actionLabel}</Text>
          <ChevronRight color={TEXT_MUTED} size={15} strokeWidth={2} />
        </PressableScale>
      ) : meta ? (
        <Text style={styles.sectionMeta}>{meta}</Text>
      ) : null}
    </View>
  );
}

// ─── screen ──────────────────────────────────────────────────────────────────

export default function ChallengesScreen({ navigation }: any) {
  const streak = useChallengesStore((s) => s.streak);
  const loading = useChallengesStore((s) => s.loading);
  const error = useChallengesStore((s) => s.error);
  const load = useChallengesStore((s) => s.load);
  const leaderboard = useChallengesStore((s) => s.leaderboard);
  const scope = useChallengesStore((s) => s.leaderboardScope);
  const setScope = useChallengesStore((s) => s.setLeaderboardScope);

  const activeMatches = useChallengesStore((s) => s.activeMatches);
  const historyMatches = useChallengesStore((s) => s.historyMatches);
  const acceptedFriends = useChallengesStore((s) => s.acceptedFriends);
  const incomingRequests = useChallengesStore((s) => s.incomingRequests);

  // Same contract as Home: the tab refreshes quietly on focus, with no
  // pull-to-refresh spinner firing mid-scroll.
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const active = activeMatches();
  const history = historyMatches();
  const friends = acceptedFriends();
  const requests = incomingRequests();

  const showSkeleton = loading && !streak;
  const hasFriends = friends.length > 0;

  // The gauge keeps its last known value across refreshes — it is the one number
  // students open this tab to check, so it never waits on the network.
  const streakDays = streak?.current ?? 0;
  const atRisk = !!streak?.atRisk;
  const showRiskBanner = atRisk && new Date().getHours() >= AT_RISK_HOUR;

  const openCompose = (params?: object) =>
    navigation.navigate('ChallengeCompose', params ?? {});

  return (
    <View style={styles.root}>
      {/* Challenges is not scoped to a subject, so it holds its own tint rather
          than borrowing whichever one Practice was last on. */}
      <SubjectBackdrop color={CHALLENGE_TINT} />

      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <Animated.View entering={enter(0)} style={styles.header}>
            <Image
              source={require('../../../assets/logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
            <View style={styles.headerActions}>
              <PressableScale
                scaleTo={0.9}
                style={styles.iconButton}
                onPress={() => openCompose()}
                accessibilityLabel="New challenge"
              >
                <Plus color={TEXT} size={20} strokeWidth={2.2} />
              </PressableScale>
              <PressableScale
                scaleTo={0.9}
                style={styles.iconButton}
                onPress={() => navigation.navigate('Profile', { screen: 'NotificationsScreen' })}
                accessibilityLabel="Notifications"
              >
                <Bell color={TEXT_MUTED} size={19} strokeWidth={1.8} />
                {requests.length > 0 ? <View style={styles.badge} /> : null}
              </PressableScale>
            </View>
          </Animated.View>

          <Animated.View entering={enter(1)} style={styles.titleBlock}>
            <Text style={styles.title}>Challenges</Text>
            <Text style={styles.subtitle}>Keep your friends honest — and your streak alive</Text>
          </Animated.View>

          {error && !streak ? (
            <Animated.View entering={enter(2)} style={styles.errorCard}>
              <Text style={styles.errorTitle}>Couldn't load Challenges</Text>
              <Text style={styles.errorText}>{error}</Text>
              <PressableScale style={styles.retryButton} onPress={load} scaleTo={0.94}>
                <Text style={styles.retryText}>Try again</Text>
              </PressableScale>
            </Animated.View>
          ) : null}

          {/* Streak at risk — present but non-blocking, and never guilt-framed. */}
          {showRiskBanner ? (
            <Animated.View entering={enter(2)} style={styles.riskBanner}>
              <Text style={styles.riskText}>
                Your streak's on the line today — one set keeps it.
              </Text>
            </Animated.View>
          ) : null}

          {/* Streak ledger */}
          <Animated.View entering={enter(3)}>
            {showSkeleton ? (
              <Skeleton width="100%" height={168} borderRadius={RADIUS} style={{ marginBottom: SECTION_GAP }} />
            ) : (
              <PressableScale
                scaleTo={0.98}
                style={styles.streakCard}
                onPress={() => navigation.navigate('StreakDetail')}
                accessibilityLabel={`Streak ledger. ${streakDays} days.`}
              >
                <View style={styles.streakTextCol}>
                  <Text style={styles.streakLabel}>STREAK LEDGER</Text>
                  <Text style={styles.streakHeadline}>
                    {streakDays > 0 ? `${streakDays} day${streakDays === 1 ? '' : 's'} running` : 'No streak yet'}
                  </Text>
                  <Text style={styles.streakCaption}>
                    {streakDays > 0
                      ? streakBandLabel(streakDays)
                      : 'One session today starts the count'}
                  </Text>

                  <View style={styles.streakMetaRow}>
                    <Text style={styles.streakMetaText}>Best {streak?.longest ?? 0}</Text>
                    <View style={styles.metaDivider} />
                    <Text style={[styles.streakMetaText, atRisk && { color: AT_RISK }]}>
                      {streak?.activeToday ? 'Logged today' : 'Nothing today yet'}
                    </Text>
                  </View>
                </View>

                <StreakGauge days={streakDays} atRisk={atRisk} />
              </PressableScale>
            )}
          </Animated.View>

          {/* Active challenges */}
          <Animated.View entering={enter(4)} style={styles.section}>
            <SectionHeader
              title="Active challenges"
              meta={active.length > 0 ? `${active.length} open` : undefined}
            />

            {showSkeleton ? (
              <View style={{ gap: GAP }}>
                <Skeleton width="100%" height={148} borderRadius={RADIUS} />
                <Skeleton width="100%" height={148} borderRadius={RADIUS} />
              </View>
            ) : !hasFriends ? (
              <PressableScale
                style={styles.emptyCard}
                scaleTo={0.97}
                onPress={() => navigation.navigate('ManageFriends')}
              >
                <View style={styles.emptyIcon}>
                  <UserPlus color={TEXT_MUTED} size={19} strokeWidth={1.8} />
                </View>
                <Text style={styles.emptyTitle}>Add friends to start challenging</Text>
                <Text style={styles.emptyText}>
                  Challenges are one-on-one. Add someone by their username and you can put a set of
                  questions in front of them.
                </Text>
                <View style={styles.emptyCta}>
                  <Text style={styles.emptyCtaText}>Find friends</Text>
                  <ChevronRight color={TEXT} size={15} strokeWidth={2} />
                </View>
              </PressableScale>
            ) : active.length === 0 ? (
              <PressableScale
                style={styles.emptyCard}
                scaleTo={0.97}
                onPress={() => openCompose({ opponentId: friends[0].userId })}
              >
                <View style={styles.emptyIcon}>
                  <Swords color={TEXT_MUTED} size={19} strokeWidth={1.8} />
                </View>
                <Text style={styles.emptyTitle}>Nothing running right now</Text>
                <Text style={styles.emptyText}>
                  Send {displayName(friends[0].username)} five questions and see who comes out ahead.
                </Text>
                <View style={styles.emptyCta}>
                  <Text style={styles.emptyCtaText}>Start a challenge</Text>
                  <ChevronRight color={TEXT} size={15} strokeWidth={2} />
                </View>
              </PressableScale>
            ) : (
              <View style={{ gap: GAP }}>
                {active.map((match, i) => (
                  <Animated.View key={match.id} entering={enter(5 + i)}>
                    <ChallengeTicket
                      match={match}
                      onPress={() =>
                        navigation.navigate('ChallengeDetail', { matchId: match.id })
                      }
                    />
                  </Animated.View>
                ))}
              </View>
            )}
          </Animated.View>

          {/* Leaderboard */}
          <Animated.View entering={enter(6)} style={styles.section}>
            <SectionHeader
              title="Leaderboard"
              actionLabel="See all"
              onAction={() => navigation.navigate('LeaderBoard')}
            />

            <ScopeTabs
              active={SCOPES.indexOf(scope)}
              onChange={(i) => {
                if (SCOPES[i] !== scope) setScope(SCOPES[i]);
              }}
            />

            {showSkeleton || (loading && leaderboard.length === 0) ? (
              <View style={{ gap: 10, marginTop: 4 }}>
                <Skeleton width="100%" height={44} borderRadius={10} />
                <Skeleton width="100%" height={44} borderRadius={10} />
                <Skeleton width="100%" height={44} borderRadius={10} />
              </View>
            ) : leaderboard.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyText}>
                  {scope === 'friends'
                    ? 'Once you have friends, the last seven days of practice rank you against them here.'
                    : 'Nobody has practised in the last seven days yet.'}
                </Text>
              </View>
            ) : (
              <View style={styles.ledger}>
                {leaderboard.slice(0, LEADERBOARD_PREVIEW).map((row, i, list) => (
                  <LedgerRow
                    key={row.userId}
                    row={row}
                    last={i === list.length - 1}
                    onPress={
                      row.isSelf
                        ? undefined
                        : () =>
                            navigation.navigate('FriendProfile', {
                              userId: row.userId,
                              username: row.username,
                            })
                    }
                  />
                ))}
              </View>
            )}
          </Animated.View>

          {/* Friends roster */}
          <Animated.View entering={enter(7)} style={styles.section}>
            <SectionHeader
              title="Friends"
              actionLabel="Manage"
              onAction={() => navigation.navigate('ManageFriends')}
            />

            {showSkeleton ? (
              <Skeleton width="100%" height={92} borderRadius={RADIUS} />
            ) : !hasFriends ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyText}>
                  No friends yet
                  {requests.length > 0 ? ` — ${requests.length} request waiting in Manage.` : '.'}
                </Text>
              </View>
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.rosterRow}
              >
                {friends.map((friend) => (
                  <PressableScale
                    key={friend.userId}
                    scaleTo={0.94}
                    style={styles.rosterItem}
                    onPress={() =>
                      navigation.navigate('FriendProfile', {
                        userId: friend.userId,
                        username: friend.username,
                      })
                    }
                  >
                    <Avatar username={friend.username} size={48} />
                    <Text style={styles.rosterName} numberOfLines={1}>
                      {displayName(friend.username)}
                    </Text>
                  </PressableScale>
                ))}

                <PressableScale
                  scaleTo={0.94}
                  style={styles.rosterItem}
                  onPress={() => navigation.navigate('ManageFriends')}
                >
                  <View style={styles.rosterAdd}>
                    <Users color={TEXT_MUTED} size={19} strokeWidth={1.8} />
                  </View>
                  <Text style={styles.rosterName}>Manage</Text>
                </PressableScale>
              </ScrollView>
            )}
          </Animated.View>

          {/* History — collapsed to the three most recent, the rest behind the link. */}
          {history.length > 0 ? (
            <Animated.View entering={enter(8)} style={styles.section}>
              <SectionHeader
                title="Past challenges"
                actionLabel={history.length > HISTORY_PREVIEW ? 'View all' : undefined}
                onAction={
                  history.length > HISTORY_PREVIEW
                    ? () => navigation.navigate('ChallengeHistory')
                    : undefined
                }
                meta={history.length <= HISTORY_PREVIEW ? `${history.length} finished` : undefined}
              />
              <View style={{ gap: GAP }}>
                {history.slice(0, HISTORY_PREVIEW).map((match) => (
                  <ChallengeTicket
                    key={match.id}
                    match={match}
                    onPress={() => navigation.navigate('ChallengeResult', { matchId: match.id })}
                  />
                ))}
              </View>
            </Animated.View>
          ) : null}
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
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.09)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  badge: {
    position: 'absolute',
    top: 9,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: AT_RISK,
  },

  titleBlock: { marginBottom: 24 },
  title: { color: TEXT, fontSize: 28, fontFamily: typography.bold, letterSpacing: -0.4 },
  subtitle: { color: TEXT_MUTED, fontSize: 15, fontFamily: typography.regular, marginTop: 6 },

  errorCard: {
    backgroundColor: SURFACE,
    borderRadius: RADIUS,
    borderWidth: 1,
    borderColor: 'rgba(248,113,113,0.25)',
    padding: 18,
    marginBottom: GAP,
  },
  errorTitle: { color: TEXT, fontSize: 15, fontFamily: typography.semiBold, marginBottom: 4 },
  errorText: { color: TEXT_MUTED, fontSize: 13, fontFamily: typography.regular, lineHeight: 19 },
  retryButton: {
    alignSelf: 'flex-start',
    marginTop: 14,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: SURFACE_BORDER,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  retryText: { color: TEXT, fontSize: 13, fontFamily: typography.semiBold },

  riskBanner: {
    backgroundColor: withAlpha(AT_RISK, 0.12),
    borderColor: withAlpha(AT_RISK, 0.32),
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: GAP,
  },
  riskText: { color: '#F5DFAE', fontSize: 13, fontFamily: typography.semiBold },

  streakCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: SURFACE,
    borderRadius: RADIUS,
    borderWidth: 1,
    borderColor: SURFACE_BORDER,
    padding: 20,
    marginBottom: SECTION_GAP,
  },
  streakTextCol: { flex: 1, paddingRight: 14 },
  streakLabel: { color: TEXT_FAINT, fontSize: 10, fontFamily: typography.bold, letterSpacing: 1.4 },
  streakHeadline: {
    color: TEXT,
    fontSize: 21,
    fontFamily: typography.bold,
    letterSpacing: -0.5,
    marginTop: 8,
  },
  streakCaption: { color: TEXT_MUTED, fontSize: 13, fontFamily: typography.regular, marginTop: 6, lineHeight: 18 },
  streakMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, flexWrap: 'wrap' },
  streakMetaText: { color: TEXT_FAINT, fontSize: 11, fontFamily: typography.regular },
  metaDivider: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: 'rgba(255,255,255,0.18)' },

  section: { marginBottom: SECTION_GAP },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 16,
  },
  sectionTitle: { color: TEXT, fontSize: 17, fontFamily: typography.semiBold, letterSpacing: -0.2 },
  sectionMeta: { color: TEXT_FAINT, fontSize: 12, fontFamily: typography.regular },
  sectionAction: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  sectionActionText: { color: TEXT_MUTED, fontSize: 13, fontFamily: typography.regular },

  segment: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.09)',
    padding: SEG_PAD,
    marginBottom: 12,
  },
  segmentIndicator: {
    position: 'absolute',
    left: SEG_PAD,
    top: SEG_PAD,
    bottom: SEG_PAD,
    width: SEG_WIDTH,
    borderRadius: 999,
    borderWidth: 1,
    backgroundColor: withAlpha(CHALLENGE_TINT, 0.28),
    borderColor: withAlpha(CHALLENGE_TINT, 0.5),
  },
  segmentTab: { width: SEG_WIDTH, paddingVertical: 10, alignItems: 'center' },
  segmentLabel: { fontSize: 14, fontFamily: typography.semiBold, letterSpacing: -0.1 },

  ledger: {
    backgroundColor: SURFACE,
    borderRadius: RADIUS,
    borderWidth: 1,
    borderColor: SURFACE_BORDER,
    paddingHorizontal: 14,
    paddingVertical: 4,
  },

  rosterRow: { flexDirection: 'row', gap: 16, paddingRight: GUTTER },
  rosterItem: { alignItems: 'center', width: 64, gap: 8 },
  rosterAdd: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: SURFACE_BORDER,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rosterName: { color: TEXT_MUTED, fontSize: 11, fontFamily: typography.regular, textAlign: 'center' },

  emptyCard: {
    backgroundColor: SURFACE,
    borderRadius: RADIUS,
    borderWidth: 1,
    borderColor: SURFACE_BORDER,
    padding: 22,
    alignItems: 'flex-start',
  },
  emptyIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.06)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  emptyTitle: { color: TEXT, fontSize: 15, fontFamily: typography.semiBold, marginBottom: 5 },
  emptyText: { color: TEXT_MUTED, fontSize: 13, fontFamily: typography.regular, lineHeight: 20 },
  emptyCta: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 16 },
  emptyCtaText: { color: TEXT, fontSize: 13, fontFamily: typography.semiBold },
});
