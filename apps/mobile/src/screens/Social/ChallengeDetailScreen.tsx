import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { ChevronLeft, Clock } from 'lucide-react-native';
import { Image } from 'react-native';

import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { useChallengesStore } from '../../store/challengesStore';
import { ChallengeV2, MockEngineApi } from '../../services/api.mock';
import { HapticService } from '../../services/HapticService';
import { useToastStore } from '../../services/ToastService';
import AnimatedButton from '../../components/AnimatedButton';
import Skeleton from '../../components/Skeleton';

type RootStackParamList = {
  ChallengeDetail: { challengeId: string };
  SolveChallenge: { challengeId: string };
  ChallengeResult: { challengeId: string };
};

export const ChallengeDetailScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<RootStackParamList, 'ChallengeDetail'>>();
  const { challengeId } = route.params;
  
  const showToast = useToastStore((s) => s.showToast);
  const { challenges, acceptChallenge } = useChallengesStore();

  const [challenge, setChallenge] = useState<ChallengeV2 | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [isAccepting, setIsAccepting] = useState(false);

  useEffect(() => {
    const fetchChallenge = async () => {
      try {
        let found: ChallengeV2 | undefined | null = challenges.find(c => c.challenge_id === challengeId);
        if (!found) {
          found = await MockEngineApi.getChallengeDetail(challengeId);
        }
        setChallenge(found || undefined);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchChallenge();
  }, [challengeId, challenges]);

  useEffect(() => {
    if (challenge?.status === 'completed') {
      navigation.replace('ChallengeResult', { challengeId: challenge.challenge_id });
    }
  }, [challenge, navigation]);

  const handleBack = () => {
    HapticService.light();
    navigation.goBack();
  };

  const handleStart = async () => {
    if (!challenge) return;
    HapticService.light();
    if (challenge.status === 'pending') {
      setIsAccepting(true);
      try {
        await acceptChallenge(challenge.challenge_id);
        HapticService.success();
        navigation.replace('SolveChallenge', { challengeId: challenge.challenge_id });
      } catch (e) {
        console.error(e);
        showToast('Failed to start challenge', 'error');
      } finally {
        setIsAccepting(false);
      }
    } else {
      navigation.navigate('SolveChallenge', { challengeId: challenge.challenge_id });
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <ChevronLeft color={colors.hudjeeTextPrimary} size={28} />
          </TouchableOpacity>
        </View>
        <View style={styles.content}>
          <Skeleton width="100%" height={200} borderRadius={16} />
        </View>
      </SafeAreaView>
    );
  }

  if (!challenge) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <ChevronLeft color={colors.hudjeeTextPrimary} size={28} />
          </TouchableOpacity>
        </View>
        <View style={styles.centered}>
          <Text style={styles.emptyText}>Challenge not found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const isSender = challenge.sender.friend_id === 'self';
  
  const opponent = isSender ? challenge.recipient : challenge.sender;
  const selfCompleted = isSender ? challenge.sender_completed : challenge.recipient_completed;
  const opponentCompleted = isSender ? challenge.recipient_completed : challenge.sender_completed;
  
  const expiresAt = new Date(challenge.expires_at).getTime();
  const now = Date.now();
  const timeDiff = Math.max(0, expiresAt - now);
  const hoursLeft = Math.floor(timeDiff / (1000 * 60 * 60));
  const timeRemainingStr = hoursLeft > 0 ? `${hoursLeft} hrs remaining` : 'Expiring soon';

  let statusText = '';
  if (selfCompleted && !opponentCompleted) {
    statusText = `Waiting on ${opponent.name}`;
  } else if (!selfCompleted) {
    statusText = 'Waiting on you';
  } else {
    statusText = 'Completed';
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <ChevronLeft color={colors.hudjeeTextPrimary} size={28} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{opponent.name}</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <View style={styles.opponentRow}>
            <Image source={{ uri: opponent.avatar_url }} style={styles.avatar} />
            <View style={styles.opponentInfo}>
              <Text style={styles.opponentName}>{opponent.name}</Text>
              <Text style={styles.scopeText}>{challenge.scope === 'chapter' ? challenge.chapter_name : 'Mixed Subjects'}</Text>
            </View>
          </View>
          <View style={styles.chipRow}>
            <View style={styles.statusChip}>
              <Text style={styles.statusChipText}>{statusText}</Text>
            </View>
            <View style={styles.countdownChip}>
              <Clock color={colors.hudjeeMilestoneStart} size={14} />
              <Text style={styles.countdownText}>{timeRemainingStr}</Text>
            </View>
          </View>
        </View>

        <View style={styles.progressSection}>
           <Text style={styles.progressText}>0/{challenge.question_count} answered</Text>
        </View>

        {!selfCompleted && (
          <View style={styles.actionSection}>
            <AnimatedButton
              
              onPress={handleStart}
              disabled={isAccepting}
              style={styles.actionBtn}
            ><Text style={{ color: '#fff', fontSize: 16 }}>{challenge.status === 'pending' ? (isAccepting ? "Starting..." : "Start") : "Continue"}</Text></AnimatedButton>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.hudjeeBgBase,
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: -8,
  },
  headerTitle: {
    ...(typography.hudjee.headingMd),
    color: colors.hudjeeTextPrimary,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    ...(typography.hudjee.body),
    color: colors.hudjeeTextSecondary,
  },
  scrollView: {
    flex: 1,
  },
  card: {
    backgroundColor: colors.hudjeeSurfaceCard,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 24,
  },
  opponentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    marginRight: 16,
  },
  opponentInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  opponentName: {
    ...(typography.hudjee.headingMd),
    color: colors.hudjeeTextPrimary,
    marginBottom: 4,
  },
  scopeText: {
    ...(typography.hudjee.body),
    color: colors.hudjeeTextSecondary,
  },
  chipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusChip: {
    backgroundColor: colors.hudjeeSurfaceCardElevated,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusChipText: {
    ...(typography.hudjee.caption),
    color: colors.hudjeeTextPrimary,
  },
  countdownChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(232, 184, 75, 0.1)', // milestone light bg
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  countdownText: {
    ...(typography.hudjee.caption),
    color: colors.hudjeeMilestoneStart,
  },
  progressSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  progressText: {
    ...(typography.hudjee.body),
    color: colors.hudjeeTextSecondary,
  },
  actionSection: {
    marginTop: 8,
  },
  actionBtn: {
    borderBottomWidth: 5,
    borderColor: 'rgba(0,0,0,0.2)',
  }
});

export default ChallengeDetailScreen;
