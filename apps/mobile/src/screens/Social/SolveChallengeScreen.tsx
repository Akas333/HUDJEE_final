import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { ChevronLeft, Clock } from 'lucide-react-native';

import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { useChallengesStore } from '../../store/challengesStore';
import { MockEngineApi } from '../../services/api.mock';
import type { ChallengeV2, ChallengeAnswer, Question } from '../../services/api.mock';

import AnimatedButton from '../../components/AnimatedButton';
import MathText from '../../components/MathText';
import Skeleton from '../../components/Skeleton';
import ProgressBar from '../../components/ProgressBar';

type SolveChallengeRouteProp = RouteProp<{ params: { challengeId: string } }, 'params'>;

export default function SolveChallengeScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<SolveChallengeRouteProp>();
  const { challengeId } = route.params;

  const submitChallengeAnswers = useChallengesStore((s) => s.submitChallengeAnswers);

  const [challenge, setChallenge] = useState<ChallengeV2 | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<ChallengeAnswer[]>([]);
  
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [questionStartTime, setQuestionStartTime] = useState<number>(Date.now());
  
  const [totalElapsedSeconds, setTotalElapsedSeconds] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Prevent swipe back
  useEffect(() => {
    navigation.setOptions({ gestureEnabled: false });
  }, [navigation]);

  useEffect(() => {
    loadChallenge();
  }, [challengeId]);

  useEffect(() => {
    // Start global timer
    timerRef.current = setInterval(() => {
      setTotalElapsedSeconds(prev => prev + 1);
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const loadChallenge = async () => {
    try {
      const data = await MockEngineApi.getChallengeDetail(challengeId);
      if (data) {
        setChallenge(data);
      } else {
        Alert.alert('Error', 'Challenge not found');
        navigation.goBack();
      }
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Failed to load challenge');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const handleBackPress = useCallback(() => {
    Alert.alert(
      'Quit Challenge?',
      'If you leave now, your progress will be lost.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Quit', style: 'destructive', onPress: () => navigation.goBack() }
      ]
    );
  }, [navigation]);

  const handleNext = async () => {
    if (!challenge || selectedOption === null) return;

    const currentQuestion = challenge.questions[currentIndex];
    const timeTakenMs = Date.now() - questionStartTime;
    
    // For mock purposes, index 0 is always correct if not specified, 
    // but a real app would use the actual correct index.
    const isCorrect = selectedOption === 0;

    const answer: ChallengeAnswer = {
      question_id: currentQuestion.question_id,
      selected_answer: selectedOption,
      is_correct: isCorrect,
      time_taken_ms: timeTakenMs,
    };

    const newAnswers = [...answers, answer];
    
    if (currentIndex < challenge.questions.length - 1) {
      setAnswers(newAnswers);
      setSelectedOption(null);
      setCurrentIndex(prev => prev + 1);
      setQuestionStartTime(Date.now());
    } else {
      // Finish
      setSubmitting(true);
      try {
        const result = await submitChallengeAnswers(challengeId, newAnswers);
        navigation.replace('ChallengeResult', { challengeId, result });
      } catch (err) {
        console.error(err);
        Alert.alert('Error', 'Failed to submit answers');
        setSubmitting(false);
      }
    }
  };

  const formatTime = (totalSeconds: number) => {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <ChevronLeft color={colors.hudjeeTextPrimary} size={28} />
          </TouchableOpacity>
        </View>
        <View style={{ flex: 1, padding: 20, gap: 16 }}>
          <Skeleton width="100%" height={100} borderRadius={16} />
          <Skeleton width="100%" height={60} borderRadius={12} />
          <Skeleton width="100%" height={60} borderRadius={12} />
          <Skeleton width="100%" height={60} borderRadius={12} />
        </View>
      </SafeAreaView>
    );
  }

  if (!challenge || !challenge.questions || challenge.questions.length === 0) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
         <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <ChevronLeft color={colors.hudjeeTextPrimary} size={28} />
          </TouchableOpacity>
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No questions found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const currentQuestion = challenge.questions[currentIndex];
  const progress = (currentIndex) / challenge.questions.length;
  const isLastQuestion = currentIndex === challenge.questions.length - 1;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Thin Progress Bar */}
      <View style={styles.progressBarContainer}>
        <ProgressBar progress={progress} />
      </View>

      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={handleBackPress}>
          <ChevronLeft color={colors.hudjeeTextPrimary} size={28} />
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>
          Question {currentIndex + 1} of {challenge.questions.length}
        </Text>

        <View style={styles.timerContainer}>
          <Clock color={colors.hudjeeTextSecondary} size={16} />
          <Text style={styles.timerText}>{formatTime(totalElapsedSeconds)}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.qCard}>
          <MathText style={styles.qPrompt}>{currentQuestion.prompt}</MathText>
        </View>

        <View style={styles.optionsContainer}>
          {currentQuestion.options?.map((opt, idx) => {
            const isSelected = selectedOption === idx;
            const bgColor = isSelected ? `${colors.hudjeeProgressStart}15` : colors.hudjeeSurfaceCard;
            const borderColor = isSelected ? colors.hudjeeProgressStart : colors.hudjeeBorderSubtle;

            return (
              <TouchableOpacity
                key={idx}
                activeOpacity={0.7}
                style={[
                  styles.optionBtn,
                  { backgroundColor: bgColor, borderColor, borderWidth: 1 }
                ]}
                onPress={() => setSelectedOption(idx)}
                disabled={submitting}
              >
                <View style={[styles.optLetterBox, isSelected && { backgroundColor: `${colors.hudjeeProgressStart}30` }]}>
                  <Text style={[styles.optLetter, isSelected && { color: colors.hudjeeProgressStart }]}>
                    {String.fromCharCode(65 + idx)}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <MathText style={styles.optText}>{opt}</MathText>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* Footer CTA */}
      <View style={styles.footer}>
        <AnimatedButton 
          hapticType="medium"
          style={[styles.submitBtn, (selectedOption === null || submitting) && styles.submitBtnDisabled]}
          disabled={selectedOption === null || submitting}
          onPress={handleNext}
        >
          {submitting ? (
            <ActivityIndicator color="#000" />
          ) : (
            <Text style={styles.submitBtnText}>{isLastQuestion ? 'Finish' : 'Next'}</Text>
          )}
        </AnimatedButton>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { 
    flex: 1, 
    backgroundColor: colors.hudjeeBgBase 
  },
  progressBarContainer: {
    width: '100%',
  },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: 16, 
    paddingVertical: 12 
  },
  backBtn: { 
    padding: 4, 
    marginLeft: -4 
  },
  headerTitle: { 
    color: colors.hudjeeTextPrimary, 
    ...typography.hudjee.headingMd
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  timerText: {
    color: colors.hudjeeTextSecondary,
    ...typography.hudjee.numericEmphasis
  },
  scrollContent: { 
    padding: 20, 
    paddingBottom: 40 
  },
  qCard: { 
    marginBottom: 32 
  },
  qPrompt: { 
    color: colors.hudjeeTextPrimary, 
    ...typography.hudjee.headingMd,
    lineHeight: 28,
  },
  optionsContainer: { 
    gap: 12 
  },
  optionBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 16, 
    borderRadius: 16 
  },
  optLetterBox: { 
    width: 32, 
    height: 32, 
    borderRadius: 8, 
    backgroundColor: colors.hudjeeSurfaceCardElevated, 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginRight: 16 
  },
  optLetter: { 
    color: colors.hudjeeTextSecondary, 
    ...typography.hudjee.label,
    fontFamily: typography.bold
  },
  optText: { 
    color: colors.hudjeeTextPrimary, 
    ...typography.hudjee.body
  },
  footer: { 
    padding: 20, 
    borderTopWidth: 1, 
    borderTopColor: colors.hudjeeBorderSubtle, 
    backgroundColor: colors.hudjeeBgBase 
  },
  submitBtn: { 
    backgroundColor: colors.hudjeeProgressStart, 
    paddingVertical: 16, 
    borderRadius: 16, 
    alignItems: 'center' 
  },
  submitBtnDisabled: { 
    opacity: 0.5 
  },
  submitBtnText: { 
    color: '#000', 
    ...typography.hudjee.headingMd,
    fontFamily: typography.extraBold
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  emptyText: {
    color: colors.hudjeeTextSecondary,
    ...typography.hudjee.body
  }
});
