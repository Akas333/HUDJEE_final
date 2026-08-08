import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Animated,
  Pressable,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Bell, ChevronRight, BookOpen } from 'lucide-react-native';

import Skeleton from '../../components/Skeleton';
import GradientProgressBar from '../../components/GradientProgressBar';
import { Chapter } from '../../services/api.mock';
import { EngineApi } from '../../services/api';
import {
  ACCENT,
  ACCENT_TINT,
  GAP,
  GUTTER,
  RADIUS,
  SECTION_GAP,
  SUBJECT_COLORS,
  SURFACE,
  SURFACE_BORDER,
  SURFACE_INSET,
  TEXT,
  TEXT_FAINT,
  TEXT_MUTED,
} from '../../theme/home';

const SUBJECTS = ['Physics', 'Chemistry', 'Maths'];

const STATUS_LABEL: Record<string, string> = {
  not_started: 'Not started',
  in_progress: 'In progress',
  needs_revisit: 'Needs revisit',
  mastered: 'Mastered',
};

// ─── Subject Tab Bar ──────────────────────────────────────────────────────────
function SubjectTabs({ active, onChange }: { active: string; onChange: (s: string) => void }) {
  return (
    <View style={tabStyles.container}>
      {SUBJECTS.map((subject) => {
        const isActive = active === subject;
        return (
          <Pressable
            key={subject}
            style={[tabStyles.tab, isActive && tabStyles.tabActive]}
            onPress={() => onChange(subject)}
            accessibilityRole="button"
            accessibilityState={{ selected: isActive }}
          >
            <Text style={isActive ? tabStyles.labelActive : tabStyles.label}>{subject}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const tabStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: SURFACE,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: SURFACE_BORDER,
    padding: 4,
    marginBottom: SECTION_GAP,
  },
  tab: { flex: 1, paddingVertical: 9, borderRadius: 999, alignItems: 'center' },
  tabActive: { backgroundColor: ACCENT_TINT },
  label: { color: TEXT_MUTED, fontSize: 13, fontWeight: '600', letterSpacing: -0.1 },
  labelActive: { color: ACCENT, fontSize: 13, fontWeight: '700', letterSpacing: -0.1 },
});

// ─── Chapter Card ─────────────────────────────────────────────────────────────
function ChapterCard({ chapter, onPress, delay = 0 }: { chapter: Chapter; onPress: () => void; delay?: number }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(16)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, delay, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 400, delay, useNativeDriver: true }),
    ]).start();
  }, [chapter.chapter_id]);

  const subject = (chapter.subject || '').toLowerCase();
  const accent = SUBJECT_COLORS[subject] || TEXT_MUTED;
  const statusLabel = STATUS_LABEL[chapter.status] || 'In progress';

  return (
    <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }, { scale: scaleAnim }] }}>
      <Pressable
        onPressIn={() => Animated.spring(scaleAnim, { toValue: 0.98, useNativeDriver: true, friction: 8 }).start()}
        onPressOut={() => Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, friction: 8 }).start()}
        onPress={onPress}
      >
        <View style={chapterStyles.card}>
          <View style={chapterStyles.top}>
            <View style={chapterStyles.titleGroup}>
              <View style={[chapterStyles.subjectChip, { backgroundColor: `${accent}1F` }]}>
                <View style={[chapterStyles.subjectDot, { backgroundColor: accent }]} />
                <Text style={[chapterStyles.subjectChipText, { color: accent }]}>
                  {chapter.subject ? chapter.subject.toUpperCase() : 'PRACTICE'}
                </Text>
              </View>
              <Text style={chapterStyles.title} numberOfLines={2}>
                {chapter.name}
              </Text>
            </View>
            <ChevronRight color={TEXT_FAINT} size={20} strokeWidth={2.5} />
          </View>

          <View style={chapterStyles.progressHeader}>
            <Text style={chapterStyles.progressLabel}>Mastery</Text>
            <Text style={chapterStyles.progressValue}>{chapter.mastery_pct}%</Text>
          </View>
          <GradientProgressBar value={chapter.mastery_pct} />

          <View style={chapterStyles.stats}>
            <Text style={chapterStyles.statText}>
              {chapter.total_questions ?? 0} question{chapter.total_questions === 1 ? '' : 's'}
            </Text>
            <View style={chapterStyles.statDivider} />
            <Text style={chapterStyles.statText}>{statusLabel}</Text>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const chapterStyles = StyleSheet.create({
  card: {
    backgroundColor: SURFACE,
    borderRadius: RADIUS,
    borderWidth: 1,
    borderColor: SURFACE_BORDER,
    padding: 18,
  },
  top: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16 },
  titleGroup: { flex: 1, paddingRight: 12 },
  subjectChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    marginBottom: 8,
  },
  subjectDot: { width: 5, height: 5, borderRadius: 2.5 },
  subjectChipText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.8 },
  title: { color: TEXT, fontSize: 19, fontWeight: '700', letterSpacing: -0.3, lineHeight: 24 },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  progressLabel: { color: TEXT_MUTED, fontSize: 12, fontWeight: '600' },
  progressValue: { color: TEXT, fontSize: 12, fontWeight: '700' },
  stats: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, flexWrap: 'wrap' },
  statText: { color: TEXT_FAINT, fontSize: 11, fontWeight: '600' },
  statDivider: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: '#3F3F46' },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function PracticeScreen({ navigation }: any) {
  const [activeSubject, setActiveSubject] = useState('Physics');
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const headerFade = useRef(new Animated.Value(0)).current;
  const headerSlide = useRef(new Animated.Value(-8)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(headerFade, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(headerSlide, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start();
  }, []);

  const fetchChapters = useCallback(async () => {
    const data = await EngineApi.getChapters(activeSubject);
    setChapters(data);
  }, [activeSubject]);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setLoading(true);
      await fetchChapters();
      if (!cancelled) setLoading(false);
    };

    const unsubscribe = navigation.addListener('focus', run);
    run();

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [fetchChapters, navigation]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchChapters();
    setRefreshing(false);
  }, [fetchChapters]);

  const onChapterPress = (chapter: Chapter) => {
    // Navigate to Concept List screen
    navigation.navigate('PracticeConceptScreen', {
      chapterId: chapter.chapter_id,
      chapterName: chapter.name,
      activeSubject,
    });
  };

  const showSkeleton = loading && chapters.length === 0;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={TEXT_MUTED} colors={[TEXT_MUTED]} />
        }
      >
        {/* Header */}
        <Animated.View
          style={[styles.header, { opacity: headerFade, transform: [{ translateY: headerSlide }] }]}
        >
          <Image source={require('../../../assets/logo.png')} style={styles.logo} resizeMode="contain" />
          <TouchableOpacity
            style={styles.iconButton}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('Profile', { screen: 'NotificationsScreen' })}
          >
            <Bell color={TEXT_MUTED} size={20} strokeWidth={2} />
          </TouchableOpacity>
        </Animated.View>

        {/* Title */}
        <View style={styles.titleBlock}>
          <Text style={styles.titleLabel}>Practice</Text>
          <Text style={styles.titleHeading} numberOfLines={1}>
            {activeSubject}
          </Text>
        </View>

        {/* Subject Tabs */}
        <SubjectTabs active={activeSubject} onChange={setActiveSubject} />

        {showSkeleton ? (
          <View style={{ gap: GAP }}>
            <Skeleton width="100%" height={148} borderRadius={RADIUS} />
            <Skeleton width="100%" height={148} borderRadius={RADIUS} />
            <Skeleton width="100%" height={148} borderRadius={RADIUS} />
          </View>
        ) : chapters.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <BookOpen color={TEXT_MUTED} size={20} strokeWidth={2} />
            </View>
            <Text style={styles.emptyTitle}>No chapters yet</Text>
            <Text style={styles.emptyText}>
              {activeSubject} chapters will show up here as soon as they are published.
            </Text>
          </View>
        ) : (
          <View style={{ gap: GAP }}>
            {chapters.map((chap, idx) => (
              <ChapterCard
                key={chap.chapter_id}
                chapter={chap}
                delay={idx * 50}
                onPress={() => onChapterPress(chap)}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#000000' },
  container: { flex: 1 },
  content: { paddingHorizontal: GUTTER, paddingTop: 8, paddingBottom: 40 },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  logo: { width: 128, height: 30, tintColor: '#FFFFFF' },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: SURFACE_BORDER,
    justifyContent: 'center',
    alignItems: 'center',
  },

  titleBlock: { marginBottom: 20 },
  titleLabel: { color: TEXT_MUTED, fontSize: 13, fontWeight: '600', letterSpacing: 0.2 },
  titleHeading: { color: TEXT, fontSize: 26, fontWeight: '800', letterSpacing: -0.5, marginTop: 2 },

  emptyCard: {
    backgroundColor: SURFACE,
    borderRadius: RADIUS,
    borderWidth: 1,
    borderColor: SURFACE_BORDER,
    padding: 20,
    alignItems: 'flex-start',
  },
  emptyIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: SURFACE_INSET,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  emptyTitle: { color: TEXT, fontSize: 15, fontWeight: '700', marginBottom: 4 },
  emptyText: { color: TEXT_MUTED, fontSize: 13, fontWeight: '500', lineHeight: 19 },
});
