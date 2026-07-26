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
import { X, CheckCircle, XCircle, ArrowRight, SkipForward, AlertCircle } from 'lucide-react-native';
import { colors } from '../../theme/colors';
import { MockEngineApi, Question, AnswerResponse, SessionSummary } from '../../services/api.mock';

// ─── MathText Dummy Component ─────────────────────────────────────────────────
// In a real implementation, replace this with react-native-math-view or react-native-katex
const MathText = ({ content, style }: { content: string, style?: any }) => {
  return <Text style={[style, { fontFamily: 'System' }]}>{content}</Text>;
};

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AdaptiveSessionScreen({ navigation, route }: any) {
  const { chapterId, chapterTitle } = route.params || { chapterId: 'c1', chapterTitle: 'Practice' };
  
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [currentQ, setCurrentQ] = useState<Question | null>(null);
  
  const [status, setStatus] = useState<'loading' | 'answering' | 'correct' | 'incorrect' | 'exhausted' | 'summary'>('loading');
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [answerData, setAnswerData] = useState<AnswerResponse | null>(null);
  const [summaryData, setSummaryData] = useState<SessionSummary | null>(null);
  
  // Stats for the top bar progress (count of answered/skipped)
  const [interactionCount, setInteractionCount] = useState(0);

  // Animations
  const toastOpacity = useRef(new Animated.Value(0)).current;
  const [toastMsg, setToastMsg] = useState('');

  const showToast = (msg: string) => {
    setToastMsg(msg);
    Animated.sequence([
      Animated.timing(toastOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.delay(2000),
      Animated.timing(toastOpacity, { toValue: 0, duration: 300, useNativeDriver: true })
    ]).start();
  };

  const slideAnim = useRef(new Animated.Value(0)).current;

  // Animate new question coming in from bottom
  useEffect(() => {
    if (currentQ) {
      slideAnim.setValue(800);
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        friction: 8,
        tension: 50
      }).start();
    }
  }, [currentQ?.question_id]);

  const handleSwipeUp = () => {
    Animated.timing(slideAnim, {
      toValue: -800,
      duration: 250,
      useNativeDriver: true
    }).start(() => {
      // Trigger advance logic after it slides out
      if (status === 'answering') {
        handleSkip();
      } else if (status === 'incorrect' || status === 'correct') {
        handleAdvance(answerData?.next_question || null, answerData?.chapter_exhausted || false);
      }
    });
  };

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponderCapture: (evt, gestureState) => {
         // Capture if it's a strong upward swipe (dy is negative for swipe up)
         return gestureState.dy < -40 && Math.abs(gestureState.vy) > 0.5;
      },
      onPanResponderRelease: (evt, gestureState) => {
         if (gestureState.dy < -50) {
            handleSwipeUp();
         } else {
            // snap back if swipe wasn't far enough
            Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true }).start();
         }
      }
    })
  ).current;

  useEffect(() => {
    const initSession = async () => {
      setStatus('loading');
      const res = await MockEngineApi.startSession(chapterId);
      setSessionId(res.session_id);
      setCurrentQ(res.first_question);
      setStatus('answering');
    };
    initSession();
  }, [chapterId]);

  const handleSelect = (index: number) => {
    if (status !== 'answering') return;
    setSelectedOption(index);
  };

  const handleSubmit = async () => {
    if (status !== 'answering' || selectedOption === null || !sessionId || !currentQ) return;
    
    setStatus('loading');
    const res = await MockEngineApi.submitAnswer(sessionId, currentQ.question_id, selectedOption, 2500);
    setAnswerData(res);
    setInteractionCount(c => c + 1);

    if (res.correct) {
      setStatus('correct');
      // Auto-advance after 1.2s
      setTimeout(() => {
        handleAdvance(res.next_question, res.chapter_exhausted);
      }, 1200);
    } else {
      setStatus('incorrect');
    }
  };

  const handleSkip = async () => {
    if (status !== 'answering' || !sessionId || !currentQ) return;
    
    setStatus('loading');
    const res = await MockEngineApi.skipQuestion(sessionId, currentQ.question_id);
    setInteractionCount(c => c + 1);

    if (res.concept_deferred) {
      showToast("We'll come back to this concept later");
    }

    handleAdvance(res.next_question, res.chapter_exhausted);
  };

  const handleAdvance = (nextQ: Question | null, isExhausted: boolean) => {
    if (isExhausted) {
      setStatus('exhausted');
    } else if (nextQ) {
      setCurrentQ(nextQ);
      setSelectedOption(null);
      setAnswerData(null);
      setStatus('answering');
    }
  };

  const handleExit = async () => {
    if (sessionId) {
      setStatus('loading');
      const summary = await MockEngineApi.endSession(sessionId);
      setSummaryData(summary);
      setStatus('summary');
    } else {
      navigation.goBack();
    }
  };

  // ─── Renderers ──────────────────────────────────────────────────────────────

  const renderTopBar = () => {
    return (
      <View style={styles.header}>
        <TouchableOpacity style={styles.closeBtn} onPress={handleExit}>
          <X color={colors.textSecondary} size={24} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>{chapterTitle}</Text>
          <Text style={styles.headerSubtitle}>{interactionCount} interactions</Text>
        </View>
        <View style={{ width: 32 }} />
      </View>
    );
  };

  const renderToast = () => (
    <Animated.View style={[styles.toastContainer, { opacity: toastOpacity }]} pointerEvents="none">
      <View style={styles.toastInner}>
        <Text style={styles.toastText}>{toastMsg}</Text>
      </View>
    </Animated.View>
  );

  const renderExhaustedState = () => (
    <View style={styles.exhaustedContainer}>
      <CheckCircle color="#34D399" size={64} style={{ marginBottom: 24 }} />
      <Text style={styles.exhaustedTitle}>You're all caught up!</Text>
      <Text style={styles.exhaustedSubtitle}>
        You've worked through everything available in this chapter right now.
      </Text>
      
      <TouchableOpacity style={styles.primaryBtn} onPress={handleExit}>
        <Text style={styles.primaryBtnText}>Review Summary</Text>
      </TouchableOpacity>
    </View>
  );

  const renderSummaryModal = () => (
    <Modal visible={status === 'summary'} animationType="slide" transparent>
      <View style={styles.modalBg}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Session Complete</Text>
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statVal}>{summaryData?.questions_answered}</Text>
              <Text style={styles.statLbl}>Answered</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statVal}>{summaryData?.accuracy}%</Text>
              <Text style={styles.statLbl}>Accuracy</Text>
            </View>
          </View>
          
          {(summaryData?.concepts_mastered.length || 0) > 0 && (
            <View style={styles.conceptList}>
              <Text style={styles.conceptListTitle}>Newly Mastered</Text>
              <Text style={styles.conceptListVal}>{summaryData?.concepts_mastered.length} Concepts</Text>
            </View>
          )}

          {(summaryData?.concepts_needing_revisit.length || 0) > 0 && (
            <View style={styles.conceptList}>
              <Text style={styles.conceptListTitle}>Needs Revisit</Text>
              <Text style={[styles.conceptListVal, { color: '#E8B84B' }]}>{summaryData?.concepts_needing_revisit.length} Concepts</Text>
            </View>
          )}

          <TouchableOpacity style={styles.primaryBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.primaryBtnText}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

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

  if (status === 'exhausted') {
    return (
      <SafeAreaView style={styles.safeArea}>
        {renderTopBar()}
        {renderExhaustedState()}
      </SafeAreaView>
    );
  }

  // Active Question Render
  return (
    <SafeAreaView style={styles.safeArea}>
      {renderTopBar()}
      {renderToast()}
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
                
                // We mock knowing the correct index purely for styling during the 'incorrect' state
                // In reality, the server tells us if it was correct. If we want to highlight the correct answer,
                // the server should return the correct index in the solution payload.
                // Assuming `isCorrectOption` is passed or can be inferred (using a mock fallback here).
                const isCorrectOption = (status === 'incorrect' || status === 'correct') && index === (currentQ as any).correctIndex;

                let bgColor = colors.surface;
                let borderColor = colors.border;
                
                if (isCorrectOption && !isAnswering) {
                  bgColor = '#34D39915';
                  borderColor = '#34D399';
                } else if (isSelected && status === 'incorrect') {
                  bgColor = colors.surfaceLight;
                  borderColor = colors.border; // neutral tone per rules (no red-heavy punitive styling)
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

            {status === 'incorrect' && answerData?.solution && (
              <View style={styles.solutionBox}>
                <Text style={styles.solutionTitle}>Solution</Text>
                {answerData.solution.misconception_tag && (
                  <View style={styles.misconceptionBox}>
                    <Text style={styles.misconceptionText}>💡 {answerData.solution.misconception_tag}</Text>
                  </View>
                )}
                {answerData.solution.steps.map((step, i) => (
                  <MathText key={i} content={`${i + 1}. ${step}`} style={styles.solutionText} />
                ))}
              </View>
            )}
          </>
        )}
        </ScrollView>
      </Animated.View>

      {/* Bottom Action Row */}
      <View style={styles.footer}>
        {status === 'answering' && (
          <>
            <TouchableOpacity style={styles.skipBtn} onPress={handleSkip}>
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
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  closeBtn: { padding: 4 },
  headerTitleContainer: { alignItems: 'center' },
  headerTitle: { color: colors.text, fontSize: 16, fontWeight: '700' },
  headerSubtitle: { color: colors.textSecondary, fontSize: 12, fontWeight: '500', marginTop: 2 },
  
  container: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },
  
  questionText: { color: colors.text, fontSize: 18, lineHeight: 28, fontWeight: '500', marginBottom: 24 },
  
  optionsList: { gap: 12 },
  optionBtn: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderRadius: 12, borderWidth: 1 },
  optionText: { color: colors.text, fontSize: 16, flex: 1, marginRight: 12 },
  
  solutionBox: { marginTop: 24, padding: 16, backgroundColor: colors.surface, borderRadius: 12, borderWidth: 1, borderColor: colors.border },
  solutionTitle: { color: colors.text, fontSize: 16, fontWeight: '700', marginBottom: 12 },
  solutionText: { color: colors.textSecondary, fontSize: 14, lineHeight: 22, marginBottom: 8 },
  misconceptionBox: { backgroundColor: '#9B6FFF15', padding: 12, borderRadius: 8, marginBottom: 12, borderWidth: 1, borderColor: '#9B6FFF30' },
  misconceptionText: { color: colors.primary, fontSize: 13, fontWeight: '600' },
  
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.background },
  skipBtn: { padding: 12 },
  skipText: { color: colors.textSecondary, fontSize: 14, fontWeight: '600' },
  submitBtn: { backgroundColor: colors.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 100 },
  submitBtnText: { color: '#000', fontSize: 15, fontWeight: '700' },
  
  swipeHintContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 12 },
  swipeHintText: { color: colors.textSecondary, fontSize: 14, fontWeight: '600', letterSpacing: 0.5 },

  toastContainer: { position: 'absolute', top: 70, left: 0, right: 0, alignItems: 'center', zIndex: 100 },
  toastInner: { backgroundColor: colors.surfaceElevated, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 100, borderWidth: 1, borderColor: colors.border },
  toastText: { color: colors.text, fontSize: 13, fontWeight: '600' },

  exhaustedContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  exhaustedTitle: { color: colors.text, fontSize: 24, fontWeight: '700', marginBottom: 12 },
  exhaustedSubtitle: { color: colors.textSecondary, fontSize: 15, textAlign: 'center', lineHeight: 22, marginBottom: 32 },
  primaryBtn: { backgroundColor: colors.primary, paddingHorizontal: 24, paddingVertical: 14, borderRadius: 100, width: '100%', alignItems: 'center' },
  primaryBtnText: { color: '#000', fontSize: 16, fontWeight: '700' },

  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  summaryCard: { backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 48 },
  summaryTitle: { color: colors.text, fontSize: 22, fontWeight: '700', marginBottom: 24, textAlign: 'center' },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  statBox: { flex: 1, backgroundColor: colors.surfaceLight, padding: 16, borderRadius: 12, alignItems: 'center' },
  statVal: { color: colors.text, fontSize: 24, fontWeight: '700', marginBottom: 4 },
  statLbl: { color: colors.textSecondary, fontSize: 13, fontWeight: '500' },
  conceptList: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderTopWidth: 1, borderTopColor: colors.border, marginBottom: 12 },
  conceptListTitle: { color: colors.text, fontSize: 15, fontWeight: '600' },
  conceptListVal: { color: colors.success, fontSize: 15, fontWeight: '700' }
});
