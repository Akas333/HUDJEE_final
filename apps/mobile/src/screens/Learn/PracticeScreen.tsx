import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Animated,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Bell } from 'lucide-react-native';
import { colors } from '../../theme/colors';
import { Chapter } from '../../services/api.mock';
import { EngineApi } from '../../services/api';

const SUBJECTS = ['Physics', 'Chemistry', 'Maths'];

// ─── Subject Tab Bar ──────────────────────────────────────────────────────────
function SubjectTabs({ active, onChange }: { active: string; onChange: (s: string) => void }) {
  return (
    <View style={tabStyles.container}>
      {SUBJECTS.map((subject) => {
        const isActive = active === subject;
        if (isActive) {
          return (
            <LinearGradient
              key={subject}
              colors={[colors.primaryGradientStart, colors.primaryGradientEnd]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={tabStyles.activeGradientBorder}
            >
              <View style={tabStyles.activeInner}>
                <Text style={tabStyles.activeLabel}>{subject}</Text>
              </View>
            </LinearGradient>
          );
        }
        return (
          <Pressable key={subject} style={tabStyles.tab} onPress={() => onChange(subject)}>
            <Text style={tabStyles.label}>{subject}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const tabStyles = StyleSheet.create({
  container: { flexDirection: 'row', marginHorizontal: 16, marginBottom: 24, backgroundColor: colors.background, borderRadius: 100, padding: 2, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 100, alignItems: 'center' },
  activeGradientBorder: { flex: 1, borderRadius: 100, padding: 1.5 },
  activeInner: { backgroundColor: colors.background, borderRadius: 100, paddingVertical: 9, alignItems: 'center' },
  label: { color: colors.textSecondary, fontSize: 14, fontWeight: '500' },
  activeLabel: { color: colors.text, fontSize: 14, fontWeight: '700' },
});

// ─── Chapter Card ─────────────────────────────────────────────────────────────
function ChapterCard({ chapter, onPress, delay = 0 }: { chapter: Chapter; onPress: () => void; delay?: number; }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(16)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, delay, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 400, delay, useNativeDriver: true }),
    ]).start();
  }, [chapter.chapter_id]);

  return (
    <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }, { scale: scaleAnim }], marginBottom: 16 }}>
      <Pressable
        onPressIn={() => Animated.spring(scaleAnim, { toValue: 0.98, useNativeDriver: true, friction: 8 }).start()}
        onPressOut={() => Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, friction: 8 }).start()}
        onPress={onPress}
      >
        <View style={chapterStyles.card}>
          <Text style={chapterStyles.title}>{chapter.name}</Text>
          
          <View style={chapterStyles.progressHeader}>
            <Text style={chapterStyles.masteryText}>Mastery Score</Text>
            <Text style={chapterStyles.percentageText}>{chapter.mastery_pct}%</Text>
          </View>
          
          <View style={chapterStyles.progressTrack}>
            <LinearGradient 
              colors={[colors.primaryGradientStart, colors.primaryGradientEnd]} 
              start={{x: 0, y: 0}} 
              end={{x: 1, y: 0}} 
              style={[chapterStyles.progressFill, { width: `${chapter.mastery_pct}%` }]} 
            />
          </View>
          
          <View style={chapterStyles.statsRow}>
            <Text style={chapterStyles.statText}>0 Ques Solved</Text>
            <Text style={chapterStyles.statText}>0hrs spent</Text>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const chapterStyles = StyleSheet.create({
  card: { backgroundColor: '#1A1A1A', borderRadius: 16, padding: 20 },
  title: { color: colors.text, fontSize: 22, fontWeight: '700', marginBottom: 20 },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  masteryText: { color: colors.textSecondary, fontSize: 13, fontWeight: '500' },
  percentageText: { color: colors.textSecondary, fontSize: 13, fontWeight: '500' },
  progressTrack: { height: 8, backgroundColor: '#333333', borderRadius: 4, marginBottom: 12, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4 },
  statsRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  statText: { color: '#666666', fontSize: 12, fontWeight: '500' },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function PracticeScreen({ navigation }: any) {
  const [activeSubject, setActiveSubject] = useState('Physics');
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);

  const headerFade = useRef(new Animated.Value(0)).current;
  const headerSlide = useRef(new Animated.Value(-8)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(headerFade, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(headerSlide, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start();
  }, []);

  useEffect(() => {
    const fetchChapters = async () => {
      setLoading(true);
      const data = await EngineApi.getChapters(activeSubject);
      setChapters(data);
      setLoading(false);
    };
    
    const unsubscribe = navigation.addListener('focus', () => {
      fetchChapters();
    });
    
    fetchChapters();
    return unsubscribe;
  }, [activeSubject, navigation]);

  const onChapterPress = (chapter: Chapter) => {
    // Navigate to Concept List screen
    navigation.navigate('PracticeConceptScreen', { 
      chapterId: chapter.chapter_id, 
      chapterName: chapter.name,
      activeSubject
    });
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Header */}
      <Animated.View style={[styles.header, { opacity: headerFade, transform: [{ translateY: headerSlide }] }]}>
        <Image source={require('../../../assets/logo.png')} style={styles.logoImage} resizeMode="contain" />
        <TouchableOpacity style={styles.iconButton} activeOpacity={0.7}>
          <Bell color={colors.textSecondary} size={22} />
        </TouchableOpacity>
      </Animated.View>

      {/* Subject Tabs */}
      <SubjectTabs active={activeSubject} onChange={setActiveSubject} />

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
        <View style={styles.chaptersList}>
          {loading ? (
            <ActivityIndicator color={colors.primary} style={{ marginTop: 20 }} />
          ) : chapters.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>Pick a chapter to start practicing.</Text>
            </View>
          ) : (
            chapters.map((chap, idx) => (
              <ChapterCard
                key={chap.chapter_id}
                chapter={chap}
                delay={idx * 50}
                onPress={() => onChapterPress(chap)}
              />
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 24 },
  logoImage: { width: 140, height: 40, tintColor: '#FFFFFF' },
  iconButton: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'flex-end' },
  chaptersList: { paddingHorizontal: 16 },
  emptyState: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { color: colors.textSecondary, fontSize: 15, fontWeight: '500' },
});
