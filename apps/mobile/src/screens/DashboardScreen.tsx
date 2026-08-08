import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Animated as RNAnimated,
  RefreshControl,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Bell,
  Flame,
  Target,
  Clock,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Footprints,
  BookOpen,
  ArrowRight,
} from 'lucide-react-native';

import Skeleton from '../components/Skeleton';
import ProgressBar from '../components/GradientProgressBar';
import { useHomeStore } from '../store/homeStore';
import { ContinueChapter, HomeInsight } from '../services/homeApi';
import {
  CARD_WIDTH,
  GAP,
  GUTTER,
  RADIUS,
  SUBJECT_COLORS,
  SURFACE,
  SURFACE_BORDER,
  SURFACE_INSET,
  TEXT,
  TEXT_FAINT,
  TEXT_MUTED,
} from '../theme/home';

// ─── small helpers ───────────────────────────────────────────────────────────

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function formatMinutes(mins: number): string {
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

function relativeDay(iso: string | null): string {
  if (!iso) return 'Not started yet';
  const then = new Date(iso);
  const startOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((startOf(new Date()) - startOf(then)) / 86400000);
  if (days <= 0) return 'Practised today';
  if (days === 1) return 'Practised yesterday';
  if (days < 7) return `Practised ${days} days ago`;
  if (days < 14) return 'Practised last week';
  return `Practised ${Math.floor(days / 7)} weeks ago`;
}

// ─── shared pieces ───────────────────────────────────────────────────────────

function SectionHeader({ title, actionLabel, onAction }: { title: string; actionLabel?: string; onAction?: () => void }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {actionLabel && onAction ? (
        <TouchableOpacity onPress={onAction} activeOpacity={0.7} hitSlop={8} style={styles.sectionAction}>
          <Text style={styles.sectionActionText}>{actionLabel}</Text>
          <ChevronRight color={TEXT_MUTED} size={16} strokeWidth={2.5} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

function StatChip({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <View style={styles.statChip}>
      <View style={styles.statIcon}>{icon}</View>
      <View style={styles.statTextGroup}>
        <Text style={styles.statValue} numberOfLines={1}>
          {value}
        </Text>
        <Text style={styles.statLabel} numberOfLines={1}>
          {label}
        </Text>
      </View>
    </View>
  );
}

function MetricCard({ title, value, caption }: { title: string; value: number; caption: string }) {
  return (
    <View style={styles.metricCard}>
      <Text style={styles.metricTitle}>{title}</Text>
      <View style={styles.metricBottom}>
        <View style={styles.metricValueRow}>
          <Text style={styles.metricValue}>{value}</Text>
          <Text style={styles.metricValueSuffix}>/100</Text>
        </View>
        <ProgressBar value={value} height={6} />
        <Text style={styles.metricCaption} numberOfLines={2}>
          {caption}
        </Text>
      </View>
    </View>
  );
}

function ChapterCard({ chapter, onPress }: { chapter: ContinueChapter; onPress: () => void }) {
  const accent = SUBJECT_COLORS[chapter.subject] || TEXT_MUTED;

  return (
    <TouchableOpacity style={styles.chapterCard} activeOpacity={0.85} onPress={onPress}>
      <View style={styles.chapterTop}>
        <View style={styles.chapterTitleGroup}>
          <View style={[styles.subjectChip, { backgroundColor: `${accent}1F` }]}>
            <View style={[styles.subjectDot, { backgroundColor: accent }]} />
            <Text style={[styles.subjectChipText, { color: accent }]}>
              {chapter.subject ? chapter.subject.toUpperCase() : 'PRACTICE'}
            </Text>
          </View>
          <Text style={styles.chapterTitle} numberOfLines={2}>
            {chapter.name}
          </Text>
        </View>
        <ChevronRight color={TEXT_FAINT} size={20} strokeWidth={2.5} />
      </View>

      <View style={styles.chapterProgressHeader}>
        <Text style={styles.chapterProgressLabel}>Mastery</Text>
        <Text style={styles.chapterProgressValue}>{chapter.masteryPct}%</Text>
      </View>
      <ProgressBar value={chapter.masteryPct} />

      <View style={styles.chapterStats}>
        <Text style={styles.chapterStatText}>
          {chapter.questionsSolved} question{chapter.questionsSolved === 1 ? '' : 's'}
        </Text>
        <View style={styles.chapterStatDivider} />
        <Text style={styles.chapterStatText}>{formatMinutes(chapter.minutesSpent)} spent</Text>
        <View style={styles.chapterStatDivider} />
        <Text style={styles.chapterStatText}>{relativeDay(chapter.lastPracticedAt)}</Text>
      </View>
    </TouchableOpacity>
  );
}

// ─── insight carousel ────────────────────────────────────────────────────────

function InsightCarousel({ insights }: { insights: HomeInsight[] }) {
  const scrollRef = useRef<ScrollView>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  // The auto-advance timer is set up once, so it reads live values through refs
  // instead of closing over the first render's (usually empty) insight list.
  const indexRef = useRef(0);
  const countRef = useRef(insights.length);
  countRef.current = insights.length;

  useEffect(() => {
    if (insights.length < 2) return;

    const interval = setInterval(() => {
      const count = countRef.current;
      if (count < 2) return;
      const next = (indexRef.current + 1) % count;
      indexRef.current = next;
      setActiveIndex(next);
      scrollRef.current?.scrollTo({ x: next * CARD_WIDTH, animated: true });
    }, 5000);

    return () => clearInterval(interval);
  }, [insights.length]);

  // A shrinking list must not leave the carousel parked past its last page.
  useEffect(() => {
    if (indexRef.current >= insights.length) {
      indexRef.current = 0;
      setActiveIndex(0);
      scrollRef.current?.scrollTo({ x: 0, animated: false });
    }
  }, [insights.length]);

  const onMomentumEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const slide = event.nativeEvent.layoutMeasurement.width;
    if (!slide) return;
    const index = Math.round(event.nativeEvent.contentOffset.x / slide);
    if (Number.isNaN(index)) return;
    indexRef.current = index;
    setActiveIndex(index);
  };

  if (insights.length === 0) return null;

  return (
    <View>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onMomentumEnd}
        scrollEventThrottle={16}
      >
        {insights.map((card) => (
          <View key={card.id} style={styles.slide}>
            <LinearGradient
              colors={['#494563', '#28263A']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.insightCard}
            >
              <Text style={styles.insightTitle}>{card.title}</Text>
              <Text style={styles.insightText}>{card.text}</Text>
            </LinearGradient>
          </View>
        ))}
      </ScrollView>

      {insights.length > 1 && (
        <View style={styles.dots}>
          {insights.map((card, i) => (
            <View key={card.id} style={i === activeIndex ? styles.dotActive : styles.dotInactive} />
          ))}
        </View>
      )}
    </View>
  );
}

// ─── screen ──────────────────────────────────────────────────────────────────

export default function DashboardScreen({ navigation }: any) {
  const fadeAnim = useRef(new RNAnimated.Value(0)).current;

  const snapshot = useHomeStore((s) => s.snapshot);
  const loading = useHomeStore((s) => s.loading);
  const refreshing = useHomeStore((s) => s.refreshing);
  const error = useHomeStore((s) => s.error);
  const load = useHomeStore((s) => s.load);
  const refresh = useHomeStore((s) => s.refresh);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  useEffect(() => {
    RNAnimated.timing(fadeAnim, { toValue: 1, duration: 450, useNativeDriver: true }).start();
  }, []);

  const openChapter = (chapter: ContinueChapter) => {
    navigation.navigate('Practice', {
      screen: 'PracticeConceptScreen',
      params: {
        chapterId: chapter.chapterId,
        chapterName: chapter.name,
        activeSubject: chapter.subject
          ? chapter.subject.charAt(0).toUpperCase() + chapter.subject.slice(1)
          : 'Physics',
      },
    });
  };

  const showSkeleton = loading && !snapshot;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={TEXT_MUTED} colors={[TEXT_MUTED]} />
        }
      >
        <RNAnimated.View style={{ opacity: fadeAnim }}>
          {/* Header */}
          <View style={styles.header}>
            <Image source={require('../../assets/logo.png')} style={styles.logo} resizeMode="contain" />
            <TouchableOpacity
              style={styles.iconButton}
              activeOpacity={0.7}
              onPress={() => navigation.navigate('Profile', { screen: 'NotificationsScreen' })}
            >
              <Bell color={TEXT_MUTED} size={20} strokeWidth={2} />
            </TouchableOpacity>
          </View>

          {/* Greeting */}
          <View style={styles.greetingBlock}>
            <Text style={styles.greetingLabel}>{greeting()}</Text>
            {showSkeleton ? (
              <Skeleton width={180} height={26} borderRadius={8} style={{ marginTop: 6 }} />
            ) : (
              <Text style={styles.greetingName} numberOfLines={1}>
                {snapshot?.displayName || 'Aspirant'}
              </Text>
            )}
          </View>

          {error && !snapshot ? (
            <View style={styles.errorCard}>
              <Text style={styles.errorTitle}>Couldn't load your dashboard</Text>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity style={styles.retryButton} activeOpacity={0.8} onPress={refresh}>
                <Text style={styles.retryText}>Try again</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {/* HudJee Performance Score */}
          {showSkeleton ? (
            <Skeleton width="100%" height={168} borderRadius={RADIUS} style={{ marginBottom: GAP }} />
          ) : (
            <View style={styles.scoreCard}>
              <View style={styles.watermark} pointerEvents="none">
                <Footprints color="#2A2A2E" size={110} strokeWidth={1} />
              </View>

              <View style={styles.scoreHeader}>
                <View style={styles.scoreHeaderText}>
                  <Text style={styles.eyebrow}>HUDJEE</Text>
                  <Text style={styles.scoreTitle}>Performance Score</Text>
                </View>
                <View style={styles.bandChip}>
                  <Text style={styles.bandChipText}>{snapshot?.performanceBand ?? 'No data yet'}</Text>
                </View>
              </View>

              <View style={styles.scoreValueRow}>
                <Text style={styles.scoreValue}>{snapshot?.performanceScore ?? 0}</Text>
                <Text style={styles.scoreValueSuffix}>/100</Text>
                {snapshot?.performanceDelta ? (
                  <View
                    style={[
                      styles.deltaPill,
                      snapshot.performanceDelta > 0 ? styles.deltaPillUp : styles.deltaPillDown,
                    ]}
                  >
                    {snapshot.performanceDelta > 0 ? (
                      <TrendingUp color="#3FE8A6" size={13} strokeWidth={2.5} />
                    ) : (
                      <TrendingDown color="#F87171" size={13} strokeWidth={2.5} />
                    )}
                    <Text
                      style={[
                        styles.deltaText,
                        { color: snapshot.performanceDelta > 0 ? '#3FE8A6' : '#F87171' },
                      ]}
                    >
                      {Math.abs(snapshot.performanceDelta)} this week
                    </Text>
                  </View>
                ) : null}
              </View>

              <ProgressBar value={snapshot?.performanceScore ?? 0} />
            </View>
          )}

          {/* Today at a glance */}
          {showSkeleton ? (
            <Skeleton width="100%" height={72} borderRadius={16} style={{ marginBottom: 28 }} />
          ) : (
            <View style={styles.statRow}>
              <StatChip
                icon={<Flame color="#F59E0B" size={18} strokeWidth={2.2} />}
                value={`${snapshot?.streakDays ?? 0}`}
                label={`day streak`}
              />
              <StatChip
                icon={<Target color="#3FE8A6" size={18} strokeWidth={2.2} />}
                value={`${snapshot?.questionsToday ?? 0}`}
                label="solved today"
              />
              <StatChip
                icon={<Clock color="#60A5FA" size={18} strokeWidth={2.2} />}
                value={formatMinutes(snapshot?.minutesToday ?? 0)}
                label="today"
              />
            </View>
          )}

          {/* Quick Summary */}
          <View style={styles.section}>
            <SectionHeader title="Quick Summary" />
            {showSkeleton ? (
              <Skeleton width="100%" height={140} borderRadius={RADIUS} />
            ) : snapshot && snapshot.insights.length > 0 ? (
              <InsightCarousel insights={snapshot.insights} />
            ) : (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyText}>
                  Answer a few questions and your weekly insights will show up here.
                </Text>
              </View>
            )}
          </View>

          {/* Success index + syllabus */}
          {showSkeleton ? (
            <View style={styles.metricRow}>
              <Skeleton width="48%" height={150} borderRadius={RADIUS} />
              <Skeleton width="48%" height={150} borderRadius={RADIUS} />
            </View>
          ) : (
            <View style={styles.metricRow}>
              <MetricCard
                title={'Success\nIndex'}
                value={snapshot?.successIndex ?? 0}
                caption={snapshot?.successCaption ?? ''}
              />
              <MetricCard
                title={'Syllabus\nCompletion'}
                value={snapshot?.syllabusCompletion ?? 0}
                caption={snapshot?.syllabusCaption ?? ''}
              />
            </View>
          )}

          {/* Continue Learning */}
          <View style={styles.section}>
            <SectionHeader
              title="Continue Learning"
              actionLabel="View all"
              onAction={() => navigation.navigate('Practice')}
            />

            {showSkeleton ? (
              <View style={{ gap: GAP }}>
                <Skeleton width="100%" height={132} borderRadius={RADIUS} />
                <Skeleton width="100%" height={132} borderRadius={RADIUS} />
              </View>
            ) : snapshot && snapshot.continueChapters.length > 0 ? (
              <View style={{ gap: GAP }}>
                {snapshot.continueChapters.map((chapter) => (
                  <ChapterCard key={chapter.chapterId} chapter={chapter} onPress={() => openChapter(chapter)} />
                ))}
              </View>
            ) : (
              <TouchableOpacity
                style={styles.emptyCard}
                activeOpacity={0.85}
                onPress={() => navigation.navigate('Practice')}
              >
                <View style={styles.emptyIcon}>
                  <BookOpen color={TEXT_MUTED} size={20} strokeWidth={2} />
                </View>
                <Text style={styles.emptyTitle}>Nothing in progress yet</Text>
                <Text style={styles.emptyText}>
                  Pick a chapter and your three most recent ones will live here.
                </Text>
                <View style={styles.emptyCta}>
                  <Text style={styles.emptyCtaText}>Browse chapters</Text>
                  <ArrowRight color={TEXT} size={16} strokeWidth={2.5} />
                </View>
              </TouchableOpacity>
            )}
          </View>
        </RNAnimated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#000000' },
  container: { flex: 1 },
  content: { paddingHorizontal: GUTTER, paddingTop: 8, paddingBottom: 40 },

  // Header
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

  greetingBlock: { marginBottom: 20 },
  greetingLabel: { color: TEXT_MUTED, fontSize: 13, fontWeight: '600', letterSpacing: 0.2 },
  greetingName: { color: TEXT, fontSize: 26, fontWeight: '800', letterSpacing: -0.5, marginTop: 2 },

  // Error
  errorCard: {
    backgroundColor: SURFACE,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#3F2226',
    padding: 16,
    marginBottom: GAP,
  },
  errorTitle: { color: TEXT, fontSize: 15, fontWeight: '700', marginBottom: 4 },
  errorText: { color: TEXT_MUTED, fontSize: 13, lineHeight: 18 },
  retryButton: {
    alignSelf: 'flex-start',
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#26262A',
  },
  retryText: { color: TEXT, fontSize: 13, fontWeight: '700' },

  // Performance score
  scoreCard: {
    backgroundColor: SURFACE,
    borderRadius: RADIUS,
    borderWidth: 1,
    borderColor: SURFACE_BORDER,
    padding: 20,
    marginBottom: GAP,
    overflow: 'hidden',
  },
  watermark: { position: 'absolute', right: -18, bottom: -22, opacity: 0.55 },
  scoreHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 },
  scoreHeaderText: { flexShrink: 1, paddingRight: 12 },
  eyebrow: { color: TEXT_FAINT, fontSize: 11, fontWeight: '700', letterSpacing: 1.2, marginBottom: 4 },
  scoreTitle: { color: TEXT, fontSize: 19, fontWeight: '700', letterSpacing: -0.3 },
  bandChip: {
    backgroundColor: 'rgba(105, 234, 192, 0.12)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  bandChipText: { color: '#69EAC0', fontSize: 11, fontWeight: '700', letterSpacing: 0.2 },
  scoreValueRow: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 12 },
  scoreValue: { color: TEXT, fontSize: 42, fontWeight: '800', letterSpacing: -1.5, lineHeight: 46 },
  scoreValueSuffix: { color: TEXT_FAINT, fontSize: 15, fontWeight: '700', marginLeft: 3 },
  deltaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    alignSelf: 'center',
  },
  deltaPillUp: { backgroundColor: 'rgba(63, 232, 166, 0.12)' },
  deltaPillDown: { backgroundColor: 'rgba(248, 113, 113, 0.12)' },
  deltaText: { fontSize: 11, fontWeight: '700' },

  // Today strip
  statRow: { flexDirection: 'row', gap: GAP, marginBottom: 28 },
  statChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: SURFACE,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: SURFACE_BORDER,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  statIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: SURFACE_INSET,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statTextGroup: { flex: 1 },
  statValue: { color: TEXT, fontSize: 16, fontWeight: '800', letterSpacing: -0.3 },
  statLabel: { color: TEXT_FAINT, fontSize: 11, fontWeight: '600', marginTop: 1 },

  // Sections
  section: { marginBottom: 28 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  sectionTitle: { color: '#F3F4F6', fontSize: 17, fontWeight: '700', letterSpacing: -0.2 },
  sectionAction: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  sectionActionText: { color: TEXT_MUTED, fontSize: 13, fontWeight: '600' },

  // Insight carousel
  slide: { width: CARD_WIDTH },
  insightCard: {
    width: CARD_WIDTH,
    minHeight: 140,
    borderRadius: RADIUS,
    paddingVertical: 22,
    paddingHorizontal: 22,
    justifyContent: 'center',
  },
  insightTitle: {
    color: '#C7C4D8',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 10,
  },
  insightText: { color: TEXT, fontSize: 21, fontWeight: '700', lineHeight: 29, letterSpacing: -0.3 },
  dots: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: 14 },
  dotActive: { width: 18, height: 6, borderRadius: 3, backgroundColor: '#FFFFFF' },
  dotInactive: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#3F3F46' },

  // Metric grid
  metricRow: { flexDirection: 'row', gap: GAP, marginBottom: 28 },
  metricCard: {
    flex: 1,
    minHeight: 150,
    backgroundColor: SURFACE,
    borderRadius: RADIUS,
    borderWidth: 1,
    borderColor: SURFACE_BORDER,
    padding: 16,
    justifyContent: 'space-between',
  },
  metricTitle: { color: '#F9FAFB', fontSize: 16, fontWeight: '800', letterSpacing: -0.3, lineHeight: 21 },
  metricBottom: { marginTop: 16 },
  metricValueRow: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 8 },
  metricValue: { color: TEXT, fontSize: 26, fontWeight: '800', letterSpacing: -0.8 },
  metricValueSuffix: { color: TEXT_FAINT, fontSize: 12, fontWeight: '700', marginLeft: 2 },
  metricCaption: { color: TEXT_FAINT, fontSize: 11, fontWeight: '500', marginTop: 8, lineHeight: 15 },

  // Continue learning
  chapterCard: {
    backgroundColor: SURFACE,
    borderRadius: RADIUS,
    borderWidth: 1,
    borderColor: SURFACE_BORDER,
    padding: 18,
  },
  chapterTop: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16 },
  chapterTitleGroup: { flex: 1, paddingRight: 12 },
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
  chapterTitle: { color: TEXT, fontSize: 19, fontWeight: '700', letterSpacing: -0.3, lineHeight: 24 },
  chapterProgressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  chapterProgressLabel: { color: TEXT_MUTED, fontSize: 12, fontWeight: '600' },
  chapterProgressValue: { color: TEXT, fontSize: 12, fontWeight: '700' },
  chapterStats: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, flexWrap: 'wrap' },
  chapterStatText: { color: TEXT_FAINT, fontSize: 11, fontWeight: '600' },
  chapterStatDivider: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: '#3F3F46' },

  // Empty states
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
  emptyCta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 14 },
  emptyCtaText: { color: TEXT, fontSize: 13, fontWeight: '700' },
});
