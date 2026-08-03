import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ActivityIndicator, TextInput, FlatList, AppState, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, CheckCircle, Flame, ChevronLeft, Bookmark, Flag, Share2, AlertTriangle, Trophy } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { colors } from '../../theme/colors';
import { Question, AnswerResponse, SessionSummary } from '../../services/api.mock';
import { EngineApi } from '../../services/api';
import QuestionCard from '../../components/QuestionCard';

export interface FeedItem {
  id: string;
  type: 'question' | 'loading';
  question?: Question;
  status?: 'answering' | 'correct' | 'incorrect' | 'skipped' | 'loading';
  selectedOption?: number | null;
  answerData?: AnswerResponse | null;
}

export default function AdaptiveSessionScreen({ navigation, route }: any) {
  const { chapterId, chapterTitle, conceptId } = route.params || { chapterId: 'c1', chapterTitle: 'Practice' };
  
  const [sessionId, setSessionId] = useState<string | null>(null);
  
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [sessionStatus, setSessionStatus] = useState<'loading' | 'error' | 'active' | 'exhausted' | 'summary'>('loading');
  const [summaryData, setSummaryData] = useState<SessionSummary | null>(null);
  
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isProcessingSkip, setIsProcessingSkip] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  // Session Strip Stats
  const [interactionCount, setInteractionCount] = useState(0);
  const [accuracy, setAccuracy] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [streak, setStreak] = useState(0);
  const [sessionTime, setSessionTime] = useState(0);

  // Global Session Timer
  useEffect(() => {
    const timer = setInterval(() => {
      setSessionTime(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // Toast State
  const [toastMsg, setToastMsg] = useState('');

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 2500);
  };

  // Report State
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState<string | null>(null);
  const [reportDetails, setReportDetails] = useState('');

  const [cardHeight, setCardHeight] = useState(0);

  // ── Anti-cheat: App Switch Detection ──
  const [showSwitchWarning, setShowSwitchWarning] = useState(false);
  const switchWarningShownRef = useRef(false);
  const appStateRef = useRef(AppState.currentState);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      // User went to background or inactive
      if (
        appStateRef.current === 'active' &&
        (nextAppState === 'background' || nextAppState === 'inactive')
      ) {
        if (sessionStatus === 'active') {
          if (switchWarningShownRef.current) {
            // Second offense — end the session
            navigation.goBack();
          } else {
            // First offense — show warning when they come back
            switchWarningShownRef.current = true;
          }
        }
      }

      // User came back to foreground
      if (
        (appStateRef.current === 'background' || appStateRef.current === 'inactive') &&
        nextAppState === 'active'
      ) {
        if (switchWarningShownRef.current && sessionStatus === 'active') {
          setShowSwitchWarning(true);
        }
      }

      appStateRef.current = nextAppState;
    });

    return () => subscription.remove();
  }, [sessionStatus]);

  useEffect(() => {
    const initSession = async () => {
      setSessionStatus('loading');
      try {
        const res = await EngineApi.startSession(chapterId, conceptId);
        setSessionId(res.session_id);
        
        if (res.exhausted || !res.first_question) {
          setSessionStatus('exhausted');
          return;
        }

        setFeed([{
          id: res.first_question.question_id,
          type: 'question',
          question: res.first_question,
          status: 'answering',
          selectedOption: null,
          answerData: null
        }]);
        setSessionStatus('active');
      } catch (err: any) {
        console.error("Error starting session:", err);
        setSessionStatus('error');
        
        const detail = err.response?.data?.detail;
        if (err.response?.status === 404) {
          setErrorMsg("No questions have been added for this concept yet!");
        } else if (detail) {
          setErrorMsg(detail);
        } else {
          setErrorMsg("Something went wrong loading this session.");
        }
      }
    };
    initSession();
  }, [chapterId]);

  const updateFeedItem = (index: number, updates: Partial<FeedItem>) => {
    setFeed(prev => {
      const newFeed = [...prev];
      if (newFeed[index]) {
        newFeed[index] = { ...newFeed[index], ...updates };
      }
      return newFeed;
    });
  };

  const handleSelect = (index: number) => {
    if (feed[currentIndex]?.status !== 'answering') return;
    updateFeedItem(currentIndex, { selectedOption: index });
  };

  const handleSubmit = async () => {
    const currentItem = feed[currentIndex];
    if (currentItem?.status !== 'answering' || currentItem.selectedOption === null || !sessionId || !currentItem.question) return;
    
    // Optimistic disable
    updateFeedItem(currentIndex, { status: 'loading' });
    
    try {
      const res = await EngineApi.submitAnswer(sessionId, currentItem.question.question_id, currentItem.selectedOption, 2500);
      
      const newInteractions = interactionCount + 1;
      setInteractionCount(newInteractions);
      
      const isCorrect = res.correct;
      if (isCorrect) {
        const newCorrect = correctCount + 1;
        setCorrectCount(newCorrect);
        setStreak(s => s + 1);
        setAccuracy(Math.round((newCorrect / newInteractions) * 100));
      } else {
        setStreak(0);
        setAccuracy(Math.round((correctCount / newInteractions) * 100));
      }

      setFeed(prev => {
        const newFeed = [...prev];
        newFeed[currentIndex] = {
          ...newFeed[currentIndex],
          status: isCorrect ? 'correct' : 'incorrect',
          answerData: res
        };
        if (!res.chapter_exhausted && res.next_question) {
          newFeed.push({
            id: res.next_question.question_id,
            type: 'question',
            question: res.next_question,
            status: 'answering',
            selectedOption: null,
            answerData: null
          });
        }
        return newFeed;
      });

      if (res.chapter_exhausted) {
        setSessionStatus('exhausted');
      }

      if (isCorrect && !res.chapter_exhausted) {
        setTimeout(() => {
          flatListRef.current?.scrollToIndex({ index: currentIndex + 1, animated: true });
        }, 1200);
      }
      
    } catch (err) {
      console.error(err);
      updateFeedItem(currentIndex, { status: 'answering' });
    }
  };

  const handleSkip = async (skipIndex: number) => {
    const skipItem = feed[skipIndex];
    if (skipItem?.status !== 'answering' || !sessionId || !skipItem.question) return;
    if (isProcessingSkip) return;
    setIsProcessingSkip(true);
    
    try {
      const res = await EngineApi.skipQuestion(sessionId, skipItem.question.question_id);
      setInteractionCount(c => c + 1);
      setStreak(0);

      if (res.concept_deferred) {
        showToast("We'll come back to this concept later");
      }

      setFeed(prev => {
        const newFeed = [...prev];
        newFeed[skipIndex] = {
          ...newFeed[skipIndex],
          status: 'skipped'
        };
        if (!res.chapter_exhausted && res.next_question) {
          newFeed.push({
            id: res.next_question.question_id,
            type: 'question',
            question: res.next_question,
            status: 'answering',
            selectedOption: null,
            answerData: null
          });
        }
        return newFeed;
      });

      if (res.chapter_exhausted) {
        setSessionStatus('exhausted');
      }
      
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessingSkip(false);
    }
  };

  const onViewableItemsChanged = useCallback(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      const index = viewableItems[0].index;
      setCurrentIndex(index);
      const item = viewableItems[0].item;
      if (!item) return;

      if (item.type === 'loading') {
        const prevIndex = index - 1;
        if (prevIndex >= 0 && feed[prevIndex]?.status === 'answering') {
          handleSkip(prevIndex);
        }
      }
    }
  }, [feed, isProcessingSkip]);

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 50 }).current;

  const handleExit = async () => {
    if (sessionId) {
      setSessionStatus('loading');
      try {
        const summary = await EngineApi.endSession(sessionId);
        setSummaryData(summary);
        setSessionStatus('summary');
      } catch (err) {
        navigation.goBack();
      }
    } else {
      navigation.goBack();
    }
  };

  const handleBookmark = () => showToast("Saved");
  const handleReport = () => setIsReportOpen(true);
  const handleChallenge = () => showToast("Challenge sent!");

  const submitReport = async () => {
    const currentItem = feed[currentIndex];
    if (!reportReason || !currentItem?.question) return;
    try {
      await EngineApi.reportQuestion(currentItem.question.question_id, reportReason, reportDetails);
      showToast("Thanks, we'll take a look");
    } catch (err) {
      showToast("Failed to send report");
    } finally {
      setIsReportOpen(false);
      setReportReason(null);
      setReportDetails('');
    }
  };

  // ──────────────────────────────────────────
  // Header: exact replica from screenshot
  // ──────────────────────────────────────────
  const renderHeader = () => (
    <View style={styles.headerWrap}>
      {/* Row 1: Back on left · Logo centered */}
      <View style={styles.headerTop}>
        <TouchableOpacity 
          style={{ position: 'absolute', left: 16, zIndex: 10 }}
          onPress={handleExit} 
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <ChevronLeft color="#FFF" size={26} strokeWidth={2.5} />
        </TouchableOpacity>

        <View style={styles.logoRow}>
          <Image 
            source={require('../../../assets/logo.png')} 
            style={{ height: 32, width: 140 }} 
            resizeMode="contain" 
          />
        </View>
      </View>

      {/* Thin separator */}
      <View style={styles.sep} />

      {/* Row 2: Stats left · Actions right */}
      <View style={styles.headerBottom}>
        <View style={styles.statsRow}>
          <Text style={styles.statLabel}>{formatTime(sessionTime)}</Text>
          <Text style={styles.statLabel}>{currentIndex + 1} Qns</Text>
          <View style={styles.streakPill}>
            <Flame color="#FFF" size={14} />
            <Text style={styles.streakNum}>{streak}</Text>
          </View>
        </View>

        <View style={styles.actionsRow}>
          <TouchableOpacity onPress={handleBookmark} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Bookmark color="#777" size={18} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleChallenge} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Share2 color="#777" size={18} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleReport} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Flag color="#777" size={18} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Second separator */}
      <View style={styles.sep} />
    </View>
  );

  // ──────────────────────────────────────────
  // States: loading / error / exhausted
  // ──────────────────────────────────────────

  const renderExhaustedState = () => (
    <View style={[styles.centeredState, { flex: 1 }]}>
      <LinearGradient
        colors={['rgba(128, 238, 193, 0.1)', 'transparent']}
        style={StyleSheet.absoluteFill}
      />
      <View style={{
        alignItems: 'center',
        padding: 32,
        backgroundColor: 'rgba(22, 22, 26, 0.8)',
        borderRadius: 24,
        borderWidth: 1,
        borderColor: 'rgba(128, 238, 193, 0.3)',
        shadowColor: '#80EEC1',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 20,
        elevation: 10,
      }}>
        <Trophy color="#80EEC1" size={64} style={{ marginBottom: 24 }} />
        <Text style={[styles.stateTitle, { color: '#FFF' }]}>You are a Master Now!</Text>
        <Text style={[styles.stateSub, { color: '#A1A1AA' }]}>
          You have successfully conquered all questions available for this concept.
        </Text>
        <TouchableOpacity style={styles.primaryBtn} onPress={handleExit}>
          <Text style={styles.primaryBtnText}>Review Summary</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderErrorState = () => (
    <View style={styles.centeredState}>
      <Text style={styles.stateTitle}>Connection Error</Text>
      <Text style={styles.stateSub}>
        {errorMsg || "Failed to connect to the backend engine."}
      </Text>
      <TouchableOpacity style={styles.primaryBtn} onPress={() => navigation.goBack()}>
        <Text style={styles.primaryBtnText}>Go Back</Text>
      </TouchableOpacity>
    </View>
  );

  // ──────────────────────────────────────────
  // Modals
  // ──────────────────────────────────────────

  const renderReportModal = () => (
    <Modal visible={isReportOpen} animationType="slide" transparent>
      <View style={styles.modalBg}>
        <View style={styles.modalCard}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <Text style={styles.modalTitle}>Report Question</Text>
            <TouchableOpacity onPress={() => setIsReportOpen(false)}>
              <X color="#777" size={24} />
            </TouchableOpacity>
          </View>
          
          <Text style={{ fontFamily: 'Montserrat_600SemiBold', color: '#888', marginBottom: 12 }}>What's wrong?</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
            {['Answer key looks wrong', 'Typo/unclear wording', 'Diagram broken', 'Duplicate of another question', 'Other'].map(r => (
              <TouchableOpacity 
                key={r} 
                style={{
                  paddingHorizontal: 12, paddingVertical: 8, borderRadius: 100, borderWidth: 1,
                  borderColor: reportReason === r ? '#69F0AE' : '#2A2A2E',
                  backgroundColor: reportReason === r ? 'rgba(105,240,174,0.1)' : '#1A1A1E'
                }}
                onPress={() => setReportReason(r)}
              >
                <Text style={{ fontFamily: 'Montserrat_600SemiBold', color: reportReason === r ? '#69F0AE' : '#E0E0E0', fontSize: 13 }}>{r}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {reportReason === 'Other' && (
            <TextInput 
              style={{ backgroundColor: '#1A1A1E', color: '#FFF', padding: 12, borderRadius: 8, fontFamily: 'Montserrat_500Medium', marginBottom: 16, borderWidth: 1, borderColor: '#2A2A2E' }}
              placeholder="Any additional details?"
              placeholderTextColor="#555"
              value={reportDetails}
              onChangeText={setReportDetails}
            />
          )}
          
          {reportReason && (
            <TouchableOpacity style={styles.primaryBtn} onPress={submitReport}>
              <Text style={styles.primaryBtnText}>Submit Report</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );

  const renderSummaryModal = () => (
    <Modal visible={sessionStatus === 'summary'} animationType="slide" transparent>
      <View style={styles.modalBg}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>Session Complete</Text>
          <View style={{ flexDirection: 'row', gap: 12, marginVertical: 20 }}>
            <View style={styles.summaryStatBox}>
              <Text style={styles.summaryStatVal}>{summaryData?.questions_answered}</Text>
              <Text style={styles.summaryStatLbl}>Answered</Text>
            </View>
            <View style={styles.summaryStatBox}>
              <Text style={styles.summaryStatVal}>{summaryData?.accuracy}%</Text>
              <Text style={styles.summaryStatLbl}>Accuracy</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.primaryBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.primaryBtnText}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  // ──────────────────────────────────────────
  // Early returns for non-active states
  // ──────────────────────────────────────────

  if (sessionStatus === 'loading') {
    return (
      <SafeAreaView style={styles.safeArea}>
        {renderHeader()}
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <ActivityIndicator color="#69F0AE" size="large" />
        </View>
      </SafeAreaView>
    );
  }

  if (sessionStatus === 'error') {
    return (
      <SafeAreaView style={styles.safeArea}>
        {renderHeader()}
        {renderErrorState()}
      </SafeAreaView>
    );
  }

  if (sessionStatus === 'exhausted' && feed.length === 0) {
    return (
      <SafeAreaView style={styles.safeArea}>
        {renderHeader()}
        {renderExhaustedState()}
      </SafeAreaView>
    );
  }

  // ──────────────────────────────────────────
  // Main Render: Reel-style FlatList
  // ──────────────────────────────────────────

  const flatListData = [...feed];
  const lastItem = feed[feed.length - 1];
  if (lastItem && lastItem.status === 'answering' && !isProcessingSkip) {
    flatListData.push({
      id: 'loading-skip',
      type: 'loading'
    });
  } else if (sessionStatus === 'exhausted' && lastItem && lastItem.status !== 'answering') {
    flatListData.push({
      id: 'exhausted-end',
      type: 'loading'
    });
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      {renderHeader()}
      
      {!!toastMsg && (
        <View style={styles.toastWrap} pointerEvents="none">
          <View style={styles.toastPill}>
            <Text style={styles.toastText}>{toastMsg}</Text>
          </View>
        </View>
      )}

      {renderSummaryModal()}
      {renderReportModal()}

      {/* Anti-cheat warning modal */}
      <Modal visible={showSwitchWarning} animationType="fade" transparent>
        <View style={styles.modalBg}>
          <View style={[styles.modalCard, { alignItems: 'center' }]}>
            <AlertTriangle color="#F59E0B" size={48} style={{ marginBottom: 16 }} />
            <Text style={[styles.modalTitle, { marginBottom: 8 }]}>Don't switch apps!</Text>
            <Text style={{ fontFamily: 'Montserrat_500Medium', color: '#999', fontSize: 14, textAlign: 'center', lineHeight: 22, marginBottom: 24 }}>
              Switching to another app during practice is not allowed. If you do it again, your session will end automatically.
            </Text>
            <TouchableOpacity 
              style={styles.primaryBtn} 
              onPress={() => setShowSwitchWarning(false)}
            >
              <Text style={styles.primaryBtnText}>Continue Practicing</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <View 
        style={{ flex: 1, overflow: 'hidden' }} 
        onLayout={(e) => setCardHeight(e.nativeEvent.layout.height)}
      >
        {cardHeight > 0 && (
          <FlatList
            ref={flatListRef}
            data={flatListData}
            keyExtractor={item => item.id}
            showsVerticalScrollIndicator={false}
            pagingEnabled
            snapToInterval={cardHeight}
            decelerationRate="fast"
            onViewableItemsChanged={onViewableItemsChanged}
            viewabilityConfig={viewabilityConfig}
            renderItem={({ item }) => (
              <View style={{ height: cardHeight }}>
                {item.type === 'question' && item.question ? (
                  <QuestionCard
                    question={item.question}
                    status={item.status as any}
                    selectedOption={item.selectedOption ?? null}
                    answerData={item.answerData ?? null}
                    masteryLevel={Math.max(10, accuracy)}
                    onSelect={handleSelect}
                    onSubmit={handleSubmit}
                    onSkip={() => {}}
                    onBookmark={handleBookmark}
                    onReport={handleReport}
                    onChallenge={handleChallenge}
                  />
                ) : (
                  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    {item.id === 'exhausted-end' ? (
                      <View style={{
                        alignItems: 'center',
                        padding: 32,
                        backgroundColor: 'rgba(22, 22, 26, 0.8)',
                        borderRadius: 24,
                        borderWidth: 1,
                        borderColor: 'rgba(128, 238, 193, 0.3)',
                        shadowColor: '#80EEC1',
                        shadowOffset: { width: 0, height: 0 },
                        shadowOpacity: 0.5,
                        shadowRadius: 20,
                        elevation: 10,
                        margin: 20,
                      }}>
                        <Trophy color="#80EEC1" size={56} style={{ marginBottom: 24 }} />
                        <Text style={{ color: '#FFF', fontFamily: 'Montserrat_700Bold', fontSize: 24, textAlign: 'center', marginBottom: 12 }}>You are a Master Now!</Text>
                        <Text style={{ color: '#A1A1AA', fontFamily: 'Montserrat_500Medium', fontSize: 15, textAlign: 'center', lineHeight: 22 }}>
                          You have successfully conquered all questions available for this concept.
                        </Text>
                        <TouchableOpacity style={[styles.primaryBtn, { marginTop: 24, width: '100%' }]} onPress={handleExit}>
                          <Text style={styles.primaryBtnText}>Review Summary</Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <>
                        <ActivityIndicator color="#69F0AE" size="large" />
                        <Text style={{ marginTop: 16, color: '#777', fontFamily: 'Montserrat_600SemiBold' }}>Fetching next question...</Text>
                      </>
                    )}
                  </View>
                )}
              </View>
            )}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

// ──────────────────────────────────────────
// Styles — pixel-matched to screenshot
// ──────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#000',
  },

  // ── Header ──
  headerWrap: {
    backgroundColor: '#000',
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center', // Center logo
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 56,
  },
  logoRow: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  sep: {
    height: 1,
    backgroundColor: '#222',
  },
  headerBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  statLabel: {
    fontFamily: 'Montserrat_600SemiBold',
    color: '#999',
    fontSize: 15,
  },
  streakPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  streakNum: {
    fontFamily: 'Montserrat_700Bold',
    color: '#FFF',
    fontSize: 15,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },

  // ── States ──
  centeredState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  stateTitle: {
    fontFamily: 'Montserrat_800ExtraBold',
    color: '#FFF',
    fontSize: 24,
    marginBottom: 12,
  },
  stateSub: {
    fontFamily: 'Montserrat_600SemiBold',
    color: '#888',
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },

  // ── Buttons ──
  primaryBtn: {
    backgroundColor: '#69F0AE',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 100,
    width: '100%',
    alignItems: 'center',
  },
  primaryBtnText: {
    fontFamily: 'Montserrat_800ExtraBold',
    color: '#000',
    fontSize: 16,
  },

  // ── Toast ──
  toastWrap: {
    position: 'absolute',
    top: 140,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 100,
  },
  toastPill: {
    backgroundColor: '#1A1A1E',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: '#2A2A2E',
  },
  toastText: {
    fontFamily: 'Montserrat_700Bold',
    color: '#FFF',
    fontSize: 13,
  },

  // ── Modals ──
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#111',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 48,
  },
  modalTitle: {
    fontFamily: 'Montserrat_800ExtraBold',
    color: '#FFF',
    fontSize: 22,
    textAlign: 'center',
  },
  summaryStatBox: {
    flex: 1,
    backgroundColor: '#1A1A1E',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  summaryStatVal: {
    fontFamily: 'Montserrat_800ExtraBold',
    color: '#FFF',
    fontSize: 24,
    marginBottom: 4,
  },
  summaryStatLbl: {
    fontFamily: 'Montserrat_600SemiBold',
    color: '#888',
    fontSize: 13,
  },
});
