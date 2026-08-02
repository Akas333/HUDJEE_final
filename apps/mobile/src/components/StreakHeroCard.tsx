import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Flame } from 'lucide-react-native';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';

interface StreakHeroCardProps {
  streakCount: number;
  nextMilestone: number;
  daysToMilestone: number;
  onPress?: () => void;
}

export const StreakHeroCard: React.FC<StreakHeroCardProps> = ({
  streakCount,
  nextMilestone,
  daysToMilestone,
  onPress,
}) => {
  const progress = Math.min(Math.max(streakCount / nextMilestone, 0), 1);
  const Container = onPress ? TouchableOpacity : View;

  return (
    <Container style={styles.container} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.headerRow}>
        <View style={styles.leftCol}>
          <Text style={styles.streakNumber}>{streakCount}</Text>
        </View>
        <View style={styles.rightCol}>
          <Text style={styles.label}>Your Streak</Text>
          <Flame color={colors.hudjeeMilestoneStart || '#E8B84B'} size={24} style={styles.icon} />
        </View>
      </View>
      <View style={styles.progressTrack}>
        <LinearGradient
          colors={[
            colors.hudjeeMilestoneStart || '#E8B84B', 
            colors.hudjeeMilestoneEnd || '#FBBF24'
          ]}
          style={[styles.progressFill, { width: `${progress * 100}%` }]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        />
      </View>
      <Text style={styles.caption}>
        {daysToMilestone} days to next milestone
      </Text>
    </Container>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.hudjeeSurfaceCard,
    borderRadius: 24,
    padding: 20,
    width: '100%',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  leftCol: {
    flex: 1,
  },
  rightCol: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: 8,
  },
  streakNumber: {
    ...typography.hudjee.display,
    color: colors.hudjeeTextPrimary,
  },
  label: {
    ...typography.hudjee.label,
    color: colors.hudjeeTextSecondary,
  },
  icon: {
    marginLeft: 4,
  },
  progressTrack: {
    height: 8,
    backgroundColor: colors.hudjeeSurfaceCardElevated || '#374151',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  caption: {
    ...typography.hudjee.caption,
    color: colors.hudjeeTextSecondary,
  },
});
