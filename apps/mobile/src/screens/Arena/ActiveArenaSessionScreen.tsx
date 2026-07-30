import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Animated,
  Modal,
  PanResponder
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, CheckCircle, ArrowRight, Zap, Target, BookOpen } from 'lucide-react-native';
import { colors } from '../../theme/colors';
import { Question, ArenaAnswerResponse, ArenaSessionSummary } from '../../services/api.mock';
import { EngineApi } from '../../services/api';

const MathText = ({ content, style }: { content: string, style?: any }) => {
  return <Text style={[style, { fontFamily: 'System' }]}>{content}</Text>;
};

export default function ActiveArenaSessionScreen({ navigation, route }: any) {
  const { chapterIds, timedMode } = route.params || { chapterIds: ['c1'], timedMode: false };
  
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [currentQ, setCurrentQ] = useState<Question | null>(null);
  
  const [status, setStatus] = useState<'loading' | 'answering' | 'correct' | 'incorrect' | 'summary'>('loading');
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [answerData, setAnswerData] = useState<ArenaAnswerResponse | null>(null);
  const [summaryData, setSummaryData] = useState<ArenaSessionSummary | null>(null);
  
  const [rating, setRating] = useState(0);

  // Animations
  const deltaOpacity = useRef(new Animated.Value(0)).current;
  const deltaTranslateY = useRef(new Animated.Value(10)).current;
  const [deltaText, setDeltaText] = useState('');
  const [deltaColor, setDeltaColor] = useState(colors.success);

  const slideAnim = useRef(new Animated.Value(0)).current;
  
  // Timer state
  const [timeLeft, setTimeLeft] = useState(60);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Stop Timer
  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  // Start Timer
  const startTimer = () => {
    stopTimer();
    if (!timedMode) return;
    
    setTimeLeft(60);
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          stopTimer();
          handleTimeout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const showDelta = (delta: number) => {
    const isPos = delta >= 0;
    setDeltaText(isPos ? `+${delta}` : `${delta}`);
    setDeltaColor(isPos ? colors.success : colors.tagRed);
    
    deltaOpacity.setValue(0);
    deltaTranslateY.setValue(10);
    
    Animated.parallel([
      Animated.timing(deltaOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.timing(deltaTranslateY, { toValue: -10, duration: 400, useNativeDriver: true })
    ]).start(() => {
      Animated.timing(deltaOpacity, { toValue: 0, duration: 300, delay: 600, useNativeDriver: true }).start();
    });
  };

  useEffect(() => {
    const initSession = async () => {
      setStatus('loading');
      const r = await EngineApi.getArenaRating();
      setRating(r.rating);

      const res = await EngineApi.startArenaSession(chapterIds, timedMode);
      setSessionId(res.session_id);
      setCurrentQ(res.first_question);
      setStatus('answering');
    };
    initSession();
    
    return () => stopTimer();
  }, [chapterIds, timedMode]);

  useEffect(() => {
    if (currentQ && status === 'answering') {
      slideAnim.setValue(800);
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        friction: 8,
        tension: 50
      }).start();
      startTimer();
    }
  }, [currentQ, status]);

  const handleSelect = (index: number) => {
    if (status !== 'answering') return;
    setSelectedOption(index);
  };

  const handleTimeout = async () => {
    // If timer runs out, auto-submit as incorrect
    if (status !== 'answering' || !sessionId || !currentQ) return;
    setStatus('loading');
    
    // We pass a dummy index (-1) which will naturally be incorrect
    const res = await EngineApi.submitArenaAnswer(sessionId, currentQ.question_id, -1, 60000);
    
    setAnswerData(res);
    setRating(res.new_rating);
    showDelta(res.rating_delta);
    
    setStatus('incorrect');
  };

  const handleSubmit = async () => {
    if (status !== 'answering' || selectedOption === null || !sessionId || !currentQ) return;
    
    stopTimer();
    setStatus('loading');
    
    const timeTakenMs = (60 - timeLeft) * 1000;
    const res = await EngineApi.submitArenaAnswer(sessionId, currentQ.question_id, selectedOption, timeTakenMs);
    
    setAnswerData(res);
    setRating(res.new_rating);
    showDelta(res.rating_delta);

    if (res.correct) {
      setStatus('correct');
      // Arena mode: FAST transition on correct
      setTimeout(() => {
        handleAdvance(res.next_question);
      }, 600);
    } else {
      setStatus('incorrect');
    }
  };

  const handleSkip = async () => {
    if (status !== 'answering' || !sessionId || !currentQ) return;
    
    stopTimer();
    setStatus('loading');
    const res = await EngineApi.skipArenaQuestion(sessionId, currentQ.question_id);
    handleAdvance(res.next_question);
  };

  const handleAdvance = (nextQ: Question | null) => {
    if (nextQ) {
      setCurrentQ(nextQ);
      setSelectedOption(null);
      setAnswerData(null);
      setStatus('answering');
    } else {
      // Should not exhaust in Arena usually, but if it does, end session
      handleExit();
    }
  };

  const handleExit = async () => {
    stopTimer();
    if (sessionId) {
      setStatus('loading');
      const summary = await EngineApi.endArenaSession(sessionId);
      setSummaryData(summary);
      setStatus('summary');
    } else {
      navigation.goBack();
    }
  };

  // Swipe reel logic
  const handleSwipeUp = () => {
    Animated.timing(slideAnim, {
      toValue: -800,
      duration: 200,
      useNativeDriver: true
    }).start(() => {
      if (status === 'answering') {
        handleSkip();
      } else if (status === 'incorrect' || status === 'correct') {
        handleAdvance(answerData?.next_question || null);
      }
    });
  };

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponderCapture: (evt, gestureState) => {
         return gestureState.dy < -40 && Math.abs(gestureState.vy) > 0.5;
      },
      onPanResponderRelease: (evt, gestureState) => {
         if (gestureState.dy < -50) {
            handleSwipeUp();
         } else {
            Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true }).start();
         }
      }
    })
  ).current;

  // ─── Renderers ──────────────────────────────────────────────────────────────

  const renderTopBar = () => (
    <View style={styles.header}>
      <TouchableOpacity style={styles.closeBtn} onPress={handleExit}>
        <X color={colors.textSecondary} size={24} />
      </TouchableOpacity>
      
      <View style={styles.headerCenter}>
        <View style={styles.ratingPill}>
          <Zap color="#E8B84B" size={14} style={{ marginRight: 4 }} />
          <Text style={styles.ratingText}>{rating}</Text>
          <Animated.Text style={[
            styles.deltaText, 
            { color: deltaColor, opacity: deltaOpacity, transform: [{ translateY: deltaTranslateY }] }
          ]}>
            {deltaText}
          </Animated.Text>
        </View>
        {timedMode && (
          <View style={styles.timerBarBg}>
            <View style={[styles.timerBarFill, { width: `${(timeLeft / 60) * 100}%`, backgroundColor: timeLeft <= 10 ? colors.tagRed : colors.primary }]} />
          </View>
        )}
      </View>
      
      <View style={{ width: 32 }} />
    </View>
  );

  const renderSummaryModal = () => {
    if (!summaryData) return null;
    const netChange = summaryData.rating_end - summaryData.rating_start;
    const isNetPos = netChange >= 0;
    
    return (
      <Modal visible={status === 'summary'} animationType="slide" transparent>
        <View style={styles.modalBg}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Arena Session Complete</Text>
            
            <View style={styles.summaryRatingBox}>
              <Text style={styles.summaryRatingVal}>{summaryData.rating_end}</Text>
              <Text style={[styles.summaryRatingNet, { color: isNetPos ? colors.success : colors.tagRed }]}>
                {isNetPos ? `+${netChange}` : `${netChange}`} Rating
              </Text>
            </View>

            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Text style={styles.statVal}>{summaryData.questions_answered}</Text>
                <Text style={styles.statLbl}>Answered</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statVal}>{summaryData.accuracy}%</Text>
                <Text style={styles.statLbl}>Accuracy</Text>
              </View>
            </View>
            
            {summaryData.weakest_concepts.length > 0 && (
              <View style={styles.conceptList}>
                <Text style={styles.conceptListTitle}>Weakest Concepts</Text>
                {summaryData.weakest_concepts.map(wc => (
                  <TouchableOpacity key={wc.concept_id} style={styles.weakConceptItem}>
                    <Text style={styles.weakConceptText}>{wc.concept_name}</Text>
                    <BookOpen color={colors.textSecondary} size={16} />
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <TouchableOpacity style={styles.primaryBtn} onPress={() => navigation.goBack()}>
              <Text style={styles.primaryBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };

  if (status === 'loading' && !currentQ) {
    return (
      <SafeAreaView style={styles.safeArea}>
        {renderTopBar()}
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      {renderTopBar()}
      {renderSummaryModal()}

      <Animated.View 
        style={[styles.container, { transform: [{ translateY: slideAnim }] }]}
        {...panResponder.panHandlers}
      >
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {currentQ && (
            <>
              <MathText content={currentQ.prompt} style={styles.questionText} />

              <View style={styles.optionsList}>
                {currentQ.options?.map((opt, index) => {
                  const isSelected = selectedOption === index;
                  const isAnswering = status === 'answering';
                  const isCorrect = status === 'correct' || status === 'incorrect';
                  
                  const isCorrectOption = isCorrect && index === (currentQ as any).correctIndex;

                  let bgColor = colors.surface;
                  let borderColor = colors.border;
                  
                  if (isCorrectOption && !isAnswering) {
                    bgColor = '#34D39915';
                    borderColor = '#34D399';
                  } else if (isSelected && status === 'incorrect') {
                    bgColor = colors.surfaceLight;
                    borderColor = colors.border;
                  } else if (isSelected && isAnswering) {
                    borderColor = colors.primary;
                  }

                  return (
                    <TouchableOpacity
                      key={index}
                      style={[styles.optionBtn, { backgroundColor: bgColor, borderColor }]}
                      onPress={() => handleSelect(index)}
                      activeOpacity={0.7}
                      disabled={!isAnswering}
                    >
                      <MathText content={opt} style={styles.optionText} />
                      {isCorrectOption && !isAnswering && <CheckCircle color="#34D399" size={20} />}
                    </TouchableOpacity>
                  );
                })}
              </View>

              {status === 'incorrect' && answerData && (
                <View style={styles.feedbackBox}>
                  <Text style={styles.shortExplanationText}>{answerData.short_explanation}</Text>
                  
                  {answerData.weak_concept_nudge && (
                    <TouchableOpacity style={styles.nudgeChip}>
                      <Target color="#E8B84B" size={16} />
                      <Text style={styles.nudgeChipText}>Weak on {answerData.weak_concept_nudge.concept_name} — Practice it</Text>
                      <ArrowRight color={colors.textSecondary} size={14} style={{ marginLeft: 'auto' }} />
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </>
          )}
        </ScrollView>
      </Animated.View>

      <View style={styles.footer}>
        {status === 'answering' && (
          <>
            <TouchableOpacity style={styles.skipBtn} onPress={handleSwipeUp}>
              <Text style={styles.skipText}>I don't know / Skip</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.submitBtn, selectedOption === null && { opacity: 0.5 }]} 
              onPress={handleSubmit}
              disabled={selectedOption === null}
            >
              <Text style={styles.submitBtnText}>Submit</Text>
            </TouchableOpacity>
          </>
        )}

        {status === 'incorrect' && (
          <View style={styles.swipeHintContainer}>
            <Text style={styles.swipeHintText}>Swipe up for next question</Text>
          </View>
        )}
        
        {status === 'correct' && (
          <View style={styles.swipeHintContainer}>
            <Text style={[styles.swipeHintText, { color: colors.success }]}>Correct! Getting next...</Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  closeBtn: { padding: 4 },
  headerCenter: { alignItems: 'center', justifyContent: 'center' },
  ratingPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 100, borderWidth: 1, borderColor: colors.border, position: 'relative' },
  ratingText: { color: colors.text, fontSize: 16, fontWeight: '800' },
  deltaText: { position: 'absolute', right: -35, top: 4, fontSize: 14, fontWeight: '700' },
  timerBarBg: { width: 100, height: 4, backgroundColor: colors.surfaceLight, borderRadius: 2, marginTop: 8, overflow: 'hidden' },
  timerBarFill: { height: '100%', borderRadius: 2 },
  
  container: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },
  
  questionText: { color: colors.text, fontSize: 18, lineHeight: 28, fontWeight: '500', marginBottom: 24 },
  
  optionsList: { gap: 12 },
  optionBtn: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderRadius: 12, borderWidth: 1 },
  optionText: { color: colors.text, fontSize: 16, flex: 1, marginRight: 12 },
  
  feedbackBox: { marginTop: 24, padding: 16, backgroundColor: colors.surface, borderRadius: 12, borderWidth: 1, borderColor: colors.border },
  shortExplanationText: { color: colors.text, fontSize: 15, lineHeight: 22, fontWeight: '500', marginBottom: 16 },
  nudgeChip: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#E8B84B15', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#E8B84B40' },
  nudgeChipText: { color: '#E8B84B', fontSize: 14, fontWeight: '600' },
  
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.background },
  skipBtn: { padding: 12 },
  skipText: { color: colors.textSecondary, fontSize: 14, fontWeight: '600' },
  submitBtn: { backgroundColor: colors.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 100 },
  submitBtnText: { color: '#000', fontSize: 15, fontWeight: '700' },
  
  swipeHintContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 12 },
  swipeHintText: { color: colors.textSecondary, fontSize: 14, fontWeight: '600', letterSpacing: 0.5 },

  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', padding: 16 },
  summaryCard: { backgroundColor: colors.surface, borderRadius: 24, padding: 24, borderWidth: 1, borderColor: colors.border },
  summaryTitle: { color: colors.textSecondary, fontSize: 14, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, textAlign: 'center', marginBottom: 24 },
  
  summaryRatingBox: { alignItems: 'center', marginBottom: 32 },
  summaryRatingVal: { color: colors.text, fontSize: 64, fontWeight: '800', letterSpacing: -2, lineHeight: 70 },
  summaryRatingNet: { fontSize: 18, fontWeight: '700' },

  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  statBox: { flex: 1, backgroundColor: colors.surfaceLight, padding: 16, borderRadius: 12, alignItems: 'center' },
  statVal: { color: colors.text, fontSize: 24, fontWeight: '700', marginBottom: 4 },
  statLbl: { color: colors.textSecondary, fontSize: 13, fontWeight: '500' },
  
  conceptList: { paddingVertical: 16, borderTopWidth: 1, borderTopColor: colors.border, marginBottom: 12 },
  conceptListTitle: { color: colors.text, fontSize: 16, fontWeight: '700', marginBottom: 12 },
  weakConceptItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.surfaceLight, padding: 16, borderRadius: 8, marginBottom: 8 },
  weakConceptText: { color: colors.text, fontSize: 14, fontWeight: '500' },

  primaryBtn: { backgroundColor: colors.primary, paddingHorizontal: 24, paddingVertical: 16, borderRadius: 100, width: '100%', alignItems: 'center', marginTop: 12 },
  primaryBtnText: { color: '#000', fontSize: 16, fontWeight: '700' },
});
