import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Animated,
  Dimensions,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Bell, ChevronRight, AlertCircle } from 'lucide-react-native';
import Svg, { Circle } from 'react-native-svg';
import { colors } from '../../theme/colors';
import { MockEngineApi, Chapter, ChapterStatus } from '../../services/api.mock';

const { width } = Dimensions.get('window');

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
              colors={['#E8B84B', '#9B6FFF']}
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
  container: { flexDirection: 'row', marginHorizontal: 16, marginBottom: 16, backgroundColor: colors.surface, borderRadius: 100, padding: 4, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  tab: { flex: 1, paddingVertical: 9, borderRadius: 100, alignItems: 'center' },
  activeGradientBorder: { flex: 1, borderRadius: 100, padding: 1.5 },
  activeInner: { backgroundColor: colors.surfaceLight, borderRadius: 100, paddingVertical: 8, alignItems: 'center' },
  label: { color: colors.textSecondary, fontSize: 14, fontWeight: '500' },
  activeLabel: { color: colors.text, fontSize: 14, fontWeight: '700' },
});

// ─── Hero Banner Card ─────────────────────────────────────────────────────────
function HeroBanner({ subject }: { subject: string }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(10)).current;

  useEffect(() => {
    fadeAnim.setValue(0);
    slideAnim.setValue(10);
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 400, useNativeDriver: true })
    ]).start();
  }, [subject]);

  return (
    <Animated.View style={[heroStyles.card, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
      <LinearGradient colors={['rgba(155, 111, 255, 0.15)', 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={heroStyles.gradientBg} />
      <View style={heroStyles.content}>
        <Text style={heroStyles.categoryLabel}>HUDJEE LEARN</Text>
        <Text style={heroStyles.title}>{subject.toUpperCase()}</Text>
        <Text style={heroStyles.subtitle}>Master the concepts of {subject} with adaptive practice</Text>
        <View style={heroStyles.tagsRow}>
          <View style={[heroStyles.tag, { borderColor: colors.tagPurple, backgroundColor: colors.tagPurpleBg }]}><Text style={[heroStyles.tagText, { color: colors.tagPurple }]}>AVG RETENTION 78%</Text></View>
          <View style={[heroStyles.tag, { borderColor: colors.tagRed, backgroundColor: colors.tagRedBg }]}><Text style={[heroStyles.tagText, { color: colors.tagRed }]}>ACTIVE STREAK: 7 DAYS</Text></View>
          <View style={[heroStyles.tag, { borderColor: colors.tagGreen, backgroundColor: colors.tagGreenBg }]}><Text style={[heroStyles.tagText, { color: colors.tagGreen }]}>MASTERY LEVEL : NOVICE</Text></View>
        </View>
      </View>
    </Animated.View>
  );
}

const heroStyles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: 14, marginHorizontal: 16, marginBottom: 24, overflow: 'hidden', borderWidth: 1, borderColor: colors.border, position: 'relative' },
  gradientBg: { ...StyleSheet.absoluteFillObject },
  content: { padding: 16, zIndex: 1 },
  categoryLabel: { color: colors.primary, fontSize: 10, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 4 },
  title: { color: colors.text, fontSize: 40, fontWeight: '800', letterSpacing: -1, lineHeight: 44, marginBottom: 4 },
  subtitle: { color: colors.textSecondary, fontSize: 12, lineHeight: 17, marginBottom: 14 },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  tag: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, borderWidth: 1 },
  tagText: { fontSize: 9, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.3 },
});

// ─── Chapter Card ─────────────────────────────────────────────────────────────
const STATUS_STYLES: Record<ChapterStatus, { color: string, bg: string, label: string }> = {
  not_started: { color: colors.textSecondary, bg: colors.surfaceLight, label: 'Not Started' },
  in_progress: { color: colors.primary, bg: '#9B6FFF15', label: 'In Progress' },
  needs_revisit: { color: '#E8B84B', bg: '#E8B84B15', label: 'Needs Revisit' },
  mastered: { color: '#34D399', bg: '#34D39915', label: 'Mastered' }
};

function ChapterCard({ chapter, onPress, delay = 0 }: { chapter: Chapter; onPress: () => void; delay?: number; }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(16)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, delay, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 400, delay, useNativeDriver: true }),
    ]).start();
  }, [chapter.chapter_id]); // Re-animate on data change to refresh cleanly

  const size = 50;
  const strokeWidth = 5;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (chapter.mastery_pct / 100) * circumference;
  const s = STATUS_STYLES[chapter.status];

  // Surfacing "Needs revisit" visually
  const isRevisit = chapter.status === 'needs_revisit';

  return (
    <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }, { scale: scaleAnim }], marginBottom: 12 }}>
      <Pressable
        onPressIn={() => Animated.spring(scaleAnim, { toValue: 0.98, useNativeDriver: true, friction: 8 }).start()}
        onPressOut={() => Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, friction: 8 }).start()}
        onPress={onPress}
      >
        <View style={[chapterStyles.card, isRevisit && chapterStyles.revisitCard]}>
          <View style={chapterStyles.contentRow}>
            {/* Left Info */}
            <View style={chapterStyles.infoCol}>
              <View style={chapterStyles.titleRow}>
                <Text style={chapterStyles.title}>{chapter.name}</Text>
                {isRevisit && <AlertCircle size={16} color="#E8B84B" style={{ marginLeft: 6, marginBottom: 6 }} />}
              </View>
              
              <View style={[chapterStyles.statusChip, { backgroundColor: s.bg }]}>
                <Text style={[chapterStyles.statusText, { color: s.color }]}>{s.label}</Text>
              </View>
            </View>

            {/* Right Side: Ring & Arrow */}
            <View style={chapterStyles.rightCol}>
              <View style={chapterStyles.ringContainer}>
                <Svg width={size} height={size}>
                  <Circle stroke={colors.border} fill="none" cx={size / 2} cy={size / 2} r={radius} strokeWidth={strokeWidth} />
                  <Circle stroke={colors.primary} fill="none" cx={size / 2} cy={size / 2} r={radius} strokeWidth={strokeWidth}
                    strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} strokeLinecap="round" transform={`rotate(-90 ${size / 2} ${size / 2})`} />
                </Svg>
                <View style={chapterStyles.ringTextContainer}>
                  <Text style={chapterStyles.ringText}>{chapter.mastery_pct}%</Text>
                </View>
              </View>
              <View style={chapterStyles.actionBtn}>
                <ChevronRight size={20} color={colors.textSecondary} />
              </View>
            </View>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const chapterStyles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: colors.border },
  revisitCard: { borderColor: '#E8B84B50', backgroundColor: '#E8B84B05' },
  contentRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  infoCol: { flex: 1, justifyContent: 'center', alignItems: 'flex-start' },
  rightCol: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  titleRow: { flexDirection: 'row', alignItems: 'center' },
  title: { color: colors.text, fontSize: 16, fontWeight: '700', marginBottom: 6 },
  statusChip: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  actionBtn: { justifyContent: 'center', alignItems: 'center' },
  ringContainer: { justifyContent: 'center', alignItems: 'center' },
  ringTextContainer: { position: 'absolute', justifyContent: 'center', alignItems: 'center' },
  ringText: { color: colors.text, fontSize: 12, fontWeight: '700' },
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

  // Fetch chapters when subject changes or on focus
  useEffect(() => {
    const fetchChapters = async () => {
      setLoading(true);
      const data = await MockEngineApi.getChapters(activeSubject);
      // Sort: needs_revisit first
      data.sort((a, b) => (a.status === 'needs_revisit' ? -1 : b.status === 'needs_revisit' ? 1 : 0));
      setChapters(data);
      setLoading(false);
    };
    
    // In a real app we'd use a focus listener too.
    const unsubscribe = navigation.addListener('focus', () => {
      fetchChapters();
    });
    
    fetchChapters();
    return unsubscribe;
  }, [activeSubject, navigation]);

  const startSession = async (chapter: Chapter) => {
    // We immediately navigate and let AdaptiveSessionScreen handle the loading
    navigation.navigate('AdaptiveSessionScreen', { chapterId: chapter.chapter_id, chapterTitle: chapter.name });
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
        <HeroBanner subject={activeSubject} />

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Chapters</Text>
        </View>

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
                onPress={() => startSession(chap)}
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
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 16 },
  logoImage: { width: 140, height: 40, tintColor: '#FFFFFF' },
  iconButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginBottom: 12 },
  sectionTitle: { color: colors.text, fontSize: 20, fontWeight: '700', letterSpacing: -0.3 },
  chaptersList: { paddingHorizontal: 16 },
  emptyState: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { color: colors.textSecondary, fontSize: 15, fontWeight: '500' },
});
