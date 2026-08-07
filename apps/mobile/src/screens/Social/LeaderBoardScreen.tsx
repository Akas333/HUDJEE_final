import React, { useCallback, useEffect } from 'react';
import { Dimensions, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
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

import SubjectBackdrop from '../../components/SubjectBackdrop';
import Skeleton from '../../components/Skeleton';
import ChallengeHeader from '../../components/challenges/ChallengeHeader';
import LedgerRow from '../../components/challenges/LedgerRow';
import { HapticService } from '../../services/HapticService';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { withAlpha } from '../../theme/subjects';
import {
  CHALLENGE_TINT,
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

// The full board. Ranked on the last seven days of answering — questions first,
// then correctness — rather than on a lifetime total, so somebody who worked hard
// this week can actually catch the person who worked hard in March.

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - GUTTER * 2;

const enter = (index: number) =>
  FadeInDown.springify().damping(18).mass(0.6).delay(Math.min(index, 10) * 35);

const SCOPES: Array<'friends' | 'global'> = ['friends', 'global'];
const SCOPE_LABELS = { friends: 'Friends', global: 'Global' };
const SEG_PAD = 4;
const SEG_WIDTH = (CARD_WIDTH - SEG_PAD * 2) / SCOPES.length;

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

export default function LeaderBoardScreen({ navigation }: any) {
  const leaderboard = useChallengesStore((s) => s.leaderboard);
  const scope = useChallengesStore((s) => s.leaderboardScope);
  const setScope = useChallengesStore((s) => s.setLeaderboardScope);

  const activeIndex = SCOPES.indexOf(scope);
  const pos = useSharedValue(activeIndex);

  useEffect(() => {
    pos.value = withSpring(activeIndex, { damping: 18, stiffness: 180, mass: 0.7 });
  }, [activeIndex]);

  const indicator = useAnimatedStyle(() => ({
    transform: [{ translateX: pos.value * SEG_WIDTH }],
  }));

  // Coming back to this screen re-reads the board; the hub's copy may be minutes
  // old by the time you drill in. The scope is read at call time rather than
  // captured, so switching scope does not queue a second identical fetch behind
  // the one the switch itself started.
  useFocusEffect(
    useCallback(() => {
      const store = useChallengesStore.getState();
      store.setLeaderboardScope(store.leaderboardScope);
    }, [])
  );

  const self = leaderboard.find((r) => r.isSelf);

  return (
    <View style={styles.root}>
      <SubjectBackdrop color={CHALLENGE_TINT} />

      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <ChallengeHeader
            eyebrow="LAST 7 DAYS"
            title="Leaderboard"
            subtitle="Ranked on questions answered this week, then on how many you got right."
            onBack={() => navigation.goBack()}
          />

          <Animated.View entering={enter(2)} style={styles.segment}>
            <Animated.View style={[styles.segmentIndicator, indicator]} />
            {SCOPES.map((s, i) => (
              <ScopeTab
                key={s}
                label={SCOPE_LABELS[s]}
                index={i}
                pos={pos}
                onPress={() => {
                  if (SCOPES[i] !== scope) setScope(SCOPES[i]);
                }}
              />
            ))}
          </Animated.View>

          {/* Where the student stands, before the list they have to scan for it. */}
          {self ? (
            <Animated.View entering={enter(3)} style={styles.selfCard}>
              <Text style={styles.selfLabel}>YOUR POSITION</Text>
              <View style={styles.selfRow}>
                <Text style={styles.selfRank}>#{self.rank}</Text>
                <View style={styles.selfMetaCol}>
                  <Text style={styles.selfMetaStrong}>
                    {self.questions} question{self.questions === 1 ? '' : 's'} this week
                  </Text>
                  <Text style={styles.selfMeta}>
                    {self.activeDays} active day{self.activeDays === 1 ? '' : 's'}
                    {self.questions > 0 ? ` · ${self.accuracyPct}% accuracy` : ''}
                  </Text>
                </View>
              </View>
            </Animated.View>
          ) : null}

          <Animated.View entering={enter(4)} style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              {scope === 'friends' ? 'You and your friends' : 'Everyone on HudJee'}
            </Text>
            {leaderboard.length > 0 ? (
              <Text style={styles.sectionMeta}>{leaderboard.length} listed</Text>
            ) : null}
          </Animated.View>

          {leaderboard.length === 0 ? (
            <View style={{ gap: 10 }}>
              <Skeleton width="100%" height={48} borderRadius={10} />
              <Skeleton width="100%" height={48} borderRadius={10} />
              <Skeleton width="100%" height={48} borderRadius={10} />
            </View>
          ) : (
            <Animated.View entering={enter(5)} style={styles.ledger}>
              {leaderboard.map((row, i) => (
                <LedgerRow
                  key={row.userId}
                  row={row}
                  last={i === leaderboard.length - 1}
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
            </Animated.View>
          )}

          <Animated.View entering={enter(6)} style={styles.noteCard}>
            <Text style={styles.noteText}>
              Challenge wins don't move this board and neither does your Arena rating — it counts
              practice, so the only way up it is to answer questions.
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

  segment: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.09)',
    padding: SEG_PAD,
    marginBottom: 20,
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
  segmentTab: { width: SEG_WIDTH, paddingVertical: 11, alignItems: 'center' },
  segmentLabel: { fontSize: 14, fontFamily: typography.semiBold, letterSpacing: -0.1 },

  selfCard: {
    backgroundColor: SURFACE,
    borderRadius: RADIUS,
    borderWidth: 1,
    borderColor: SURFACE_BORDER,
    padding: 18,
    marginBottom: SECTION_GAP,
  },
  selfLabel: { color: TEXT_FAINT, fontSize: 10, fontFamily: typography.bold, letterSpacing: 1.4 },
  selfRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 12 },
  selfRank: { color: TEXT, fontSize: 30, fontFamily: typography.bold, letterSpacing: -1 },
  selfMetaCol: { flex: 1 },
  selfMetaStrong: { color: TEXT, fontSize: 14, fontFamily: typography.semiBold },
  selfMeta: { color: TEXT_FAINT, fontSize: 12, fontFamily: typography.regular, marginTop: 3 },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 14,
  },
  sectionTitle: { color: TEXT, fontSize: 17, fontFamily: typography.semiBold, letterSpacing: -0.2 },
  sectionMeta: { color: TEXT_FAINT, fontSize: 12, fontFamily: typography.regular },

  ledger: {
    backgroundColor: SURFACE,
    borderRadius: RADIUS,
    borderWidth: 1,
    borderColor: SURFACE_BORDER,
    paddingHorizontal: 14,
    paddingVertical: 4,
  },

  noteCard: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: SURFACE_BORDER,
    padding: 16,
    marginTop: SECTION_GAP,
  },
  noteText: { color: TEXT_MUTED, fontSize: 12, fontFamily: typography.regular, lineHeight: 18 },
});
