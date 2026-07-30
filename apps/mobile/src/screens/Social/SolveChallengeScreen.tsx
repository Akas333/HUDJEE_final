import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Animated
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, CheckCircle2, XCircle, ArrowRight } from 'lucide-react-native';
import { colors } from '../../theme/colors';
import { Question } from '../../services/api.mock';
import { EngineApi } from '../../services/api';
import MathText from '../../components/MathText';
import AnimatedButton from '../../components/AnimatedButton';
import Skeleton from '../../components/Skeleton';
import { HapticService } from '../../services/HapticService';

export default function SolveChallengeScreen({ route, navigation }: any) {
  const { challengeId } = route.params || { challengeId: 'mock' };
  const [question, setQuestion] = useState<Question | null>(null);
  const [loading, setLoading] = useState(true);
  
  // State machine: 'reading' -> 'evaluating' -> 'success_first_try' | 'success' | 'failed'
  const [state, setState] = useState<'reading' | 'evaluating' | 'success_first_try' | 'success' | 'failed'>('reading');
  const [attempts, setAttempts] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [explanation, setExplanation] = useState<string>('');
  
  // Animation for success
  const scaleAnim = useState(new Animated.Value(0.8))[0];
  const opacityAnim = useState(new Animated.Value(0))[0];

  useEffect(() => {
    const fetchQ = async () => {
      setLoading(true);
      const q = await EngineApi.getChallengeQuestion(challengeId);
      setQuestion(q);
      setLoading(false);
    };
    fetchQ();
  }, [challengeId]);

  const handleSelectOption = (index: number) => {
    if (state !== 'reading' && state !== 'failed') return;
    HapticService.light();
    setSelectedOption(index);
  };

  const handleSubmit = async () => {
    if (selectedOption === null || !question) return;
    
    setState('evaluating');
    const isFirstTry = attempts === 0;
    setAttempts(prev => prev + 1);
    
    const res = await EngineApi.submitChallengeAnswer(challengeId, selectedOption, isFirstTry);
    
    setExplanation(res.short_explanation);
    
    if (res.correct) {
      if (isFirstTry) {
        setState('success_first_try');
        HapticService.success();
        // Trigger celebration animation
        Animated.parallel([
          Animated.spring(scaleAnim, { toValue: 1, friction: 4, useNativeDriver: true }),
          Animated.timing(opacityAnim, { toValue: 1, duration: 300, useNativeDriver: true })
        ]).start();
      } else {
        setState('success');
        HapticService.success();
      }
    } else {
      setState('failed');
      HapticService.error();
    }
  };

  if (loading || !question) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <ChevronLeft color={colors.text} size={28} />
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

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} disabled={state === 'evaluating'}>
          <ChevronLeft color={colors.text} size={28} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Challenge</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* Success First Try Overlay */}
        {state === 'success_first_try' && (
          <Animated.View style={[styles.successFirstTryBox, { opacity: opacityAnim, transform: [{ scale: scaleAnim }] }]}>
            <Text style={styles.sftEmoji}>🔥</Text>
            <Text style={styles.sftTitle}>First Try Solve!</Text>
            <Text style={styles.sftSub}>You nailed it instantly. Your friend has been notified.</Text>
          </Animated.View>
        )}

        {/* Failed State Nudge */}
        {state === 'failed' && (
          <View style={styles.failedBox}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <XCircle color="#FF6B6B" size={24} />
              <Text style={styles.failedTitle}>Not quite right</Text>
            </View>
            <Text style={styles.failedExp}>{explanation}</Text>
            <TouchableOpacity style={styles.practiceNudgeBtn} onPress={() => navigation.navigate('PracticeNavigator')}>
              <Text style={styles.practiceNudgeText}>Practice this concept</Text>
              <ArrowRight color={colors.primary} size={16} />
            </TouchableOpacity>
          </View>
        )}
        
        {/* Standard Success */}
        {state === 'success' && (
          <View style={styles.successBox}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <CheckCircle2 color="#34D399" size={24} />
              <Text style={styles.successTitle}>Correct</Text>
            </View>
            <Text style={styles.successExp}>{explanation}</Text>
          </View>
        )}

        <View style={styles.qCard}>
          <MathText style={styles.qPrompt}>{question.prompt}</MathText>
        </View>

        <View style={styles.optionsContainer}>
          {question.options?.map((opt, idx) => {
            const isSelected = selectedOption === idx;
            let bgColor = colors.surfaceLight;
            let borderColor = 'transparent';
            
            if (isSelected) {
              if (state === 'reading') {
                bgColor = '#9B6FFF15';
                borderColor = colors.primary;
              } else if (state === 'evaluating') {
                bgColor = '#9B6FFF15';
                borderColor = colors.primary;
              } else if (state === 'failed') {
                bgColor = '#FF6B6B15';
                borderColor = '#FF6B6B';
              } else if (state === 'success' || state === 'success_first_try') {
                bgColor = '#34D39915';
                borderColor = '#34D399';
              }
            }

            return (
              <AnimatedButton
                key={idx}
                hapticType="light"
                style={[
                  styles.optionBtn,
                  { backgroundColor: bgColor, borderColor, borderWidth: 1 }
                ]}
                onPress={() => handleSelectOption(idx)}
                disabled={state === 'evaluating' || state === 'success' || state === 'success_first_try'}
              >
                <View style={styles.optLetterBox}>
                  <Text style={styles.optLetter}>{String.fromCharCode(65 + idx)}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <MathText style={styles.optText}>{opt}</MathText>
                </View>
              </AnimatedButton>
            );
          })}
        </View>

      </ScrollView>

      {/* Footer CTA */}
      <View style={styles.footer}>
        {(state === 'reading' || state === 'failed' || state === 'evaluating') && (
          <AnimatedButton 
            hapticType="medium"
            style={[styles.submitBtn, selectedOption === null && styles.submitBtnDisabled]}
            disabled={selectedOption === null || state === 'evaluating'}
            onPress={handleSubmit}
          >
            {state === 'evaluating' ? (
              <ActivityIndicator color="#000" />
            ) : (
              <Text style={styles.submitBtnText}>{attempts > 0 ? 'Try Again' : 'Check Answer'}</Text>
            )}
          </AnimatedButton>
        )}

        {(state === 'success' || state === 'success_first_try') && (
          <AnimatedButton 
            hapticType="light"
            style={styles.submitBtn}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.submitBtnText}>Back to Challenges</Text>
          </AnimatedButton>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: { padding: 4, marginLeft: -4 },
  headerTitle: { color: colors.text, fontSize: 18, fontWeight: '700' },
  
  scrollContent: { padding: 20, paddingBottom: 40 },
  
  successFirstTryBox: { backgroundColor: '#FF6B6B15', borderColor: '#FF6B6B50', borderWidth: 1, borderRadius: 16, padding: 24, alignItems: 'center', marginBottom: 24 },
  sftEmoji: { fontSize: 48, marginBottom: 12 },
  sftTitle: { color: '#FF6B6B', fontSize: 24, fontWeight: '800', marginBottom: 8 },
  sftSub: { color: colors.textSecondary, fontSize: 15, textAlign: 'center' },

  failedBox: { backgroundColor: '#FF6B6B10', borderColor: '#FF6B6B30', borderWidth: 1, borderRadius: 16, padding: 20, marginBottom: 24 },
  failedTitle: { color: '#FF6B6B', fontSize: 18, fontWeight: '700' },
  failedExp: { color: colors.textSecondary, fontSize: 15, lineHeight: 22, marginBottom: 16 },
  practiceNudgeBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', paddingVertical: 8, paddingHorizontal: 16, backgroundColor: '#9B6FFF15', borderRadius: 8 },
  practiceNudgeText: { color: colors.primary, fontWeight: '600', fontSize: 14 },

  successBox: { backgroundColor: '#34D39910', borderColor: '#34D39930', borderWidth: 1, borderRadius: 16, padding: 20, marginBottom: 24 },
  successTitle: { color: '#34D399', fontSize: 18, fontWeight: '700' },
  successExp: { color: colors.textSecondary, fontSize: 15, lineHeight: 22 },

  qCard: { marginBottom: 32 },
  qPrompt: { color: colors.text, fontSize: 18, lineHeight: 28 },

  optionsContainer: { gap: 12 },
  optionBtn: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 12 },
  optLetterBox: { width: 32, height: 32, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  optLetter: { color: colors.textSecondary, fontSize: 14, fontWeight: '700' },
  optText: { color: colors.text, fontSize: 16 },

  footer: { padding: 20, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.background },
  submitBtn: { backgroundColor: colors.primary, paddingVertical: 18, borderRadius: 16, alignItems: 'center' },
  submitBtnDisabled: { opacity: 0.5 },
  submitBtnText: { color: '#000', fontSize: 18, fontWeight: '800' }
});
