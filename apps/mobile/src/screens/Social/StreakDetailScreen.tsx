import React, { useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Flame, Lock, Check, Snowflake } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { useChallengesStore } from '../../store/challengesStore';
import Skeleton from '../../components/Skeleton';
import { HapticService } from '../../services/HapticService';

export default function StreakDetailScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const { streak } = useChallengesStore();
  const fetchStreak = useChallengesStore((state) => (state as any).fetchStreak);
  const isLoading = !streak;

  useEffect(() => {
    if (fetchStreak) {
      fetchStreak();
    }
  }, [fetchStreak]);

  const handleBack = () => {
    HapticService.light();
    navigation.goBack();
  };

  const heatmapGrid = useMemo(() => {
    // 12 weeks * 7 days = 84 cells. 
    // Fill pseudo-randomly to represent activity
    const days = [];
    for (let i = 0; i < 84; i++) {
      // make recent days more active, older days sparse
      const isActive = Math.random() > 0.4;
      days.push({ active: isActive });
    }
    return days;
  }, []);

  const renderContent = () => {
    if (isLoading) {
      return (
        <View style={styles.loadingContainer}>
          <Skeleton width={150} height={150} borderRadius={75} />
          <View style={styles.statsRow}>
            <Skeleton width="45%" height={80} borderRadius={16} />
            <Skeleton width="45%" height={80} borderRadius={16} />
          </View>
          <Skeleton width="100%" height={250} borderRadius={16} style={{ marginTop: 24 }} />
        </View>
      );
    }

    if (!streak) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No streak data available.</Text>
        </View>
      );
    }

    const currentStreak = streak.current_streak ?? 12;
    const freezesAvailable = streak.freezes_available ?? 1;
    const milestones = [7, 30, 100, 365];

    return (
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Large streak number + flame */}
        <View style={styles.heroSection}>
          <Flame size={48} color={colors.hudjeeMilestoneStart} style={styles.heroIcon} />
          <Text style={styles.streakNumber}>{currentStreak}</Text>
          <Text style={styles.streakLabel}>Day Streak</Text>
        </View>

        {/* Activity Heatmap */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Activity</Text>
          <View style={styles.heatmapGrid}>
            {heatmapGrid.map((day, index) => (
              <View 
                key={index} 
                style={[
                  styles.heatmapCell, 
                  day.active ? styles.heatmapCellActive : styles.heatmapCellEmpty
                ]} 
              />
            ))}
          </View>
        </View>

        {/* Freeze Section */}
        <View style={styles.freezeCard}>
          <View style={styles.freezeHeader}>
            <Snowflake color={colors.frozenBlue} size={24} />
            <Text style={styles.freezeTitle}>{freezesAvailable} Freeze available</Text>
          </View>
          <Text style={styles.freezeDescription}>
            Maintains your streak if you miss a day. Earn more at milestones.
          </Text>
        </View>

        {/* Milestones */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Milestones</Text>
          <View style={styles.milestoneList}>
            {milestones.map((m) => {
              const reached = currentStreak >= m;
              return (
                <View key={m} style={[styles.milestoneItem, reached && styles.milestoneReached]}>
                  <View style={[styles.milestoneIcon, reached && styles.milestoneIconReached]}>
                    {reached ? (
                      <Check color={colors.hudjeeBgBase} size={20} />
                    ) : (
                      <Lock color={colors.hudjeeTextSecondary} size={20} />
                    )}
                  </View>
                  <View style={styles.milestoneInfo}>
                    <Text style={[styles.milestoneText, reached && styles.milestoneTextReached]}>
                      {m} Days
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      </ScrollView>
    );
  };

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <ChevronLeft color={colors.hudjeeTextPrimary} size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Your Streak</Text>
        <View style={styles.headerRight} />
      </View>
      {renderContent()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.hudjeeBgBase,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    ...typography.hudjee.headingMd,
    color: colors.hudjeeTextPrimary,
  },
  headerRight: {
    width: 40,
  },
  loadingContainer: {
    flex: 1,
    padding: 24,
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    ...typography.hudjee.body,
    color: colors.hudjeeTextSecondary,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 60,
  },
  heroSection: {
    alignItems: 'center',
    marginVertical: 32,
  },
  heroIcon: {
    marginBottom: 16,
  },
  streakNumber: {
    ...typography.hudjee.display,
    color: colors.hudjeeTextPrimary,
    lineHeight: 52,
  },
  streakLabel: {
    ...typography.hudjee.headingMd,
    color: colors.hudjeeTextSecondary,
    marginTop: 8,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    ...typography.hudjee.headingMd,
    color: colors.hudjeeTextPrimary,
    marginBottom: 16,
  },
  heatmapGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    justifyContent: 'center',
  },
  heatmapCell: {
    width: 24,
    height: 24,
    borderRadius: 4,
  },
  heatmapCellEmpty: {
    backgroundColor: colors.hudjeeSurfaceCardElevated,
  },
  heatmapCellActive: {
    backgroundColor: colors.hudjeeMilestoneStart,
  },
  freezeCard: {
    backgroundColor: colors.hudjeeSurfaceCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.hudjeeBorderSubtle,
    borderBottomWidth: 5,
    padding: 20,
    marginBottom: 32,
  },
  freezeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  freezeTitle: {
    ...typography.hudjee.headingMd,
    color: colors.hudjeeTextPrimary,
    marginLeft: 12,
  },
  freezeDescription: {
    ...typography.hudjee.body,
    color: colors.hudjeeTextSecondary,
    lineHeight: 20,
  },
  milestoneList: {
    gap: 12,
  },
  milestoneItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.hudjeeSurfaceCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.hudjeeBorderSubtle,
    padding: 16,
  },
  milestoneReached: {
    borderColor: colors.hudjeeMilestoneStart,
  },
  milestoneIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.hudjeeSurfaceCardElevated,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  milestoneIconReached: {
    backgroundColor: colors.hudjeeMilestoneStart,
  },
  milestoneInfo: {
    flex: 1,
  },
  milestoneText: {
    ...typography.hudjee.body,
    color: colors.hudjeeTextSecondary,
  },
  milestoneTextReached: {
    color: colors.hudjeeTextPrimary,
    fontFamily: typography.hudjee.headingMd.fontFamily,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 32,
  }
});
