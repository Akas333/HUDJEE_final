import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Animated as RNAnimated,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Bell, Footprints } from 'lucide-react-native';
import { useProgressStore } from '../store/progressStore';

const { width } = Dimensions.get('window');
const CONTENT_PADDING = 16;
const CARD_WIDTH = width - (CONTENT_PADDING * 2);
export default function DashboardScreen({ navigation }: any) {
  const fadeAnim = useRef(new RNAnimated.Value(0)).current;
  const scrollViewRef = useRef<ScrollView>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const fetchDashboardSummary = useProgressStore((state) => state.fetchDashboardSummary);
  const dashboardSummary = useProgressStore((state) => state.dashboardSummary);

  const rawCards = [
    { id: '1', title: "Time Invested", text: dashboardSummary?.time_invested_insight },
    { id: '2', title: "Streak", text: dashboardSummary?.streak_insight },
    { id: '3', title: "Strongest Subject", text: dashboardSummary?.strongest_subject_insight },
    { id: '4', title: "Needs Attention", text: dashboardSummary?.needs_attention_insight },
    { id: '5', title: "Arena Movement", text: dashboardSummary?.arena_movement_insight },
    { id: '6', title: "Social", text: dashboardSummary?.social_rank_insight }
  ];
  
  // Only keep cards that have non-null text
  const cardsData = rawCards.filter(c => c.text != null);

  useEffect(() => {
    fetchDashboardSummary();
    RNAnimated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();

    // Auto-slide every 5 seconds
    const interval = setInterval(() => {
      setActiveIndex((prevIndex) => {
        if (cardsData.length === 0) return 0;
        const nextIndex = (prevIndex + 1) % cardsData.length;
        if (scrollViewRef.current) {
          scrollViewRef.current.scrollTo({ x: nextIndex * CARD_WIDTH, animated: true });
        }
        return nextIndex;
      });
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const slideSize = event.nativeEvent.layoutMeasurement.width;
    const index = event.nativeEvent.contentOffset.x / slideSize;
    const roundIndex = Math.round(index);
    if (roundIndex !== activeIndex) {
      setActiveIndex(roundIndex);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentPadding}
        showsVerticalScrollIndicator={false}
      >
        <RNAnimated.View style={[styles.header, { opacity: fadeAnim }]}>
          <Image source={require('../../assets/logo.png')} style={styles.logoImage} resizeMode="contain" />
          <TouchableOpacity style={styles.iconButton}>
            <Bell color="#9CA3AF" size={22} strokeWidth={2} />
          </TouchableOpacity>
        </RNAnimated.View>

        <RNAnimated.View style={[styles.scoreCard, { opacity: fadeAnim }]}>
          <View style={styles.scoreHeader}>
            <View>
              <Text style={styles.scoreHudjeeText}>HudJee</Text>
              <Text style={styles.scoreTitle}>Performance Score</Text>
            </View>
            <View style={styles.footprintsWrapper}>
              <Footprints color="#333333" size={54} strokeWidth={1} style={{ transform: [{ rotate: '-10deg' }] }} />
            </View>
          </View>
          <View style={styles.scoreBottom}>
            <Text style={styles.scoreValueText}>17/100</Text>
            <View style={styles.scoreTrack}>
              <LinearGradient colors={['#69EAC0', '#40C9FF']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.scoreFill, { width: '17%' }]} />
            </View>
          </View>
        </RNAnimated.View>

        <RNAnimated.View style={[styles.section, { opacity: fadeAnim }]}>
          <Text style={styles.sectionTitle}>Quick Summary</Text>
          <View style={styles.carouselContainer}>
            <ScrollView
              ref={scrollViewRef}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={handleScroll}
              scrollEventThrottle={16}
            >
              {cardsData.map((card, index) => (
                <View key={card.id} style={styles.slideWrapper}>
                  <LinearGradient
                    colors={['#494563', '#28263A']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.summaryCard}
                  >
                    <View style={styles.summaryContent}>
                      <View>
                        <Text style={styles.insightTitle}>{card.title}</Text>
                        <View style={styles.insightTextRow}>
                          <Text style={styles.insightText}>{card.text}</Text>
                        </View>
                      </View>
                      <View style={styles.paginationDots}>
                        {cardsData.map((_, dotIndex) => (
                          <View 
                            key={dotIndex} 
                            style={dotIndex === activeIndex ? styles.dotActive : styles.dotInactive} 
                          />
                        ))}
                      </View>
                    </View>
                  </LinearGradient>
                </View>
              ))}
            </ScrollView>
          </View>
        </RNAnimated.View>

        <RNAnimated.View style={[styles.gridContainer, { opacity: fadeAnim }]}>
          <View style={styles.gridCard}>
            <Image 
              source={require('../../assets/success_bg.png')} 
              style={styles.gridBgImage} 
              resizeMode="contain"
            />
            <Text style={styles.gridCardTitle}>Success{'\n'}Index</Text>
            <View style={styles.gridCardBottom}>
              <Text style={styles.gridCardValue}>17/100</Text>
              <View style={styles.gridCardTrack}>
                <LinearGradient colors={['#69EAC0', '#40C9FF']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.gridCardFill, { width: '17%' }]} />
              </View>
            </View>
          </View>
          <View style={styles.gridCard}>
            <Image 
              source={require('../../assets/clipboard_bg.png')} 
              style={styles.gridBgImage} 
              resizeMode="contain"
            />
            <Text style={styles.gridCardTitle}>Syllabus{'\n'}Completion</Text>
            <View style={styles.gridCardBottom}>
              <Text style={styles.gridCardValue}>17/100</Text>
              <View style={styles.gridCardTrack}>
                <LinearGradient colors={['#69EAC0', '#40C9FF']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.gridCardFill, { width: '17%' }]} />
              </View>
            </View>
          </View>
        </RNAnimated.View>

        <RNAnimated.View style={[styles.section, { opacity: fadeAnim }]}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Continue Learning</Text>
            <TouchableOpacity><Text style={styles.viewAllText}>View All</Text></TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.chapterCard} activeOpacity={0.8} onPress={() => navigation.navigate('Practice')}>
            <Text style={styles.chapterTitle}>Newton's Laws</Text>
            
            <View style={styles.progressHeader}>
              <Text style={styles.masteryText}>Mastery Score</Text>
              <Text style={styles.percentageText}>17%</Text>
            </View>
            
            <View style={styles.progressTrack}>
              <LinearGradient colors={['#69EAC0', '#40C9FF']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.progressFill, { width: '17%' }]} />
            </View>
            
            <View style={styles.statsRow}>
              <Text style={styles.statText}>10k Ques Solved</Text>
              <Text style={styles.statText}>147hrs spent</Text>
            </View>
          </TouchableOpacity>
        </RNAnimated.View>
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#000000' },
  container: { flex: 1 },
  contentPadding: { paddingHorizontal: CONTENT_PADDING, paddingTop: 10, paddingBottom: 24 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  logoImage: { width: 140, height: 32, tintColor: '#FFFFFF' },
  iconButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'flex-end' },
  
  scoreCard: { backgroundColor: '#141414', borderRadius: 16, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 20, marginBottom: 32, position: 'relative', overflow: 'hidden' },
  scoreHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 },
  scoreHudjeeText: { color: '#9CA3AF', fontSize: 11, fontWeight: '600', marginBottom: 2 },
  scoreTitle: { color: '#FFFFFF', fontSize: 20, fontWeight: '700', letterSpacing: -0.3 },
  footprintsWrapper: { position: 'absolute', right: -10, top: -5, opacity: 0.8 },
  scoreBottom: { marginTop: 'auto' },
  scoreValueText: { color: '#9CA3AF', fontSize: 10, fontWeight: '700', alignSelf: 'flex-end', marginBottom: 6 },
  scoreTrack: { width: '100%', height: 6, backgroundColor: '#2A2A2A', borderRadius: 3, overflow: 'hidden' },
  scoreFill: { height: '100%', borderRadius: 3 },
  
  section: { marginBottom: 28 },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { color: '#F3F4F6', fontSize: 18, fontWeight: '500', marginBottom: 16 },
  viewAllText: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },
  
  carouselContainer: { height: 200, width: '100%' },
  slideWrapper: { width: CARD_WIDTH, paddingRight: 10 },
  summaryCard: { width: '100%', height: '100%', borderRadius: 24, padding: 24 },
  summaryContent: { flex: 1, justifyContent: 'space-between' },
  insightTitle: { color: '#9CA3AF', fontSize: 14, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  insightTextRow: { flexDirection: 'row', alignItems: 'flex-start' },
  insightText: { color: '#FFFFFF', fontSize: 24, fontWeight: '700', lineHeight: 32 },
  
  paginationDots: { flexDirection: 'row', alignSelf: 'flex-end', alignItems: 'center', gap: 6 },
  dotActive: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#FFFFFF' },
  dotInactive: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#9CA3AF' },

  gridContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 28, gap: 16 },
  gridCard: { flex: 1, backgroundColor: '#141414', borderRadius: 16, paddingHorizontal: 16, paddingTop: 20, paddingBottom: 16, height: 160, position: 'relative', overflow: 'hidden', justifyContent: 'space-between' },
  gridBgImage: { position: 'absolute', right: -20, top: 10, width: 120, height: 120, opacity: 0.8 },
  gridCardTitle: { color: '#F9FAFB', fontSize: 18, fontWeight: '800', letterSpacing: -0.3, lineHeight: 22 },
  gridCardBottom: { marginTop: 'auto' },
  gridCardValue: { color: '#9CA3AF', fontSize: 10, fontWeight: '700', alignSelf: 'flex-end', marginBottom: 6 },
  gridCardTrack: { width: '100%', height: 6, backgroundColor: '#2A2A2A', borderRadius: 3, overflow: 'hidden' },
  gridCardFill: { height: '100%', borderRadius: 3 },

  chapterCard: { backgroundColor: '#141414', borderRadius: 16, padding: 20 },
  chapterTitle: { color: '#FFFFFF', fontSize: 22, fontWeight: '700', marginBottom: 20 },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  masteryText: { color: '#9CA3AF', fontSize: 13, fontWeight: '500' },
  percentageText: { color: '#9CA3AF', fontSize: 13, fontWeight: '500' },
  progressTrack: { height: 8, backgroundColor: '#2A2A2A', borderRadius: 4, marginBottom: 12, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4 },
  statsRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  statText: { color: '#666666', fontSize: 12, fontWeight: '500' },
});



