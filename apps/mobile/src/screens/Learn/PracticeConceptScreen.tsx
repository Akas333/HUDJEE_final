import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Animated as RNAnimated,
  Easing as RNEasing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { ArrowLeft, Bell, ChevronRight, Layers, ArrowRight } from 'lucide-react-native';

import Skeleton from '../../components/Skeleton';
import SubjectBackdrop from '../../components/SubjectBackdrop';
import { HapticService } from '../../services/HapticService';
import { useSubjectStore } from '../../store/subjectStore';
import { SUBJECT_COLORS, subjectKeyOf, tintFor } from '../../theme/subjects';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { EngineApi } from '../../services/api';
import {
  ChapterProgress,
  TopicProgress,
  fetchChapterProgress,
  fetchTopicProgress,
} from '../../services/practiceApi';

// ─── design tokens (shared with Home and the chapter list) ───────────────────

const GUTTER = 24;
const GAP = 12;
const RADIUS = 18;

const SURFACE = 'rgba(255,255,255,0.05)';
const SURFACE_BORDER = 'rgba(255,255,255,0.09)';
const TRACK = 'rgba(255,255,255,0.09)';

const TEXT = colors.hudjeeTextPrimary;
const TEXT_MUTED = colors.hudjeeTextSecondary;
const TEXT_FAINT = colors.hudjeeTextTertiary;

const GRADIENT: [string, string] = ['#69EAC0', '#40C9FF'];

const FAST_OUT_SLOW_IN = Easing.bezier(0.4, 0, 0.2, 1);
const RN_FAST_OUT_SLOW_IN = RNEasing.bezier(0.4, 0, 0.2, 1);

const STAGGER = 40;
const MAX_STAGGER_STEPS = 10;
const enter = (index: number) =>
  FadeInDown.springify()
    .damping(18)
    .mass(0.6)
    .delay(Math.min(index, MAX_STAGGER_STEPS) * STAGGER);

// ─── small helpers ───────────────────────────────────────────────────────────

function formatMinutes(mins: number): string {
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

function topicCaption(progress: TopicProgress | undefined): string {
  if (!progress || progress.questionsSolved === 0) return 'Not started';
  const solved = `${progress.questionsSolved} solved`;
  return progress.minutesSpent > 0
    ? `${solved} · ${formatMinutes(progress.minutesSpent)}`
    : solved;
}

// ─── interaction primitives ──────────────────────────────────────────────────

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

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

/** Rolls a number up to its value instead of snapping to it. */
function CountUp({ value, style, duration = 900 }: { value: number; style?: any; duration?: number }) {
  const [display, setDisplay] = useState(0);
  const anim = useRef(new RNAnimated.Value(0)).current;

  useEffect(() => {
    const id = anim.addListener(({ value: v }) => setDisplay(Math.round(v)));
    RNAnimated.timing(anim, {
      toValue: value,
      duration,
      easing: RN_FAST_OUT_SLOW_IN,
      // Driving a number we read on the JS side, so the native driver can't help.
      useNativeDriver: false,
    }).start();
    return () => anim.removeListener(id);
  }, [value, duration]);

  return <Text style={style}>{display}</Text>;
}

function ProgressBar({
  value,
  height = 6,
  delay = 0,
  spring = false,
}: {
  value: number;
  height?: number;
  delay?: number;
  spring?: boolean;
}) {
  const anim = useRef(new RNAnimated.Value(0)).current;

  useEffect(() => {
    const target = Math.max(0, Math.min(100, value));
    // Width is not a transform, so neither of these can use the native driver.
    const animation = spring
      ? RNAnimated.spring(anim, { toValue: target, delay, friction: 9, tension: 42, useNativeDriver: false })
      : RNAnimated.timing(anim, {
          toValue: target,
          duration: 700,
          delay,
          easing: RN_FAST_OUT_SLOW_IN,
          useNativeDriver: false,
        });
    animation.start();
  }, [value, delay, spring]);

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

// ─── topic row ───────────────────────────────────────────────────────────────

/**
 * Deliberately lighter than the chapter card one level up: a compact row with a
 * hairline bar, so the hierarchy is legible without reading the titles.
 */
function TopicRow({
  title,
  index,
  accent,
  progress,
  onPress,
}: {
  title: string;
  index: number;
  accent: string;
  progress?: TopicProgress;
  onPress: () => void;
}) {
  const mastery = progress?.masteryPct ?? 0;

  return (
    <PressableScale onPress={onPress} style={styles.topicCard} scaleTo={0.97}>
      <View style={styles.topicTop}>
        <View style={[styles.indexBadge, { backgroundColor: `${accent}22`, borderColor: `${accent}44` }]}>
          <Text style={[styles.indexText, { color: accent }]}>{String(index + 1).padStart(2, '0')}</Text>
        </View>

        <View style={styles.topicTitleGroup}>
          <Text style={styles.topicTitle} numberOfLines={2}>
            {title}
          </Text>
          <Text style={styles.topicCaption}>{topicCaption(progress)}</Text>
        </View>

        <ChevronRight color={TEXT_FAINT} size={17} strokeWidth={2} />
      </View>

      <View style={styles.topicBarRow}>
        <View style={styles.topicBarFlex}>
          <ProgressBar value={mastery} height={5} delay={80 + index * 40} />
        </View>
        <Text style={styles.topicPercent}>{mastery}%</Text>
      </View>
    </PressableScale>
  );
}

// ─── screen ──────────────────────────────────────────────────────────────────

export default function PracticeConceptScreen({ route, navigation }: any) {
  const { chapterId, chapterName, activeSubject } = route.params;

  const [concepts, setConcepts] = useState<any[]>([]);
  const [topicProgress, setTopicProgress] = useState<Map<string, TopicProgress>>(new Map());
  const [chapterStats, setChapterStats] = useState<ChapterProgress | null>(null);
  const [loading, setLoading] = useState(true);

  // The route param is the authority here; the store is the fallback for a
  // screen reached without one (a deep link, or Home's continue cards).
  const storeSubject = useSubjectStore((s) => s.subject);
  const subjectKey = subjectKeyOf(activeSubject) ?? storeSubject;
  const accent = subjectKey ? SUBJECT_COLORS[subjectKey] : tintFor(null);

  const load = useCallback(async () => {
    const data = await EngineApi.getConcepts(chapterId);
    setConcepts(data);
    setLoading(false);

    // Progress is merged in afterwards: the topic list is the screen, the
    // numbers are the polish, and waiting on both would stall the list behind a
    // query that returns nothing at all for a brand-new student.
    const [topics, chapters] = await Promise.all([
      fetchTopicProgress(data.map((c: any) => c.id)),
      fetchChapterProgress([chapterId]),
    ]);
    setTopicProgress(topics);
    setChapterStats(chapters.get(chapterId) ?? null);
  }, [chapterId]);

  // Refreshes on return from a session, so finishing one is visible here.
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const startChapter = () => {
    navigation.navigate('AdaptiveSessionScreen', { chapterId, chapterTitle: chapterName });
  };

  const startTopic = (conceptId: string) => {
    navigation.navigate('AdaptiveSessionScreen', {
      chapterId,
      chapterTitle: chapterName,
      conceptId,
    });
  };

  const showSkeleton = loading && concepts.length === 0;
  const mastery = chapterStats?.masteryPct ?? 0;
  const started = topicProgress.size
    ? [...topicProgress.values()].filter((p) => p.questionsSolved > 0).length
    : 0;

  return (
    <View style={styles.root}>
      <SubjectBackdrop color={tintFor(subjectKey)} />

      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* Header — a pushed screen leads with the way back, not the logo. */}
          <Animated.View entering={enter(0)} style={styles.header}>
            <PressableScale scaleTo={0.9} style={styles.iconButton} onPress={() => navigation.goBack()}>
              <ArrowLeft color={TEXT} size={19} strokeWidth={2} />
            </PressableScale>
            <PressableScale
              scaleTo={0.9}
              style={styles.iconButton}
              onPress={() => navigation.navigate('Profile', { screen: 'NotificationsScreen' })}
            >
              <Bell color={TEXT_MUTED} size={19} strokeWidth={1.8} />
            </PressableScale>
          </Animated.View>

          {/* Title block. The subject eyebrow is the only breadcrumb needed —
              the chapter name is the heading right under it. */}
          <Animated.View entering={enter(1)} style={styles.titleBlock}>
            <View style={styles.subjectRow}>
              <View style={[styles.subjectDot, { backgroundColor: accent }]} />
              <Text style={styles.subjectText}>
                {activeSubject ? String(activeSubject).toUpperCase() : 'PRACTICE'}
              </Text>
            </View>
            <Text style={styles.title}>{chapterName}</Text>
          </Animated.View>

          {/* Chapter hero */}
          <Animated.View entering={enter(2)}>
            {showSkeleton ? (
              <Skeleton width="100%" height={228} borderRadius={RADIUS} style={{ marginBottom: 32 }} />
            ) : (
              <View style={styles.heroCard}>
                <View style={styles.heroHeader}>
                  <Text style={styles.eyebrow}>CHAPTER MASTERY</Text>
                  <View style={styles.topicChip}>
                    <Layers color={TEXT_MUTED} size={12} strokeWidth={2} />
                    <Text style={styles.topicChipText}>
                      {concepts.length} topic{concepts.length === 1 ? '' : 's'}
                    </Text>
                  </View>
                </View>

                <View style={styles.heroValueRow}>
                  <CountUp value={mastery} style={styles.heroValue} />
                  <Text style={styles.heroValueSuffix}>/100</Text>
                </View>

                <ProgressBar value={mastery} delay={120} spring />

                <View style={styles.heroStats}>
                  <Text style={styles.heroStatText}>
                    {chapterStats?.questionsSolved ?? 0} solved
                  </Text>
                  <View style={styles.heroStatDivider} />
                  <Text style={styles.heroStatText}>
                    {formatMinutes(chapterStats?.minutesSpent ?? 0)} spent
                  </Text>
                  {concepts.length > 0 ? (
                    <>
                      <View style={styles.heroStatDivider} />
                      <Text style={styles.heroStatText}>
                        {started}/{concepts.length} topics started
                      </Text>
                    </>
                  ) : null}
                </View>

                {/* The whole-chapter session: the primary action on this screen,
                    and the only solid white surface anywhere in the app — nothing
                    else competes with it for the eye. */}
                <PressableScale onPress={startChapter} scaleTo={0.97} style={styles.ctaWrap}>
                  <View style={styles.cta}>
                    <Text style={styles.ctaText}>Practice this chapter</Text>
                    <ArrowRight color="#0B0B0C" size={17} strokeWidth={2.4} />
                  </View>
                </PressableScale>
              </View>
            )}
          </Animated.View>

          {/* Topics */}
          <Animated.View entering={enter(3)} style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Topics</Text>
            {!showSkeleton && concepts.length > 0 ? (
              <Text style={styles.sectionMeta}>Tap one to drill it</Text>
            ) : null}
          </Animated.View>

          <View style={{ gap: GAP }}>
            {showSkeleton ? (
              <>
                <Skeleton width="100%" height={104} borderRadius={RADIUS} />
                <Skeleton width="100%" height={104} borderRadius={RADIUS} />
                <Skeleton width="100%" height={104} borderRadius={RADIUS} />
              </>
            ) : concepts.length === 0 ? (
              <Animated.View entering={enter(4)} style={styles.emptyCard}>
                <View style={styles.emptyIcon}>
                  <Layers color={TEXT_MUTED} size={19} strokeWidth={1.8} />
                </View>
                <Text style={styles.emptyTitle}>No topics yet</Text>
                <Text style={styles.emptyText}>
                  This chapter has no topics published. You can still run a chapter-wide session
                  from the card above.
                </Text>
              </Animated.View>
            ) : (
              concepts.map((concept, i) => (
                <Animated.View key={concept.id} entering={enter(4 + i)}>
                  <TopicRow
                    title={concept.title}
                    index={i}
                    accent={accent}
                    progress={topicProgress.get(concept.id)}
                    onPress={() => startTopic(concept.id)}
                  />
                </Animated.View>
              ))
            )}
          </View>
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

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
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
  subjectRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  subjectDot: { width: 5, height: 5, borderRadius: 2.5 },
  subjectText: { color: TEXT_MUTED, fontSize: 10, fontFamily: typography.semiBold, letterSpacing: 1.2 },
  title: { color: TEXT, fontSize: 28, fontFamily: typography.bold, letterSpacing: -0.5, lineHeight: 35 },

  // Chapter hero
  heroCard: {
    backgroundColor: SURFACE,
    borderRadius: RADIUS,
    borderWidth: 1,
    borderColor: SURFACE_BORDER,
    padding: 22,
    marginBottom: 32,
  },
  heroHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
  eyebrow: { color: TEXT_MUTED, fontSize: 11, fontFamily: typography.semiBold, letterSpacing: 1.4 },
  topicChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: SURFACE_BORDER,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  topicChipText: { color: TEXT_MUTED, fontSize: 11, fontFamily: typography.semiBold },
  heroValueRow: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 18 },
  heroValue: { color: TEXT, fontSize: 46, fontFamily: typography.bold, letterSpacing: -1.6, lineHeight: 50 },
  heroValueSuffix: { color: TEXT_FAINT, fontSize: 15, fontFamily: typography.regular, marginLeft: 4 },
  heroStats: { flexDirection: 'row', alignItems: 'center', gap: 9, marginTop: 14, flexWrap: 'wrap' },
  heroStatText: { color: TEXT_FAINT, fontSize: 11, fontFamily: typography.regular },
  heroStatDivider: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: 'rgba(255,255,255,0.18)' },

  ctaWrap: { marginTop: 20 },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 50,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
  },
  ctaText: { color: '#0B0B0C', fontSize: 15, fontFamily: typography.bold, letterSpacing: -0.2 },

  // Sections
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 16 },
  sectionTitle: { color: TEXT, fontSize: 17, fontFamily: typography.semiBold, letterSpacing: -0.2 },
  sectionMeta: { color: TEXT_FAINT, fontSize: 12, fontFamily: typography.regular },

  track: { width: '100%', backgroundColor: TRACK, overflow: 'hidden' },

  // Topic rows
  topicCard: {
    backgroundColor: SURFACE,
    borderRadius: RADIUS,
    borderWidth: 1,
    borderColor: SURFACE_BORDER,
    paddingVertical: 16,
    paddingHorizontal: 18,
  },
  topicTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  indexBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  indexText: { fontSize: 12, fontFamily: typography.bold, letterSpacing: 0.2 },
  topicTitleGroup: { flex: 1, paddingRight: 10 },
  topicTitle: { color: TEXT, fontSize: 16, fontFamily: typography.semiBold, letterSpacing: -0.2, lineHeight: 21 },
  topicCaption: { color: TEXT_FAINT, fontSize: 11, fontFamily: typography.regular, marginTop: 3 },
  topicBarRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  topicBarFlex: { flex: 1 },
  topicPercent: { color: TEXT_MUTED, fontSize: 12, fontFamily: typography.semiBold, width: 34, textAlign: 'right' },

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
});
