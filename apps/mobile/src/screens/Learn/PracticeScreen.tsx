import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
  Animated as RNAnimated,
  Easing as RNEasing,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeInDown,
  SharedValue,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolateColor,
  Easing,
} from 'react-native-reanimated';
import { Bell, ChevronRight, BookOpen, Sparkles } from 'lucide-react-native';

import Skeleton from '../../components/Skeleton';
import SubjectBackdrop from '../../components/SubjectBackdrop';
import { HapticService } from '../../services/HapticService';
import { useSubjectStore } from '../../store/subjectStore';
import { SUBJECT_COLORS, SubjectKey, subjectKeyOf, tintFor, withAlpha } from '../../theme/subjects';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { Chapter } from '../../services/api.mock';
import { EngineApi } from '../../services/api';
import { ChapterProgress, fetchChapterProgress } from '../../services/practiceApi';

const { width } = Dimensions.get('window');

// ─── design tokens ───────────────────────────────────────────────────────────
// Same system as the Home tab: 24pt gutter, Nunito throughout, translucent white
// surfaces over the indigo→black wash, hairline borders.

const GUTTER = 24;
const GAP = 12;
const CARD_WIDTH = width - GUTTER * 2;
const RADIUS = 18;

const SURFACE = 'rgba(255,255,255,0.05)';
const SURFACE_BORDER = 'rgba(255,255,255,0.09)';
const TRACK = 'rgba(255,255,255,0.09)';

const TEXT = colors.hudjeeTextPrimary;
const TEXT_MUTED = colors.hudjeeTextSecondary;
const TEXT_FAINT = colors.hudjeeTextTertiary;

const GRADIENT: [string, string] = ['#69EAC0', '#40C9FF'];

const SUBJECTS = ['Physics', 'Chemistry', 'Maths'];
const SUBJECT_KEYS: SubjectKey[] = ['physics', 'chemistry', 'maths'];

// One accent per subject, from the shared subject palette — the same colour that
// tints the backdrop, so the switcher and the water behind it always agree.
const SUBJECT_ACCENTS = SUBJECT_KEYS.map((k) => SUBJECT_COLORS[k]);
const SUBJECT_TINTS = SUBJECT_ACCENTS.map((c) => withAlpha(c, 0.16));
const SUBJECT_EDGES = SUBJECT_ACCENTS.map((c) => withAlpha(c, 0.38));

const FAST_OUT_SLOW_IN = Easing.bezier(0.4, 0, 0.2, 1);
const RN_FAST_OUT_SLOW_IN = RNEasing.bezier(0.4, 0, 0.2, 1);

// Entrance timing: cards settle in sequence rather than all popping in at once.
// Capped, because a long chapter list would otherwise leave the last card
// waiting seconds for a turn nobody is watching.
const STAGGER = 40;
const MAX_STAGGER_STEPS = 10;
const enter = (index: number) =>
  FadeInDown.springify()
    .damping(18)
    .mass(0.6)
    .delay(Math.min(index, MAX_STAGGER_STEPS) * STAGGER);

// Segmented control geometry. The indicator slides by whole segments, so its
// width has to be derived once rather than measured per press.
const SEG_PAD = 4;
const SEG_WIDTH = (CARD_WIDTH - SEG_PAD * 2) / SUBJECTS.length;

// ─── small helpers ───────────────────────────────────────────────────────────

function formatMinutes(mins: number): string {
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

function relativeDay(iso: string | null): string | null {
  if (!iso) return null;
  const then = new Date(iso);
  const startOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((startOf(new Date()) - startOf(then)) / 86400000);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 14) return 'Last week';
  return `${Math.floor(days / 7)} weeks ago`;
}

/** The one-line status under each chapter title. */
function statusFor(progress: ChapterProgress | undefined): string {
  if (!progress || progress.questionsSolved === 0) return 'NOT STARTED';
  if (progress.masteryPct >= 80) return 'MASTERED';
  if (progress.masteryPct >= 50) return 'SOLID';
  return 'IN PROGRESS';
}

// ─── interaction primitives ──────────────────────────────────────────────────

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/** Immediate dip on touch down, spring back on release, haptic on press-in. */
function PressableScale({
  children,
  onPress,
  style,
  scaleTo = 0.96,
  haptics = true,
  hitSlop,
}: {
  children: React.ReactNode;
  onPress?: () => void;
  style?: any;
  scaleTo?: number;
  haptics?: boolean;
  hitSlop?: number;
}) {
  const pressed = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - pressed.value * (1 - scaleTo) }],
    opacity: 1 - pressed.value * 0.1,
  }));

  return (
    <AnimatedPressable
      hitSlop={hitSlop}
      onPressIn={() => {
        pressed.value = withTiming(1, { duration: 110, easing: FAST_OUT_SLOW_IN });
        if (haptics) HapticService.light();
      }}
      onPressOut={() => {
        pressed.value = withSpring(0, { damping: 16, stiffness: 280, mass: 0.5 });
      }}
      onPress={onPress}
      style={[style, animatedStyle]}
    >
      {children}
    </AnimatedPressable>
  );
}

function ProgressBar({ value, height = 6, delay = 0 }: { value: number; height?: number; delay?: number }) {
  const anim = useRef(new RNAnimated.Value(0)).current;

  useEffect(() => {
    // Width is not a transform, so this cannot use the native driver.
    RNAnimated.timing(anim, {
      toValue: Math.max(0, Math.min(100, value)),
      duration: 700,
      delay,
      easing: RN_FAST_OUT_SLOW_IN,
      useNativeDriver: false,
    }).start();
  }, [value, delay]);

  const barWidth = anim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
    extrapolate: 'clamp',
  });

  return (
    <View style={[styles.track, { height, borderRadius: height / 2 }]}>
      <RNAnimated.View style={{ width: barWidth, height: '100%' }}>
        <LinearGradient
          colors={GRADIENT}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ flex: 1, borderRadius: height / 2 }}
        />
      </RNAnimated.View>
    </View>
  );
}

// ─── subject switcher ────────────────────────────────────────────────────────

/**
 * A single pill with one sliding indicator rather than three separately styled
 * tabs: the indicator carries the active subject's accent, and both it and the
 * labels cross-fade through the intermediate colours as it travels.
 */
function SubjectTabs({ activeIndex, onChange }: { activeIndex: number; onChange: (i: number) => void }) {
  const pos = useSharedValue(activeIndex);

  useEffect(() => {
    pos.value = withSpring(activeIndex, { damping: 18, stiffness: 180, mass: 0.7 });
  }, [activeIndex]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: pos.value * SEG_WIDTH }],
    backgroundColor: interpolateColor(pos.value, [0, 1, 2], SUBJECT_TINTS),
    borderColor: interpolateColor(pos.value, [0, 1, 2], SUBJECT_EDGES),
  }));

  return (
    <View style={styles.segment}>
      <Animated.View style={[styles.segmentIndicator, indicatorStyle]} />
      {SUBJECTS.map((subject, i) => (
        <SubjectTab key={subject} label={subject} index={i} pos={pos} onPress={() => onChange(i)} />
      ))}
    </View>
  );
}

function SubjectTab({
  label,
  index,
  pos,
  onPress,
}: {
  label: string;
  index: number;
  pos: SharedValue<number>;
  onPress: () => void;
}) {
  const textStyle = useAnimatedStyle(() => {
    const distance = Math.min(Math.abs(pos.value - index), 1);
    return { color: interpolateColor(distance, [0, 1], [TEXT, TEXT_MUTED]) };
  });

  return (
    <Pressable
      style={styles.segmentTab}
      onPress={() => {
        HapticService.light();
        onPress();
      }}
    >
      <Animated.Text style={[styles.segmentLabel, textStyle]}>{label}</Animated.Text>
    </Pressable>
  );
}

// ─── chapter card ────────────────────────────────────────────────────────────

function ChapterCard({
  chapter,
  index,
  accent,
  progress,
  onPress,
}: {
  chapter: Chapter;
  index: number;
  accent: string;
  progress?: ChapterProgress;
  onPress: () => void;
}) {
  const mastery = progress?.masteryPct ?? chapter.mastery_pct ?? 0;
  const solved = progress?.questionsSolved ?? 0;
  const total = chapter.total_questions ?? 0;
  const lastPracticed = relativeDay(progress?.lastPracticedAt ?? null);

  return (
    <PressableScale onPress={onPress} style={styles.chapterCard} scaleTo={0.97}>
      <View style={styles.chapterTop}>
        <View
          style={[
            styles.indexBadge,
            { backgroundColor: `${accent}22`, borderColor: `${accent}44` },
          ]}
        >
          <Text style={[styles.indexText, { color: accent }]}>
            {String(index + 1).padStart(2, '0')}
          </Text>
        </View>

        <View style={styles.chapterTitleGroup}>
          <Text style={styles.chapterTitle} numberOfLines={2}>
            {chapter.name}
          </Text>
          <View style={styles.statusRow}>
            <View style={[styles.statusDot, { backgroundColor: accent }]} />
            <Text style={styles.statusText}>{statusFor(progress)}</Text>
          </View>
        </View>

        <ChevronRight color={TEXT_FAINT} size={18} strokeWidth={2} />
      </View>

      <View style={styles.chapterProgressHeader}>
        <Text style={styles.chapterProgressLabel}>Mastery</Text>
        <Text style={styles.chapterProgressValue}>{mastery}%</Text>
      </View>
      <ProgressBar value={mastery} delay={80 + index * 40} />

      <View style={styles.chapterStats}>
        <Text style={styles.chapterStatText}>
          {total > 0 ? `${solved} of ${total} questions` : `${solved} question${solved === 1 ? '' : 's'}`}
        </Text>
        <View style={styles.chapterStatDivider} />
        <Text style={styles.chapterStatText}>{formatMinutes(progress?.minutesSpent ?? 0)}</Text>
        {lastPracticed ? (
          <>
            <View style={styles.chapterStatDivider} />
            <Text style={styles.chapterStatText}>{lastPracticed}</Text>
          </>
        ) : null}
      </View>
    </PressableScale>
  );
}

// ─── screen ──────────────────────────────────────────────────────────────────

export default function PracticeScreen({ navigation, route }: any) {
  // Home deep-links here with a subject on some cards ("Chemistry is leading",
  // Coverage, a continue chapter's "view all"). Honoured as the starting tab
  // rather than as a lock: the switcher stays the student's to move.
  const requestedSubject = subjectKeyOf(route?.params?.subject);
  const [subjectIndex, setSubjectIndex] = useState(() =>
    requestedSubject ? SUBJECT_KEYS.indexOf(requestedSubject) : 0
  );
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [progress, setProgress] = useState<Map<string, ChapterProgress>>(new Map());
  const [loading, setLoading] = useState(true);

  const activeSubject = SUBJECTS[subjectIndex];
  const accent = SUBJECT_ACCENTS[subjectIndex];

  // Publish the choice so the concept screen and the session below it can tint
  // themselves without every navigate call carrying the subject along.
  const setSubject = useSubjectStore((s) => s.setSubject);
  useEffect(() => {
    setSubject(SUBJECT_KEYS[subjectIndex]);
  }, [subjectIndex, setSubject]);

  // A deep-link that arrives while this screen is already mounted comes in as a
  // params change. The param is consumed once applied, so a second tap on the
  // same card still moves the switcher after a manual change in between.
  const requestedParam = route?.params?.subject;
  useEffect(() => {
    if (!requestedParam) return;
    const key = subjectKeyOf(requestedParam);
    const index = key ? SUBJECT_KEYS.indexOf(key) : -1;
    if (index >= 0 && index !== subjectIndex) {
      setChapters([]);
      setLoading(true);
      setSubjectIndex(index);
    }
    navigation.setParams({ subject: undefined });
  }, [requestedParam]);

  // A late response from a subject you already switched away from must not
  // repaint the list, so every fetch is tagged and stale tags are dropped.
  const requestRef = useRef(0);

  const loadChapters = useCallback(async (subject: string) => {
    const token = ++requestRef.current;
    setLoading(true);

    const data = await EngineApi.getChapters(subject);
    if (requestRef.current !== token) return;
    setChapters(data);
    setLoading(false);

    // Progress is merged in afterwards: the taxonomy is the screen, the numbers
    // are the polish, and waiting on both would stall the list behind a query
    // that returns nothing at all for a signed-out or brand-new student.
    const stats = await fetchChapterProgress(data.map((c) => c.chapter_id));
    if (requestRef.current !== token) return;
    setProgress(stats);
  }, []);

  // Covers both the first mount and every later subject change, since the
  // callback's identity changes with the subject while the screen is focused.
  // Progress is keyed by chapter id, so a leftover map from another subject
  // simply misses and the new cards start at zero.
  useFocusEffect(
    useCallback(() => {
      loadChapters(activeSubject);
    }, [activeSubject, loadChapters])
  );

  const onSubjectChange = (i: number) => {
    if (i === subjectIndex) return;
    // Dropping the old list first is what puts the skeletons back; without it
    // the previous subject's chapters sit there until the new ones land.
    setChapters([]);
    setLoading(true);
    setSubjectIndex(i);
  };

  const onChapterPress = (chapter: Chapter) => {
    navigation.navigate('PracticeConceptScreen', {
      chapterId: chapter.chapter_id,
      chapterName: chapter.name,
      activeSubject,
    });
  };

  const showSkeleton = loading && chapters.length === 0;
  const totalQuestions = chapters.reduce((sum, c) => sum + (c.total_questions || 0), 0);

  return (
    <View style={styles.root}>
      {/* Tinted by the selected subject: switching tabs washes one wave out and
          rolls the next one in. */}
      <SubjectBackdrop color={tintFor(SUBJECT_KEYS[subjectIndex])} />

      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <Animated.View entering={enter(0)} style={styles.header}>
            <Image source={require('../../../assets/logo.png')} style={styles.logo} resizeMode="contain" />
            <PressableScale
              scaleTo={0.9}
              style={styles.iconButton}
              onPress={() => navigation.navigate('Profile', { screen: 'NotificationsScreen' })}
            >
              <Bell color={TEXT_MUTED} size={19} strokeWidth={1.8} />
            </PressableScale>
          </Animated.View>

          {/* Title block, sitting where Home puts its greeting. */}
          <Animated.View entering={enter(1)} style={styles.titleBlock}>
            <Text style={styles.title}>Practice</Text>
            <Text style={styles.subtitle}>Pick a chapter and keep the streak going</Text>
          </Animated.View>

          {/* Subject switcher */}
          <Animated.View entering={enter(2)}>
            <SubjectTabs activeIndex={subjectIndex} onChange={onSubjectChange} />
          </Animated.View>

          {/* Section header — the count doubles as the subject's syllabus size. */}
          <Animated.View entering={enter(3)} style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Chapters</Text>
            {!showSkeleton && chapters.length > 0 ? (
              <Text style={styles.sectionMeta}>
                {chapters.length} chapter{chapters.length === 1 ? '' : 's'}
                {totalQuestions > 0 ? ` · ${totalQuestions} questions` : ''}
              </Text>
            ) : null}
          </Animated.View>

          {/* The list is keyed by subject so the stagger replays on every switch
              instead of the new chapters snapping into the old ones' places. */}
          <View key={activeSubject} style={{ gap: GAP }}>
            {showSkeleton ? (
              <>
                <Skeleton width="100%" height={158} borderRadius={RADIUS} />
                <Skeleton width="100%" height={158} borderRadius={RADIUS} />
                <Skeleton width="100%" height={158} borderRadius={RADIUS} />
              </>
            ) : chapters.length === 0 ? (
              <Animated.View entering={enter(4)} style={styles.emptyCard}>
                <View style={styles.emptyIcon}>
                  <BookOpen color={TEXT_MUTED} size={19} strokeWidth={1.8} />
                </View>
                <Text style={styles.emptyTitle}>No {activeSubject} chapters yet</Text>
                <Text style={styles.emptyText}>
                  Chapters show up here as soon as they are published. Try another subject in the
                  meantime.
                </Text>
              </Animated.View>
            ) : (
              chapters.map((chapter, i) => (
                <Animated.View key={chapter.chapter_id} entering={enter(4 + i)}>
                  <ChapterCard
                    chapter={chapter}
                    index={i}
                    accent={accent}
                    progress={progress.get(chapter.chapter_id)}
                    onPress={() => onChapterPress(chapter)}
                  />
                </Animated.View>
              ))
            )}
          </View>

          {/* Closing nudge, so the list does not end on a hard edge. */}
          {!showSkeleton && chapters.length > 0 ? (
            <Animated.View entering={enter(5)} style={styles.footerNote}>
              <Sparkles color={TEXT_FAINT} size={14} strokeWidth={1.8} />
              <Text style={styles.footerText}>Mastery updates as you answer</Text>
            </Animated.View>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.hudjeeBgBase },
  safeArea: { flex: 1 },
  container: { flex: 1 },
  content: { paddingHorizontal: GUTTER, paddingTop: 8, paddingBottom: 48 },

  // Header
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 },
  logo: { width: 120, height: 30, tintColor: '#FFFFFF' },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: SURFACE_BORDER,
    justifyContent: 'center',
    alignItems: 'center',
  },

  titleBlock: { marginBottom: 24 },
  title: { color: TEXT, fontSize: 28, fontFamily: typography.bold, letterSpacing: -0.4 },
  subtitle: { color: TEXT_MUTED, fontSize: 15, fontFamily: typography.regular, marginTop: 6 },

  // Subject switcher
  segment: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: SURFACE,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: SURFACE_BORDER,
    padding: SEG_PAD,
    marginBottom: 32,
  },
  segmentIndicator: {
    position: 'absolute',
    left: SEG_PAD,
    top: SEG_PAD,
    bottom: SEG_PAD,
    width: SEG_WIDTH,
    borderRadius: 999,
    borderWidth: 1,
  },
  segmentTab: { width: SEG_WIDTH, paddingVertical: 11, alignItems: 'center' },
  segmentLabel: { fontSize: 14, fontFamily: typography.semiBold, letterSpacing: -0.1 },

  // Sections
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 16 },
  sectionTitle: { color: TEXT, fontSize: 17, fontFamily: typography.semiBold, letterSpacing: -0.2 },
  sectionMeta: { color: TEXT_FAINT, fontSize: 12, fontFamily: typography.regular },

  track: { width: '100%', backgroundColor: TRACK, overflow: 'hidden' },

  // Chapter card
  chapterCard: {
    backgroundColor: SURFACE,
    borderRadius: RADIUS,
    borderWidth: 1,
    borderColor: SURFACE_BORDER,
    padding: 20,
  },
  chapterTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 18 },
  indexBadge: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  indexText: { fontSize: 13, fontFamily: typography.bold, letterSpacing: 0.2 },
  chapterTitleGroup: { flex: 1, paddingRight: 12 },
  chapterTitle: { color: TEXT, fontSize: 18, fontFamily: typography.semiBold, letterSpacing: -0.3, lineHeight: 24 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  statusDot: { width: 5, height: 5, borderRadius: 2.5 },
  statusText: { color: TEXT_MUTED, fontSize: 10, fontFamily: typography.semiBold, letterSpacing: 1.2 },
  chapterProgressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 9 },
  chapterProgressLabel: { color: TEXT_MUTED, fontSize: 12, fontFamily: typography.regular },
  chapterProgressValue: { color: TEXT, fontSize: 12, fontFamily: typography.semiBold },
  chapterStats: { flexDirection: 'row', alignItems: 'center', gap: 9, marginTop: 14, flexWrap: 'wrap' },
  chapterStatText: { color: TEXT_FAINT, fontSize: 11, fontFamily: typography.regular },
  chapterStatDivider: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: 'rgba(255,255,255,0.18)' },

  // Empty state
  emptyCard: {
    backgroundColor: SURFACE,
    borderRadius: RADIUS,
    borderWidth: 1,
    borderColor: SURFACE_BORDER,
    padding: 22,
    alignItems: 'flex-start',
  },
  emptyIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.06)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  emptyTitle: { color: TEXT, fontSize: 15, fontFamily: typography.semiBold, marginBottom: 5 },
  emptyText: { color: TEXT_MUTED, fontSize: 13, fontFamily: typography.regular, lineHeight: 20 },

  footerNote: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, marginTop: 28 },
  footerText: { color: TEXT_FAINT, fontSize: 12, fontFamily: typography.regular },
});
