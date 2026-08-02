import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Bell, Trophy, TrendingUp } from 'lucide-react-native';

import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { useChallengesStore } from '../../store/challengesStore';
import HeroCard from '../../components/HeroCard';
import { CarouselCard } from '../../components/CarouselCard';
import { StatTile } from '../../components/StatTile';
import { ChallengeCard } from '../../components/ChallengeCard';
import Skeleton from '../../components/Skeleton';

type ChallengesStackParamList = {
  StreakDetail: undefined;
  ChallengeDetail: { challengeId: string };
  ManageFriends: undefined;
  LeaderBoard: undefined;
  ChallengeCompose: undefined;
};

export default function ChallengesScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<ChallengesStackParamList>>();
  const isFocused = useIsFocused();
  
  const { challenges, fetchAll } = useChallengesStore();
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    if (isFocused) {
      setLoading(true);
      fetchAll().finally(() => setLoading(false));
    }
  }, [isFocused, fetchAll]);

  const activeChallenges = useMemo(() => {
    return challenges
      .filter(c => c.status === 'pending' || c.status === 'in_progress' || c.status === 'accepted');
  }, [challenges]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.content}>
          <Skeleton width="100%" height={120} style={{ borderRadius: 16, marginBottom: 24 }} />
          <Skeleton width={150} height={24} style={{ marginBottom: 16 }} />
          <Skeleton width="100%" height={100} style={{ borderRadius: 16, marginBottom: 12 }} />
          <Skeleton width="100%" height={100} style={{ borderRadius: 16 }} />
        </View>
      </SafeAreaView>
    );
  }

  const dummyCarouselItems = [
    { title: "Up 4 ranks", subtitle: "Weekly leaderboard" },
    { title: "12 day streak", subtitle: "Keep it up!" }
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Top App Bar */}
      <View style={styles.appBar}>
        <Text style={styles.appBarTitle}>Ascend</Text>
        <TouchableOpacity style={styles.bellIconContainer}>
          <Bell size={24} color={colors.hudjeeTextPrimary} />
          <View style={styles.unreadDot} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Gap 16dp via marginBottom on HeroCard wrapper */}
        <TouchableOpacity 
          activeOpacity={0.8} 
          onPress={() => navigation.navigate('StreakDetail')}
          style={{ marginBottom: 16 }}
        >
          <HeroCard 
            label="Current Streak"
            title="12 Days"
            subtitle="Next milestone: 30 days"
            progress={12/30 * 100}
            tags={[{ text: 'On Fire', color: colors.hudjeeMilestoneStart, bgColor: colors.brassGoldBg }]}
            stats={[{ label: 'Remaining', value: '18 days' }]}
          />
        </TouchableOpacity>

        {/* Gap 16dp via marginBottom */}
        <View style={{ marginBottom: 20 }}>
          <CarouselCard items={dummyCarouselItems} />
        </View>

        {/* Stat Tiles: Row of 2 */}
        <View style={styles.statTilesRow}>
          <StatTile 
            label="Challenges Won" 
            value="14" 
            icon={<Trophy size={20} color={colors.hudjeeMilestoneStart} />} 
          />
          <StatTile 
            label="Weekly Rank" 
            value="#4" 
            icon={<TrendingUp size={20} color={colors.hudjeeProgressStart} />} 
          />
        </View>

        {/* Section Header */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Active Challenges</Text>
          <TouchableOpacity>
            <Text style={styles.viewAllText}>View All</Text>
          </TouchableOpacity>
        </View>

        {/* List of ChallengeCard */}
        <View style={styles.challengesList}>
          {activeChallenges.length > 0 ? (
            activeChallenges.map(challenge => (
              <TouchableOpacity 
                key={challenge.challenge_id} 
                activeOpacity={0.8}
                onPress={() => navigation.navigate('ChallengeDetail', { challengeId: challenge.challenge_id })}
                style={styles.cardContainer}
              >
                <ChallengeCard challenge={challenge} isAwaitingYou={false} onPress={() => {}} />
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyStateContainer}>
              <Text style={styles.emptyStateText}>
                No challenges right now. Ready to start one?
              </Text>
            </View>
          )}
        </View>
        
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.hudjeeBgBase,
  },
  content: {
    padding: 16,
  },
  appBar: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  appBarTitle: {
    ...typography.hudjee.headingLg,
    color: colors.hudjeeTextPrimary,
  },
  bellIconContainer: {
    position: 'relative',
    padding: 4,
  },
  unreadDot: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.hudjeeMilestoneStart,
  },
  scrollContent: {
    padding: 16,
  },
  statTilesRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sectionTitle: {
    ...typography.hudjee.headingMd,
    color: colors.hudjeeTextPrimary,
  },
  viewAllText: {
    ...typography.hudjee.label,
    color: colors.hudjeeMilestoneStart,
  },
  challengesList: {
    gap: 12,
  },
  cardContainer: {
    // ChallengeCard handles its own internal layout, but we might want bottom margin if gap wasn't supported
  },
  emptyStateContainer: {
    backgroundColor: colors.hudjeeSurfaceCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.hudjeeBorderSubtle,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateText: {
    ...typography.hudjee.body,
    color: colors.hudjeeTextSecondary,
    textAlign: 'center',
  },
});
