import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  Animated as RNAnimated,
  Easing as RNEasing,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useIsFocused } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, LinearTransition } from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import {
  Bell,
  Flame,
  Target,
  Clock,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  BookOpen,
  ArrowRight,
  Percent,
  Check,
} from 'lucide-react-native';

import Skeleton from '../components/Skeleton';
import PressableScale from '../components/PressableScale';
import GradientButton from '../components/ui/GradientButton';
import { HapticService } from '../services/HapticService';
import { typography } from '../theme/typography';
import { ACCENT_GRADIENT } from '../theme/ui';
import { subjectKeyOf } from '../theme/subjects';
import { useHomeStore } from '../store/homeStore';
import { useSubjectStore } from '../store/subjectStore';
import {
  ContinueChapter,
  DayProgress,
  HomeAction,
  HomeInsight,
  DAILY_GOAL_QUESTIONS,
  DAILY_GOAL_MINUTES,
} from '../services/homeApi';

const { width } = Dimensions.get('window');

// ─── design tokens ───────────────────────────────────────────────────────────
// Flat dark system: a pure-black page, solid lifted cards, solid hairline
// borders, and one saturated accent. Nothing on this screen is translucent,
// gradient-filled or glossy — depth comes from the step between #0A0A0C,
// #131317 and #1B1B20 alone, so a card reads the same wherever it lands in the
// scroll instead of picking up whatever is behind it.

const GUTTER = 24;
const GAP = 12;
const CARD_WIDTH = width - GUTTER * 2;
const RADIUS = 18;

// Carousel slides are one gap wider than the card they hold, so two cards never
// touch mid-swipe. Snapping is on this interval rather than `pagingEnabled`,
// which can only ever page by the viewport width.
const SLIDE_WIDTH = CARD_WIDTH + GAP;

/** The page. Near-black, no wash behind it. */
const BG = '#0A0A0C';
/** Cards sit one step off the page… */
const SURFACE = '#131317';
/** …and anything nested inside a card sits one step off the card. */
const SURFACE_SUBTLE = '#1B1B20';
const SURFACE_STRONG = '#232329';
const SURFACE_BORDER = '#26262C';
const TRACK = '#26262C';

const TEXT = '#FFFFFF';
const TEXT_MUTED = '#9CA3AF';
const TEXT_FAINT = '#6B7280';

/** The one accent. Bars and arcs are filled flat with it — no gradient stops. */
const ACCENT = '#38BDF8';

const POSITIVE = '#22C55E';
const NEGATIVE = '#EF4444';

const SUBJECT_COLORS: Record<string, string> = {
  physics: '#38BDF8',
  chemistry: '#22C55E',
  maths: '#A855F7',
};

// Material's fast-out-slow-in. Nothing on this screen moves linearly.
const RN_FAST_OUT_SLOW_IN = RNEasing.bezier(0.4, 0, 0.2, 1);

// Entrance timing: cards settle in sequence rather than all popping in at once.
const STAGGER = 40;
const enter = (index: number) => FadeInDown.springify().damping(18).mass(0.6).delay(index * STAGGER);

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

/** Split for the stat cards, which set the unit in its own smaller type. */
function minutesParts(mins: number): { value: string; unit: string } {
  if (mins < 60) return { value: `${mins}`, unit: 'min' };
  return { value: `${Math.floor(mins / 60)}h ${mins % 60}`, unit: 'min' };
}

// ─── monochrome marks ────────────────────────────────────────────────────────
// The goal strip and the stat cards say how you are doing with brightness
// rather than hue: white for done, fading to grey for not. Colour is spent on
// the readiness ring and the subject accents, so these read as structure.
// Declared here because `BAND_COLORS` below is built from them at module load.

const MARK_DONE = '#FFFFFF';
const MARK_TODAY = '#E5E7EB';
const MARK_PARTIAL = '#6B7280';
const MARK_MISSED = '#4B5563';
const MARK_FUTURE = '#2A2A30';

// ─── qualitative bands ───────────────────────────────────────────────────────
// Each stat card carries a mark saying whether its number is any good. These
// thresholds are presentation only — the underlying values are unchanged.
// Monochrome like the goal strip: brightness carries the verdict.

type Tone = 'good' | 'ok' | 'idle';
interface Band {
  label: string;
  tone: Tone;
}

const BAND_COLORS: Record<Tone, string> = {
  good: MARK_DONE,
  ok: MARK_PARTIAL,
  // Same weight as a missed day in the strip: present, but not asking for
  // attention. The grey used for future days disappears entirely at this size.
  idle: MARK_MISSED,
};

function streakBand(days: number): Band {
  if (days >= 7) return { label: 'Strong', tone: 'good' };
  if (days >= 3) return { label: 'Good', tone: 'good' };
  if (days >= 1) return { label: 'Building', tone: 'ok' };
  return { label: 'Start today', tone: 'idle' };
}

function solvedBand(count: number): Band {
  if (count >= 25) return { label: 'Excellent', tone: 'good' };
  if (count >= 10) return { label: 'Good', tone: 'good' };
  if (count >= 1) return { label: 'Warming up', tone: 'ok' };
  return { label: 'None yet', tone: 'idle' };
}

function timeBand(mins: number): Band {
  if (mins >= 45) return { label: 'Deep work', tone: 'good' };
  if (mins >= 15) return { label: 'Good', tone: 'good' };
  if (mins >= 1) return { label: 'Short', tone: 'ok' };
  return { label: 'None yet', tone: 'idle' };
}

/** The line under the score. Says what the number means, in one breath. */
function scoreCaption(score: number, hasActivity: boolean): string {
  if (!hasActivity || score === 0) return 'Answer a few questions to see where you stand';
  if (score >= 85) return "You're exam ready — hold this line";
  if (score >= 70) return 'Strong shape — keep the pressure on';
  if (score >= 50) return 'On track — a little more each day';
  if (score >= 25) return 'Momentum is building — keep going';
  return 'Good start — consistency does the rest';
}

function relativeDay(iso: string | null): string {
  if (!iso) return 'Not started';
  const then = new Date(iso);
  const startOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((startOf(new Date()) - startOf(then)) / 86400000);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 14) return 'Last week';
  return `${Math.floor(days / 7)} weeks ago`;
}

/** What a tap does, spoken. Screen readers get the destination, not just the number. */
function actionHint(action: HomeAction): string {
  switch (action.kind) {
    case 'chapter':
      return `Opens ${action.chapterName}`;
    case 'streak':
      return 'Opens your streak and activity history';
    case 'arena':
      return 'Opens the arena';
    case 'leaderboard':
      return 'Opens the leaderboard';
    case 'practice':
    default:
      return 'Opens your chapters';
  }
}

// ─── interaction primitives ──────────────────────────────────────────────────
// The press feel — dip on touch down, spring back on release, haptic on
// press-in — lives in `components/PressableScale`, shared with Practice and
// Arena so the whole app answers a tap the same way.

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
  /** Gauge-style fill: overshoots slightly and settles, for the headline score. */
  spring?: boolean;
}) {
  const anim = useRef(new RNAnimated.Value(0)).current;

  useEffect(() => {
    const target = Math.max(0, Math.min(100, value));
    // Width is not a transform, so neither of these can use the native driver.
    const animation = spring
      ? RNAnimated.spring(anim, {
          toValue: target,
          delay,
          friction: 9,
          tension: 42,
          useNativeDriver: false,
        })
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
      <RNAnimated.View
        style={{
          width: barWidth,
          height: '100%',
          borderRadius: height / 2,
          backgroundColor: ACCENT,
        }}
      />
    </View>
  );
}

function SectionHeader({
  title,
  actionLabel,
  onAction,
}: {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {actionLabel && onAction ? (
        <PressableScale onPress={onAction} scaleTo={0.94} hitSlop={10} style={styles.sectionAction}>
          <Text style={styles.sectionActionText}>{actionLabel}</Text>
          <ChevronRight color={TEXT_MUTED} size={15} strokeWidth={2} />
        </PressableScale>
      ) : null}
    </View>
  );
}

const AnimatedCircle = RNAnimated.createAnimatedComponent(Circle);

/**
 * The readiness gauge. Sweeps from 12 o'clock and holds the score itself, so the
 * number and the arc that describes it are the same object.
 */
function ScoreRing({
  value,
  size = 116,
  stroke = 10,
  children,
}: {
  value: number;
  size?: number;
  stroke?: number;
  children?: React.ReactNode;
}) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const anim = useRef(new RNAnimated.Value(0)).current;

  useEffect(() => {
    RNAnimated.timing(anim, {
      toValue: Math.max(0, Math.min(100, value)),
      duration: 900,
      delay: 150,
      easing: RN_FAST_OUT_SLOW_IN,
      // strokeDashoffset is an SVG prop, not a transform — no native driver.
      useNativeDriver: false,
    }).start();
  }, [value]);

  const dashOffset = anim.interpolate({
    inputRange: [0, 100],
    outputRange: [circumference, 0],
    extrapolate: 'clamp',
  });

  return (
    <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle cx={size / 2} cy={size / 2} r={radius} stroke={TRACK} strokeWidth={stroke} fill="none" />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={ACCENT}
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          // Start the sweep at the top rather than at 3 o'clock.
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>

      <View style={styles.ringCenter}>{children}</View>
    </View>
  );
}

// The seven cells are measured rather than flexed: a fixed-size glyph inside a
// `flex: 1` cell lets the row grow past the card instead of dividing it.
const WEEK_CARD_PADDING = 14;
const DAY_CELL_WIDTH = (CARD_WIDTH - WEEK_CARD_PADDING * 2) / 7;
const DAY_GLYPH = 26;
/** The accent ring around today's cell — same weight as the primary button's. */
const DAY_FRAME = 1.5;

/**
 * The mark inside a day cell. A ring for anything in progress, a filled check
 * once the goal is hit, a muted bang for a day that went by untouched.
 */
function DayGlyph({ day, size = DAY_GLYPH }: { day: DayProgress; size?: number }) {
  if (day.status === 'met') {
    return (
      <View style={[styles.glyphFilled, { width: size, height: size, borderRadius: size / 2 }]}>
        <Check color="#0B0B0C" size={16} strokeWidth={3} />
      </View>
    );
  }

  if (day.status === 'missed') {
    // Bare mark, no ring: a missed day should register without competing with
    // the days that actually have progress on them.
    return (
      <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={styles.glyphBang}>!</Text>
      </View>
    );
  }

  if (day.status === 'future') {
    return (
      <View
        style={[
          styles.glyphHollow,
          { width: size, height: size, borderRadius: size / 2, borderColor: MARK_FUTURE },
        ]}
      />
    );
  }

  // today / partial — an arc showing how much of the goal is done.
  const stroke = 3.5;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const arcColor = day.status === 'today' ? MARK_TODAY : MARK_PARTIAL;

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Circle cx={size / 2} cy={size / 2} r={radius} stroke={TRACK} strokeWidth={stroke} fill="none" />
        {day.progress > 0 ? (
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={arcColor}
            strokeWidth={stroke}
            strokeLinecap="round"
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - day.progress)}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        ) : null}
      </Svg>
    </View>
  );
}

/**
 * One column of the week strip.
 *
 * Today is the only cell drawn with the accent ramp around it — the same
 * outline the primary CTA wears, so the two accented things on Home are
 * obviously the same system. Every other day gets an identical box with a
 * transparent frame in place of the gradient, which is what keeps the seven
 * columns exactly the same size: the frame is a 1.5pt padding ring, not a
 * border, because React Native cannot put a gradient in `borderColor`.
 */
function DayBox({ day }: { day: DayProgress }) {
  const inner = (
    <View
      style={[
        styles.dayInner,
        day.status === 'future' && styles.dayInnerFuture,
        day.isToday && styles.dayInnerToday,
      ]}
    >
      <DayGlyph day={day} />
      <Text
        style={[
          styles.dayLabel,
          day.status === 'future' && styles.dayLabelFuture,
          day.isToday && styles.dayLabelToday,
        ]}
      >
        {day.label}
      </Text>
    </View>
  );

  if (!day.isToday) return <View style={styles.dayFrame}>{inner}</View>;

  return (
    <LinearGradient
      colors={ACCENT_GRADIENT}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.dayFrame}
    >
      {inner}
    </LinearGradient>
  );
}

/** Header counter: an icon and a done/target pair. */
function GoalCounter({ icon, done, target }: { icon: React.ReactNode; done: number; target: number }) {
  return (
    <View style={styles.goalCounter}>
      {icon}
      <Text style={styles.goalCounterText}>
        {Math.min(done, target)}
        <Text style={styles.goalCounterTarget}>/{target}</Text>
      </Text>
    </View>
  );
}

/**
 * The daily-goal strip: the calendar week with each day marked against the
 * question goal, and today's two counters in the header.
 */
function WeekStrip({
  week,
  questionsToday,
  minutesToday,
  onPress,
}: {
  week: DayProgress[];
  questionsToday: number;
  minutesToday: number;
  onPress: () => void;
}) {
  return (
    <PressableScale
      onPress={onPress}
      style={styles.weekCard}
      scaleTo={0.98}
      accessibilityLabel={`Daily goal. ${questionsToday} of ${DAILY_GOAL_QUESTIONS} questions and ${minutesToday} of ${DAILY_GOAL_MINUTES} minutes done today.`}
      accessibilityHint="Opens your streak and activity history"
    >
      <View style={styles.weekHeader}>
        <Text style={styles.weekTitle}>Daily Goal</Text>
        <View style={styles.weekCounters}>
          <GoalCounter
            icon={<Target color={TEXT_MUTED} size={15} strokeWidth={2} />}
            done={questionsToday}
            target={DAILY_GOAL_QUESTIONS}
          />
          <GoalCounter
            icon={<Clock color={TEXT_MUTED} size={15} strokeWidth={2} />}
            done={minutesToday}
            target={DAILY_GOAL_MINUTES}
          />
          {/* The affordance the counters alone don't give: this card goes
              somewhere. */}
          <ChevronRight color={TEXT_FAINT} size={15} strokeWidth={2} />
        </View>
      </View>

      <View style={styles.weekRow}>
        {week.map((day) => (
          <View key={day.key} style={styles.dayCell}>
            <DayBox day={day} />
          </View>
        ))}
      </View>
    </PressableScale>
  );
}

/** One of the three cards under the week strip: icon, value + unit, label. */
function StatCard({
  icon,
  value,
  unit,
  label,
  band,
  onPress,
  hint,
}: {
  icon: React.ReactNode;
  value: string;
  unit: string;
  label: string;
  band: Band;
  onPress: () => void;
  hint: string;
}) {
  return (
    <PressableScale
      onPress={onPress}
      style={styles.statCard}
      scaleTo={0.95}
      accessibilityLabel={`${label}: ${value} ${unit}. ${band.label}.`}
      accessibilityHint={hint}
    >
      <View style={styles.statCardTop}>
        <View style={styles.statCardIcon}>{icon}</View>
        {/* The reference puts an overflow menu here; a tone dot fills the same
            slot with something that actually says how you are doing. */}
        <View style={[styles.statCardDot, { backgroundColor: BAND_COLORS[band.tone] }]} />
      </View>
      <View style={styles.statCardValueRow}>
        <Text style={styles.statCardValue} numberOfLines={1}>
          {value}
        </Text>
        <Text style={styles.statCardUnit} numberOfLines={1}>
          {unit}
        </Text>
      </View>
      <Text style={styles.statCardLabel} numberOfLines={1}>
        {label}
      </Text>
    </PressableScale>
  );
}

function MetricCard({
  title,
  value,
  caption,
  delay,
  onPress,
  hint,
}: {
  title: string;
  value: number;
  caption: string;
  delay: number;
  onPress: () => void;
  hint: string;
}) {
  return (
    <PressableScale
      onPress={onPress}
      style={styles.metricCard}
      scaleTo={0.97}
      // The title carries a newline for layout; the label reads it as one line.
      accessibilityLabel={`${title.replace(/\n/g, ' ')}: ${value} out of 100. ${caption}`}
      accessibilityHint={hint}
    >
      <Text style={styles.metricTitle}>{title}</Text>
      <View style={styles.metricBottom}>
        <View style={styles.metricValueRow}>
          <CountUp value={value} style={styles.metricValue} />
          <Text style={styles.metricValueSuffix}>/100</Text>
        </View>
        <ProgressBar value={value} delay={delay} />
        <Text style={styles.metricCaption} numberOfLines={2}>
          {caption}
        </Text>
      </View>
    </PressableScale>
  );
}

/**
 * A continue card opens the chapter's topic list; a long press skips it and
 * drops straight into a session, for the student who already knows what they
 * came for.
 */
function ChapterCard({
  chapter,
  onPress,
  onLongPress,
}: {
  chapter: ContinueChapter;
  onPress: () => void;
  onLongPress: () => void;
}) {
  const accent = SUBJECT_COLORS[chapter.subject] || TEXT_MUTED;

  return (
    <PressableScale
      onPress={onPress}
      onLongPress={onLongPress}
      style={styles.chapterCard}
      scaleTo={0.96}
      accessibilityLabel={`${chapter.name}${
        chapter.subject ? `, ${chapter.subject}` : ''
      }. ${chapter.masteryPct}% mastery, ${chapter.questionsSolved} question${
        chapter.questionsSolved === 1 ? '' : 's'
      } solved.`}
      accessibilityHint="Opens the chapter's topics. Long press to start practising it now"
    >
      <View style={styles.chapterTop}>
        <View style={styles.chapterTitleGroup}>
          <View style={styles.subjectRow}>
            <View style={[styles.subjectDot, { backgroundColor: accent }]} />
            <Text style={styles.subjectText}>
              {chapter.subject ? chapter.subject.toUpperCase() : 'PRACTICE'}
            </Text>
          </View>
          <Text style={styles.chapterTitle} numberOfLines={2}>
            {chapter.name}
          </Text>
        </View>
        <ChevronRight color={TEXT_FAINT} size={18} strokeWidth={2} />
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
        <Text style={styles.chapterStatText}>{formatMinutes(chapter.minutesSpent)}</Text>
        <View style={styles.chapterStatDivider} />
        <Text style={styles.chapterStatText}>{relativeDay(chapter.lastPracticedAt)}</Text>
      </View>
    </PressableScale>
  );
}

// ─── insight carousel ────────────────────────────────────────────────────────

function InsightCarousel({
  insights,
  onSelect,
}: {
  insights: HomeInsight[];
  onSelect: (insight: HomeInsight) => void;
}) {
  const scrollRef = useRef<ScrollView>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  // The auto-advance timer is set up once, so it reads live values through refs
  // instead of closing over the first render's (usually empty) insight list.
  const indexRef = useRef(0);
  const countRef = useRef(insights.length);
  countRef.current = insights.length;

  // A manual swipe — or a finger landing on the strip at all — restarts the
  // dwell, so a pending tick can't yank the card away right after you land on
  // it. The cards navigate now, and a rotation between reading and tapping
  // would send you somewhere you did not choose.
  const [tickSeed, setTickSeed] = useState(0);

  // Home stays mounted behind the other tabs; without this the strip keeps
  // rotating out of sight and greets you on a different card every time.
  const isFocused = useIsFocused();

  useEffect(() => {
    if (insights.length < 2 || !isFocused) return;

    const interval = setInterval(() => {
      const count = countRef.current;
      if (count < 2) return;
      const next = (indexRef.current + 1) % count;
      indexRef.current = next;
      setActiveIndex(next);
      scrollRef.current?.scrollTo({ x: next * SLIDE_WIDTH, animated: true });
    }, 5000);

    return () => clearInterval(interval);
  }, [insights.length, tickSeed, isFocused]);

  // A shrinking list must not leave the carousel parked past its last page.
  useEffect(() => {
    if (indexRef.current >= insights.length) {
      indexRef.current = 0;
      setActiveIndex(0);
      scrollRef.current?.scrollTo({ x: 0, animated: false });
    }
  }, [insights.length]);

  const onMomentumEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    // The viewport is one card wide but a slide is a card plus its gap, so the
    // landed page has to be measured against the interval, not the viewport.
    const index = Math.round(event.nativeEvent.contentOffset.x / SLIDE_WIDTH);
    if (Number.isNaN(index)) return;
    indexRef.current = index;
    setActiveIndex(index);
    setTickSeed((s) => s + 1);
  };

  if (insights.length === 0) return null;

  return (
    <View>
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onMomentumEnd}
        // Touch-down alone resets the dwell: the tick must not fire between a
        // student reading a card and their finger reaching it.
        onTouchStart={() => setTickSeed((s) => s + 1)}
        snapToInterval={SLIDE_WIDTH}
        snapToAlignment="start"
        // Without this a fast flick can carry past several slides at once, which
        // reads as the carousel losing your place.
        disableIntervalMomentum
        decelerationRate="fast"
        scrollEventThrottle={16}
      >
        {insights.map((card, i) => (
          <View
            key={card.id}
            // The last slide drops its trailing gap, so the scroll cannot end on
            // a strip of empty space past the final card.
            style={[styles.slide, i === insights.length - 1 && styles.slideLast]}
          >
            <PressableScale
              onPress={() => onSelect(card)}
              style={styles.insightCard}
              scaleTo={0.97}
              accessibilityLabel={`${card.title}. ${card.text}`}
              accessibilityHint={actionHint(card.action)}
            >
              <View style={styles.insightHeader}>
                <Text style={styles.insightTitle}>{card.title}</Text>
                <ChevronRight color={TEXT_FAINT} size={15} strokeWidth={2} />
              </View>
              <Text style={styles.insightText}>{card.text}</Text>
            </PressableScale>
          </View>
        ))}
      </ScrollView>

      {insights.length > 1 && (
        <View style={styles.dots}>
          {insights.map((card, i) => (
            <Animated.View
              key={card.id}
              layout={LinearTransition.duration(220)}
              style={i === activeIndex ? styles.dotActive : styles.dotInactive}
            />
          ))}
        </View>
      )}
    </View>
  );
}

// ─── screen ──────────────────────────────────────────────────────────────────

export default function DashboardScreen({ navigation }: any) {
  const snapshot = useHomeStore((s) => s.snapshot);
  const loading = useHomeStore((s) => s.loading);
  const error = useHomeStore((s) => s.error);
  const load = useHomeStore((s) => s.load);
  const refresh = useHomeStore((s) => s.refresh);
  const invalidate = useHomeStore((s) => s.invalidate);
  const setSubject = useSubjectStore((s) => s.setSubject);

  // Data refreshes quietly whenever the tab regains focus. There is deliberately
  // no pull-to-refresh: a spinner that fires mid-scroll makes an otherwise static
  // screen feel like it is reloading under you.
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  // ── destinations ──
  // Every card on this screen goes somewhere. The handlers are gathered here
  // rather than spread through the JSX so the whole map is readable in one
  // place, and so each one can prime the two bits of shared state a destination
  // depends on: the subject tint, and Home's own staleness stamp.

  /**
   * Anything that can change today's numbers drops the freshness stamp on the
   * way out, so coming back to Home refetches instead of showing the snapshot
   * from before the session.
   */
  const leavingForPractice = useCallback(
    (subject?: string | null) => {
      invalidate();
      setSubject(subjectKeyOf(subject));
    },
    [invalidate, setSubject]
  );

  /** The chapter list, optionally already switched to a subject. */
  const openPractice = useCallback(
    (subject?: string | null) => {
      leavingForPractice(subject);
      navigation.navigate('Practice', {
        screen: 'PracticeScreen',
        // Named explicitly so a deep Practice stack pops back to the list
        // instead of landing on whatever screen was left open there.
        params: { subject: subject ?? undefined },
      });
    },
    [navigation, leavingForPractice]
  );

  /** A chapter's topic list. */
  const openChapter = useCallback(
    (chapter: { chapterId: string; name: string; subject: string | null }) => {
      leavingForPractice(chapter.subject);
      navigation.navigate('Practice', {
        screen: 'PracticeConceptScreen',
        params: {
          chapterId: chapter.chapterId,
          chapterName: chapter.name,
          // The concept screen runs this through subjectKeyOf(), which
          // lowercases, so the raw subject goes straight through.
          activeSubject: chapter.subject ?? undefined,
        },
      });
    },
    [navigation, leavingForPractice]
  );

  /** Straight into questions on a chapter, skipping the topic list. */
  const startSession = useCallback(
    (chapter: ContinueChapter) => {
      leavingForPractice(chapter.subject);
      navigation.navigate('AdaptiveSessionScreen', {
        chapterId: chapter.chapterId,
        chapterTitle: chapter.name,
      });
    },
    [navigation, leavingForPractice]
  );

  const openStreak = useCallback(() => {
    navigation.navigate('Challenges', { screen: 'StreakDetail' });
  }, [navigation]);

  const openLeaderboard = useCallback(() => {
    navigation.navigate('Challenges', { screen: 'LeaderBoard' });
  }, [navigation]);

  const openArena = useCallback(() => {
    invalidate();
    navigation.navigate('Arena', { screen: 'ArenaHome' });
  }, [navigation, invalidate]);

  const openNotifications = useCallback(() => {
    navigation.navigate('Profile', { screen: 'NotificationsScreen' });
  }, [navigation]);

  /** Resolves an insight's declared destination to a navigation call. */
  const runAction = useCallback(
    (action: HomeAction) => {
      switch (action.kind) {
        case 'chapter':
          openChapter({
            chapterId: action.chapterId,
            name: action.chapterName,
            subject: action.subject,
          });
          return;
        case 'streak':
          openStreak();
          return;
        case 'arena':
          openArena();
          return;
        case 'leaderboard':
          openLeaderboard();
          return;
        case 'practice':
        default:
          openPractice(action.kind === 'practice' ? action.subject : null);
      }
    },
    [openChapter, openStreak, openArena, openLeaderboard, openPractice]
  );

  // The headline CTA resumes the most recent chapter when there is one, and
  // otherwise opens the list — "start practising" should start practising, not
  // hand you a menu you have already seen three times today.
  const resumeTarget = snapshot?.continueChapters?.[0] ?? null;
  const onPrimaryCta = useCallback(() => {
    if (resumeTarget) startSession(resumeTarget);
    else openPractice();
  }, [resumeTarget, startSession, openPractice]);

  const showSkeleton = loading && !snapshot;

  return (
    // Flat near-black page. The card stack does the work that the old wash did;
    // a gradient behind solid cards only ever fights them.
    <View style={styles.root}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <Animated.View entering={enter(0)} style={styles.header}>
            <Image source={require('../../assets/logo.png')} style={styles.logo} resizeMode="contain" />
            <PressableScale
              scaleTo={0.9}
              style={styles.iconButton}
              onPress={openNotifications}
              accessibilityLabel="Notifications"
            >
              <Bell color={TEXT_MUTED} size={19} strokeWidth={1.8} />
            </PressableScale>
          </Animated.View>

          {/* Greeting. With no real name to use, the time-of-day line becomes the
              heading on its own rather than sitting above a placeholder. */}
          <Animated.View entering={enter(1)} style={styles.greetingBlock}>
            {showSkeleton ? (
              <>
                <Text style={styles.greetingLabel}>{greeting()}</Text>
                <Skeleton width={180} height={28} borderRadius={8} style={{ marginTop: 8 }} />
              </>
            ) : snapshot?.displayName ? (
              <>
                <Text style={styles.greetingLabel}>{greeting()}</Text>
                <Text style={styles.greetingName} numberOfLines={1}>
                  {snapshot.displayName}
                </Text>
              </>
            ) : (
              <>
                <Text style={styles.greetingName}>{greeting()}</Text>
                <Text style={styles.greetingSub}>Ready for today's practice?</Text>
              </>
            )}
          </Animated.View>

          {error && !snapshot ? (
            <Animated.View entering={enter(2)} style={styles.errorCard}>
              <Text style={styles.errorTitle}>Couldn't load your dashboard</Text>
              <Text style={styles.errorText}>{error}</Text>
              <PressableScale
                style={styles.retryButton}
                onPress={refresh}
                scaleTo={0.94}
                accessibilityLabel="Try loading your dashboard again"
              >
                <Text style={styles.retryText}>Try again</Text>
              </PressableScale>
            </Animated.View>
          ) : null}

          {/* This week */}
          <Animated.View entering={enter(2)}>
            {showSkeleton ? (
              <Skeleton width="100%" height={124} borderRadius={RADIUS} style={{ marginBottom: GAP }} />
            ) : (
              <WeekStrip
                week={snapshot?.week ?? []}
                questionsToday={snapshot?.questionsToday ?? 0}
                minutesToday={snapshot?.minutesToday ?? 0}
                onPress={openStreak}
              />
            )}
          </Animated.View>

          {/* Readiness Score — the headline card, with the score living inside
              the gauge that describes it. */}
          <Animated.View entering={enter(3)}>
            {showSkeleton ? (
              <Skeleton width="100%" height={244} borderRadius={RADIUS} style={{ marginBottom: GAP }} />
            ) : (
              <View style={styles.scoreCard}>
                <View style={styles.scoreTop}>
                  <View style={styles.scoreTextCol}>
                    <Text style={styles.scoreTitle}>Readiness Score</Text>
                    <Text style={styles.scoreCaption}>
                      {scoreCaption(snapshot?.readinessScore ?? 0, snapshot?.hasActivity ?? false)}
                    </Text>

                    <View style={styles.scoreMetaRow}>
                      <Percent color={TEXT_FAINT} size={12} strokeWidth={2} />
                      <Text style={styles.scoreMetaText}>
                        {snapshot?.accuracyPct != null
                          ? `${snapshot.accuracyPct}% accuracy`
                          : 'No accuracy yet'}
                      </Text>
                      {snapshot?.readinessDelta ? (
                        <>
                          <View style={styles.scoreMetaDivider} />
                          {snapshot.readinessDelta > 0 ? (
                            <TrendingUp color={POSITIVE} size={12} strokeWidth={2.2} />
                          ) : (
                            <TrendingDown color={NEGATIVE} size={12} strokeWidth={2.2} />
                          )}
                          <Text
                            style={[
                              styles.scoreMetaText,
                              { color: snapshot.readinessDelta > 0 ? POSITIVE : NEGATIVE },
                            ]}
                          >
                            {Math.abs(snapshot.readinessDelta)} this week
                          </Text>
                        </>
                      ) : null}
                    </View>
                  </View>

                  <ScoreRing value={snapshot?.readinessScore ?? 0}>
                    <CountUp value={snapshot?.readinessScore ?? 0} style={styles.ringValue} />
                    <Text style={styles.ringSuffix}>/100</Text>
                  </ScoreRing>
                </View>

                {/* The label stays short: a chapter name here would grow the
                    button past the card on the long ones. */}
                <GradientButton
                  label={resumeTarget ? 'Resume practice' : 'Start practising'}
                  icon={<ArrowRight color="#FFFFFF" size={16} strokeWidth={2.4} />}
                  onPress={onPrimaryCta}
                  style={styles.scoreCta}
                  accessibilityLabel={
                    resumeTarget
                      ? `Resume practice on ${resumeTarget.name}`
                      : 'Start practising'
                  }
                  accessibilityHint={
                    resumeTarget ? 'Starts a session straight away' : 'Opens your chapters'
                  }
                />
              </View>
            )}
          </Animated.View>

          {/* Today at a glance */}
          <Animated.View entering={enter(4)}>
            {showSkeleton ? (
              <Skeleton width="100%" height={132} borderRadius={RADIUS} style={{ marginBottom: 32 }} />
            ) : (
              <View style={styles.statRow}>
                {/* Streak is a history, so it opens one; the other two are
                    today's totals, and the only way to move them is to
                    practise. */}
                <StatCard
                  icon={<Flame color={TEXT} size={18} strokeWidth={1.8} />}
                  value={`${snapshot?.streakDays ?? 0}`}
                  unit={(snapshot?.streakDays ?? 0) === 1 ? 'day' : 'days'}
                  label="Streak"
                  band={streakBand(snapshot?.streakDays ?? 0)}
                  onPress={openStreak}
                  hint="Opens your streak and activity history"
                />
                <StatCard
                  icon={<Target color={TEXT} size={18} strokeWidth={1.8} />}
                  value={`${snapshot?.questionsToday ?? 0}`}
                  unit="Qs"
                  label="Solved today"
                  band={solvedBand(snapshot?.questionsToday ?? 0)}
                  onPress={onPrimaryCta}
                  hint={resumeTarget ? 'Starts a session straight away' : 'Opens your chapters'}
                />
                <StatCard
                  icon={<Clock color={TEXT} size={18} strokeWidth={1.8} />}
                  value={minutesParts(snapshot?.minutesToday ?? 0).value}
                  unit={minutesParts(snapshot?.minutesToday ?? 0).unit}
                  label="Time today"
                  band={timeBand(snapshot?.minutesToday ?? 0)}
                  onPress={onPrimaryCta}
                  hint={resumeTarget ? 'Starts a session straight away' : 'Opens your chapters'}
                />
              </View>
            )}
          </Animated.View>

          {/* Insights */}
          <Animated.View entering={enter(5)} style={styles.section}>
            <SectionHeader title="Insights" />
            {showSkeleton ? (
              <Skeleton width="100%" height={132} borderRadius={RADIUS} />
            ) : snapshot && snapshot.insights.length > 0 ? (
              <InsightCarousel
                insights={snapshot.insights}
                onSelect={(insight) => runAction(insight.action)}
              />
            ) : (
              <PressableScale
                style={styles.emptyCard}
                scaleTo={0.97}
                onPress={() => openPractice()}
                accessibilityLabel="No insights yet"
                accessibilityHint="Opens your chapters"
              >
                <Text style={styles.emptyText}>
                  Answer a few questions and your weekly insights will show up here.
                </Text>
                <View style={styles.emptyCta}>
                  <Text style={styles.emptyCtaText}>Start practising</Text>
                  <ArrowRight color={TEXT} size={15} strokeWidth={2} />
                </View>
              </PressableScale>
            )}
          </Animated.View>

          {/* Consistency + Coverage */}
          <Animated.View entering={enter(6)}>
            {showSkeleton ? (
              <View style={styles.metricRow}>
                <Skeleton width="48%" height={168} borderRadius={RADIUS} />
                <Skeleton width="48%" height={168} borderRadius={RADIUS} />
              </View>
            ) : (
              <View style={styles.metricRow}>
                {/* Consistency is about days, so it opens the activity
                    history; coverage is about the syllabus, so it opens it. */}
                <MetricCard
                  title={'Consistency\nScore'}
                  value={snapshot?.consistencyScore ?? 0}
                  caption={snapshot?.consistencyCaption ?? ''}
                  delay={180}
                  onPress={openStreak}
                  hint="Opens your streak and activity history"
                />
                <MetricCard
                  title={'Coverage'}
                  value={snapshot?.coverageScore ?? 0}
                  caption={snapshot?.coverageCaption ?? ''}
                  delay={240}
                  onPress={() => openPractice()}
                  hint="Opens your chapters"
                />
              </View>
            )}
          </Animated.View>

          {/* Continue Learning */}
          <Animated.View entering={enter(7)} style={styles.section}>
            <SectionHeader
              title="Continue Learning"
              actionLabel="View all"
              onAction={() => openPractice(resumeTarget?.subject)}
            />

            {showSkeleton ? (
              <View style={{ gap: GAP }}>
                <Skeleton width="100%" height={140} borderRadius={RADIUS} />
                <Skeleton width="100%" height={140} borderRadius={RADIUS} />
              </View>
            ) : snapshot && snapshot.continueChapters.length > 0 ? (
              <View style={{ gap: GAP }}>
                {snapshot.continueChapters.map((chapter) => (
                  <ChapterCard
                    key={chapter.chapterId}
                    chapter={chapter}
                    onPress={() => openChapter(chapter)}
                    // A second, firmer haptic separates the shortcut from the
                    // ordinary tap that already fired one on press-in.
                    onLongPress={() => {
                      HapticService.medium();
                      startSession(chapter);
                    }}
                  />
                ))}
              </View>
            ) : (
              <PressableScale
                style={styles.emptyCard}
                scaleTo={0.96}
                onPress={() => openPractice()}
                accessibilityLabel="Nothing in progress yet"
                accessibilityHint="Opens your chapters"
              >
                <View style={styles.emptyIcon}>
                  <BookOpen color={TEXT_MUTED} size={19} strokeWidth={1.8} />
                </View>
                <Text style={styles.emptyTitle}>Nothing in progress yet</Text>
                <Text style={styles.emptyText}>
                  Pick a chapter and your three most recent ones will live here.
                </Text>
                <View style={styles.emptyCta}>
                  <Text style={styles.emptyCtaText}>Browse chapters</Text>
                  <ArrowRight color={TEXT} size={15} strokeWidth={2} />
                </View>
              </PressableScale>
            )}
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
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

  greetingBlock: { marginBottom: 28 },
  greetingLabel: {
    color: TEXT_MUTED,
    fontSize: 14,
    fontFamily: typography.regular,
    letterSpacing: 0.2,
  },
  greetingName: {
    color: TEXT,
    fontSize: 28,
    fontFamily: typography.bold,
    letterSpacing: -0.4,
    marginTop: 4,
  },
  greetingSub: {
    color: TEXT_MUTED,
    fontSize: 15,
    fontFamily: typography.regular,
    marginTop: 6,
  },

  // Error
  errorCard: {
    backgroundColor: SURFACE,
    borderRadius: RADIUS,
    borderWidth: 1,
    borderColor: NEGATIVE,
    padding: 18,
    marginBottom: GAP,
  },
  errorTitle: { color: TEXT, fontSize: 15, fontFamily: typography.semiBold, marginBottom: 4 },
  errorText: { color: TEXT_MUTED, fontSize: 13, fontFamily: typography.regular, lineHeight: 19 },
  retryButton: {
    alignSelf: 'flex-start',
    marginTop: 14,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: SURFACE_BORDER,
    backgroundColor: SURFACE_SUBTLE,
  },
  retryText: { color: TEXT, fontSize: 13, fontFamily: typography.semiBold },

  // Daily goal strip
  weekCard: {
    backgroundColor: SURFACE,
    borderRadius: RADIUS,
    borderWidth: 1,
    borderColor: SURFACE_BORDER,
    padding: 14,
    marginBottom: GAP,
  },
  weekHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  weekTitle: { color: TEXT, fontSize: 16, fontFamily: typography.bold, letterSpacing: -0.3 },
  weekCounters: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  goalCounter: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  goalCounterText: { color: TEXT, fontSize: 13, fontFamily: typography.bold, letterSpacing: -0.2 },
  goalCounterTarget: { color: TEXT_FAINT, fontFamily: typography.regular },

  weekRow: { flexDirection: 'row' },
  dayCell: { width: DAY_CELL_WIDTH, alignItems: 'center' },
  // The ring the gradient is painted into. Present on every day so the cells
  // stay identically sized whether or not they are today.
  dayFrame: { width: DAY_CELL_WIDTH - 5, borderRadius: 12, padding: DAY_FRAME },
  dayInner: {
    // One frame-width tighter, so the inner curve stays concentric with the
    // outer one instead of leaving a bright wedge in each corner.
    borderRadius: 12 - DAY_FRAME,
    paddingVertical: 9,
    alignItems: 'center',
    backgroundColor: SURFACE_SUBTLE,
  },
  dayInnerFuture: { backgroundColor: 'transparent' },
  dayInnerToday: { backgroundColor: SURFACE_STRONG },
  dayLabel: { color: TEXT_MUTED, fontSize: 11, fontFamily: typography.semiBold, marginTop: 7 },
  dayLabelFuture: { color: TEXT_FAINT, fontFamily: typography.regular },
  dayLabelToday: { color: TEXT },

  glyphFilled: { backgroundColor: MARK_DONE, justifyContent: 'center', alignItems: 'center' },
  glyphHollow: { borderWidth: 3, justifyContent: 'center', alignItems: 'center' },
  glyphBang: { color: MARK_MISSED, fontSize: 19, fontFamily: typography.bold, lineHeight: 24 },

  // Today's three stats
  statRow: { flexDirection: 'row', gap: GAP, marginBottom: 32 },
  statCard: {
    flex: 1,
    backgroundColor: SURFACE,
    borderRadius: RADIUS,
    borderWidth: 1,
    borderColor: SURFACE_BORDER,
    padding: 14,
  },
  statCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  statCardIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: SURFACE_SUBTLE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // 6pt reads as a square once antialiasing has had its way with it.
  statCardDot: { width: 8, height: 8, borderRadius: 4, marginTop: 3 },
  statCardValueRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: 16 },
  statCardValue: { color: TEXT, fontSize: 19, fontFamily: typography.bold, letterSpacing: -0.5 },
  statCardUnit: { color: TEXT_MUTED, fontSize: 11, fontFamily: typography.regular, marginLeft: 3 },
  statCardLabel: { color: TEXT_FAINT, fontSize: 11, fontFamily: typography.regular, marginTop: 3 },

  // Readiness score
  scoreCard: {
    backgroundColor: SURFACE,
    borderRadius: RADIUS,
    borderWidth: 1,
    borderColor: SURFACE_BORDER,
    padding: 22,
    marginBottom: GAP,
  },
  scoreTop: { flexDirection: 'row', alignItems: 'center' },
  // The ring is a fixed 116pt, so the text column takes whatever is left.
  scoreTextCol: { flex: 1, paddingRight: 16 },
  scoreTitle: { color: TEXT, fontSize: 22, fontFamily: typography.bold, letterSpacing: -0.5 },
  scoreCaption: {
    color: TEXT_MUTED,
    fontSize: 13,
    fontFamily: typography.regular,
    lineHeight: 19,
    marginTop: 8,
  },
  scoreMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 12, flexWrap: 'wrap' },
  scoreMetaText: { color: TEXT_FAINT, fontSize: 11, fontFamily: typography.regular },
  scoreMetaDivider: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: '#3F3F46', marginHorizontal: 2 },
  ringCenter: { alignItems: 'center' },
  ringValue: { color: TEXT, fontSize: 30, fontFamily: typography.bold, letterSpacing: -1, lineHeight: 34 },
  ringSuffix: { color: TEXT_FAINT, fontSize: 11, fontFamily: typography.regular, marginTop: 1 },
  // Sizing, fill and radius all live in GradientButton; the card only says
  // where the button sits.
  scoreCta: { marginTop: 22 },

  track: { width: '100%', backgroundColor: TRACK, overflow: 'hidden' },

  // Sections
  section: { marginBottom: 32 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { color: TEXT, fontSize: 17, fontFamily: typography.semiBold, letterSpacing: -0.2 },
  sectionAction: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  sectionActionText: { color: TEXT_MUTED, fontSize: 13, fontFamily: typography.regular },

  // Insight carousel
  slide: { width: SLIDE_WIDTH, paddingRight: GAP },
  slideLast: { width: CARD_WIDTH, paddingRight: 0 },
  insightCard: {
    width: CARD_WIDTH,
    minHeight: 132,
    borderRadius: RADIUS,
    // Same solid card as everything else; the accent lives in the eyebrow only.
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: SURFACE_BORDER,
    paddingVertical: 24,
    paddingHorizontal: 22,
    justifyContent: 'center',
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  insightTitle: {
    color: '#A855F7',
    fontSize: 11,
    fontFamily: typography.semiBold,
    textTransform: 'uppercase',
    letterSpacing: 1.4,
  },
  insightText: {
    color: TEXT,
    fontSize: 20,
    fontFamily: typography.semiBold,
    lineHeight: 29,
    letterSpacing: -0.3,
  },
  dots: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: 16 },
  dotActive: { width: 16, height: 5, borderRadius: 2.5, backgroundColor: '#FFFFFF' },
  dotInactive: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: '#3F3F46' },

  // Metric grid
  metricRow: { flexDirection: 'row', gap: GAP, marginBottom: 32 },
  metricCard: {
    flex: 1,
    minHeight: 168,
    backgroundColor: SURFACE,
    borderRadius: RADIUS,
    borderWidth: 1,
    borderColor: SURFACE_BORDER,
    padding: 18,
    justifyContent: 'space-between',
  },
  metricTitle: { color: TEXT, fontSize: 15, fontFamily: typography.semiBold, letterSpacing: -0.2, lineHeight: 21 },
  metricBottom: { marginTop: 18 },
  metricValueRow: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 10 },
  metricValue: { color: TEXT, fontSize: 28, fontFamily: typography.bold, letterSpacing: -0.8 },
  metricValueSuffix: { color: TEXT_FAINT, fontSize: 12, fontFamily: typography.regular, marginLeft: 3 },
  metricCaption: { color: TEXT_FAINT, fontSize: 11, fontFamily: typography.regular, marginTop: 12, lineHeight: 15 },

  // Continue learning
  chapterCard: {
    backgroundColor: SURFACE,
    borderRadius: RADIUS,
    borderWidth: 1,
    borderColor: SURFACE_BORDER,
    padding: 20,
  },
  chapterTop: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 18 },
  chapterTitleGroup: { flex: 1, paddingRight: 12 },
  subjectRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  subjectDot: { width: 5, height: 5, borderRadius: 2.5 },
  subjectText: { color: TEXT_MUTED, fontSize: 10, fontFamily: typography.semiBold, letterSpacing: 1.2 },
  chapterTitle: { color: TEXT, fontSize: 19, fontFamily: typography.semiBold, letterSpacing: -0.3, lineHeight: 25 },
  chapterProgressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 9 },
  chapterProgressLabel: { color: TEXT_MUTED, fontSize: 12, fontFamily: typography.regular },
  chapterProgressValue: { color: TEXT, fontSize: 12, fontFamily: typography.semiBold },
  chapterStats: { flexDirection: 'row', alignItems: 'center', gap: 9, marginTop: 14, flexWrap: 'wrap' },
  chapterStatText: { color: TEXT_FAINT, fontSize: 11, fontFamily: typography.regular },
  chapterStatDivider: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: '#3F3F46' },

  // Empty states
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
    backgroundColor: SURFACE_SUBTLE,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  emptyTitle: { color: TEXT, fontSize: 15, fontFamily: typography.semiBold, marginBottom: 5 },
  emptyText: { color: TEXT_MUTED, fontSize: 13, fontFamily: typography.regular, lineHeight: 20 },
  emptyCta: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 16 },
  emptyCtaText: { color: TEXT, fontSize: 13, fontFamily: typography.semiBold },
});
