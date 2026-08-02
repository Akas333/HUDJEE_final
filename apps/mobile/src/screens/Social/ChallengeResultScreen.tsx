import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import Animated, { useSharedValue, withTiming, withDelay, runOnJS, useAnimatedReaction } from 'react-native-reanimated';
import { ChevronLeft } from 'lucide-react-native';
import { TouchableOpacity } from 'react-native-gesture-handler';

import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { MockEngineApi } from '../../services/api.mock';
import type { ChallengeV2, ChallengeSubmitResult, FriendV2 } from '../../services/api.mock';

import AnimatedButton from '../../components/AnimatedButton';
import Skeleton from '../../components/Skeleton';
import { HapticService } from '../../services/HapticService';

type ChallengeResultRouteProp = RouteProp<{ params: { challengeId: string, result?: ChallengeSubmitResult } }, 'params'>;

export default function ChallengeResultScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<ChallengeResultRouteProp>();
  const { challengeId, result: routeResult } = route.params;
  
  const [challenge, setChallenge] = useState<ChallengeV2 | null>(null);
  const [loading, setLoading] = useState(true);

  const myScoreAnim = useSharedValue(0);
  const oppScoreAnim = useSharedValue(0);
  
  const [myDisplayedScore, setMyDisplayedScore] = useState(0);
  const [oppDisplayedScore, setOppDisplayedScore] = useState(0);

  useEffect(() => {
    loadChallenge();
  }, [challengeId]);

  const loadChallenge = async () => {
    try {
      const data = await MockEngineApi.getChallengeDetail(challengeId);
      setChallenge(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (challenge && !loading) {
      const { myScore, oppScore } = getScores();
      myScoreAnim.value = 0;
      oppScoreAnim.value = 0;
      myScoreAnim.value = withTiming(myScore, { duration: 600 });
      oppScoreAnim.value = withDelay(200, withTiming(oppScore || 0, { duration: 600 }));
    }
  }, [challenge, loading]);

  useAnimatedReaction(
    () => Math.floor(myScoreAnim.value),
    (current, prev) => {
      if (current !== prev) runOnJS(setMyDisplayedScore)(current);
    }
  );

  useAnimatedReaction(
    () => Math.floor(oppScoreAnim.value),
    (current, prev) => {
      if (current !== prev) runOnJS(setOppDisplayedScore)(current);
    }
  );

  const handleBack = () => {
    HapticService.light();
    navigation.goBack();
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <View style={{ flex: 1, padding: 24, justifyContent: 'center', gap: 24 }}>
          <Skeleton width="100%" height={120} borderRadius={16} />
          <Skeleton width="100%" height={200} borderRadius={16} />
        </View>
      </SafeAreaView>
    );
  }

  if (!challenge) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Challenge not found.</Text>
          <AnimatedButton style={styles.secondaryBtn} onPress={() => navigation.navigate('HomeTab')}>
            <Text style={styles.secondaryBtnText}>Back to Home</Text>
          </AnimatedButton>
        </View>
      </SafeAreaView>
    );
  }

  const myRole = challenge.sender.friend_id === 'self' ? 'sender' : 'recipient';
  const opponentRole = myRole === 'sender' ? 'recipient' : 'sender';
  const opponent = challenge[opponentRole] as FriendV2;

  const getScores = () => {
    const total = challenge.question_count;
    let myScore = 0;
    let oppScore: number | null = null;
    if (routeResult) {
      myScore = routeResult.score;
      oppScore = routeResult.opponent_score;
    } else {
      myScore = (myRole === 'sender' ? challenge.sender_score : challenge.recipient_score) || 0;
      oppScore = opponentRole === 'sender' ? challenge.sender_score : challenge.recipient_score;
    }
    return { myScore, oppScore, total };
  };

  const { myScore, oppScore } = getScores();
  const oppCompleted = (opponentRole === 'sender' ? challenge.sender_completed : challenge.recipient_completed) || oppScore !== null;

  let outcomeType: 'win' | 'loss' | 'tie' | 'solo' = 'solo';
  let outcomeText = '';

  if (!oppCompleted) {
    outcomeType = 'solo';
    outcomeText = `Waiting on ${opponent.name} to finish.`;
  } else if (myScore > (oppScore || 0)) {
    outcomeType = 'win';
    outcomeText = `You won! Great job against ${opponent.name}.`;
  } else if (myScore < (oppScore || 0)) {
    outcomeType = 'loss';
    outcomeText = `Good effort, but ${opponent.name} took this one.`;
  } else {
    outcomeType = 'tie';
    outcomeText = `It's a tie with ${opponent.name}!`;
  }

  const accentColor = 
    outcomeType === 'win' ? colors.hudjeeStateWin :
    outcomeType === 'loss' ? colors.hudjeeStateLoss || '#64748B' :
    colors.hudjeeStateTie;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={[styles.accentBar, { backgroundColor: accentColor }]} />
      
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <ChevronLeft color={colors.hudjeeTextPrimary} size={28} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Result</Text>
        <View style={styles.backButton} />
      </View>

      <View style={styles.container}>
        <Text style={styles.outcomeText}>{outcomeText}</Text>
        
        <View style={styles.scoreBoard}>
          <View style={styles.scoreColumn}>
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>You</Text>
            </View>
            <Text style={styles.nameText}>You</Text>
            <Text style={styles.scoreText}>{myDisplayedScore}</Text>
          </View>
          
          <View style={styles.scoreColumn}>
            <Image source={{ uri: opponent.avatar_url }} style={styles.avatarImg} />
            <Text style={styles.nameText}>{opponent.name}</Text>
            <Text style={styles.scoreText}>{oppCompleted ? oppDisplayedScore : '-'}</Text>
          </View>
        </View>
        
        <View style={{ flex: 1 }} />
        
        <View style={styles.actions}>
          <AnimatedButton
            hapticType="medium"
            style={styles.secondaryBtn}
            onPress={() => {
              navigation.navigate('ChallengeCompose', {
                preselectedFriendId: opponent.friend_id,
                preselectedScope: challenge.scope,
                preselectedChapter: challenge.chapter_name
              });
            }}
          >
            <Text style={styles.secondaryBtnText}>Rematch</Text>
          </AnimatedButton>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { 
    flex: 1, 
    backgroundColor: colors.hudjeeBgBase 
  },
  accentBar: {
    height: 4,
    width: '100%',
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
  container: {
    flex: 1,
    padding: 24,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24
  },
  emptyText: {
    color: colors.hudjeeTextSecondary,
    ...(typography.hudjee.body),
    marginBottom: 24
  },
  outcomeText: {
    color: colors.hudjeeTextPrimary,
    ...(typography.hudjee.body),
    textAlign: 'center',
    marginBottom: 48,
    marginTop: 24
  },
  scoreBoard: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
    marginBottom: 48,
  },
  scoreColumn: {
    alignItems: 'center',
    flex: 1,
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16
  },
  avatarText: {
    color: '#000',
    ...(typography.hudjee.headingMd)
  },
  avatarImg: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.hudjeeSurfaceCardElevated,
    marginBottom: 16
  },
  nameText: {
    color: colors.hudjeeTextPrimary,
    ...(typography.hudjee.body),
    marginBottom: 8,
    textAlign: 'center'
  },
  scoreText: {
    color: colors.hudjeeTextPrimary,
    ...(typography.hudjee.numericEmphasis),
  },
  actions: {
    gap: 12
  },
  secondaryBtn: {
    backgroundColor: colors.hudjeeSurfaceCardElevated,
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    borderBottomWidth: 5,
    borderColor: 'rgba(0,0,0,0.2)',
  },
  secondaryBtnText: {
    color: colors.hudjeeTextPrimary,
    ...(typography.hudjee.headingMd)
  }
});
