import React, { useEffect, useRef } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Bell, Target, ClipboardList, Trophy, Flame, BookOpen, BarChart3 } from 'lucide-react-native';
import { colors } from '../theme/colors';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 44) / 2; // 16 padding each side + 12 gap between cards

// ─── Animated Metric Card ───────────────────────────────────────────────────
function MetricCard({
  title,
  value,
  unit,
  icon,
  delay = 0,
  accent = colors.primaryGradientStart,
  showProgress = false,
  progressValue = 0,
}: any) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        delay,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      useNativeDriver: true,
      friction: 8,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      friction: 8,
    }).start();
  };

  return (
    <Animated.View
      style={{
        opacity: fadeAnim,
        transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
        width: CARD_WIDTH,
        marginBottom: 16,
      }}
    >
      <Pressable onPressIn={handlePressIn} onPressOut={handlePressOut}>
        <View style={styles.metricCard}>
          {/* Background icon watermark */}
          {icon && (
            <View style={styles.metricIconBg}>
              {icon}
            </View>
          )}

          <Text style={styles.metricTitle}>{title}</Text>

          {value ? (
            <View style={styles.metricValueRow}>
              <Text style={[styles.metricValue, { color: accent }]}>{value}</Text>
              {unit && <Text style={[styles.metricUnit, { color: accent }]}>{unit}</Text>}
            </View>
          ) : null}

          {showProgress && (
            <View style={styles.metricProgressContainer}>
              <Text style={styles.metricProgressLabel}>{progressValue}/100</Text>
              <View style={styles.metricTrack}>
                <LinearGradient
                  colors={[colors.primaryGradientStart, colors.primaryGradientEnd]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[styles.metricFill, { width: `${progressValue}%` }]}
                />
              </View>
            </View>
          )}
        </View>
      </Pressable>
    </Animated.View>
  );
}

// ─── Continue Learning Card ──────────────────────────────────────────────────
function LearningCard({ title, progress, onPress }: any) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        delay: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        delay: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={{
        opacity: fadeAnim,
        transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
        marginBottom: 12,
      }}
    >
      <Pressable
        onPressIn={() =>
          Animated.spring(scaleAnim, { toValue: 0.97, useNativeDriver: true, friction: 8 }).start()
        }
        onPressOut={() =>
          Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, friction: 8 }).start()
        }
        onPress={onPress}
      >
        <View style={styles.learningCard}>
          <Text style={styles.learningTitle}>{title}</Text>
          <View style={styles.learningProgressRow}>
            <Text style={styles.learningProgressLabel}>{progress}%</Text>
          </View>
          <View style={styles.learningTrack}>
            <LinearGradient
              colors={[colors.primaryGradientStart, colors.primaryGradientEnd]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.learningFill, { width: `${progress}%` }]}
            />
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

// ─── Main Dashboard ──────────────────────────────────────────────────────────
export default function DashboardScreen({ navigation }: any) {
  const headerFade = useRef(new Animated.Value(0)).current;
  const headerSlide = useRef(new Animated.Value(-10)).current;
  const perfFade = useRef(new Animated.Value(0)).current;
  const perfSlide = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(headerFade, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(headerSlide, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start();

    Animated.parallel([
      Animated.timing(perfFade, { toValue: 1, duration: 500, delay: 200, useNativeDriver: true }),
      Animated.timing(perfSlide, { toValue: 0, duration: 500, delay: 200, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentPadding}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ── */}
        <Animated.View
          style={[
            styles.header,
            { opacity: headerFade, transform: [{ translateY: headerSlide }] },
          ]}
        >
          <Image
            source={require('../../assets/logo.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
          <TouchableOpacity style={styles.iconButton} activeOpacity={0.7}>
            <Bell color={colors.textSecondary} size={22} />
          </TouchableOpacity>
        </Animated.View>

        {/* ── Performance Score ── */}
        <Animated.View
          style={{ opacity: perfFade, transform: [{ translateY: perfSlide }] }}
        >
          <View style={styles.performanceCard}>
            <View style={styles.performanceHeader}>
              <View>
                <Text style={styles.hudjeeLabel}>HudJee</Text>
                <Text style={styles.performanceTitle}>Performance Score</Text>
              </View>
              <Text style={styles.performanceValue}>17/100</Text>
            </View>
            {/* Gradient Progress Bar */}
            <View style={styles.perfTrack}>
              <LinearGradient
                colors={[colors.primaryGradientStart, '#C084FC', colors.accent]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.perfFill, { width: '17%' }]}
              />
            </View>
          </View>
        </Animated.View>

        {/* ── Metrics Grid ── */}
        <View style={styles.metricsGrid}>
          <MetricCard
            title="Active Streak"
            value="7"
            icon={<Flame size={52} color="#7C3AED" strokeWidth={1} />}
            delay={150}
          />
          <MetricCard
            title="Time Spent"
            value="4"
            unit="hrs"
            icon={<BookOpen size={52} color={colors.accent} strokeWidth={1} />}
            accent={colors.accent}
            delay={200}
          />
          <MetricCard
            title="Success Index"
            icon={<Target size={52} color="#7C3AED" strokeWidth={1} />}
            delay={250}
            showProgress
            progressValue={17}
          />
          <MetricCard
            title="Syllabus Completion"
            icon={<ClipboardList size={52} color="#7C3AED" strokeWidth={1} />}
            delay={300}
            showProgress
            progressValue={17}
          />
          <MetricCard
            title="Today's Goal"
            value="7"
            icon={<BarChart3 size={52} color="#7C3AED" strokeWidth={1} />}
            delay={350}
          />
          <MetricCard
            title="Your Rank"
            value="7"
            icon={<Trophy size={52} color={colors.accent} strokeWidth={1} />}
            accent={colors.accent}
            delay={400}
          />
        </View>

        {/* ── Continue Learning ── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Continue Learning</Text>
          <TouchableOpacity activeOpacity={0.7}>
            <Text style={styles.viewAll}>View All</Text>
          </TouchableOpacity>
        </View>

        <LearningCard
          title="NLM"
          progress={17}
          onPress={() => navigation.navigate('Learn')}
        />

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
  },
  contentPadding: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  logoImage: {
    width: 140,
    height: 40,
    tintColor: '#FFFFFF',
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Performance Card
  performanceCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  performanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  hudjeeLabel: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  performanceTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  performanceValue: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '500',
    marginTop: 4,
  },
  perfTrack: {
    width: '100%',
    height: 5,
    backgroundColor: colors.border,
    borderRadius: 3,
    overflow: 'hidden',
  },
  perfFill: {
    height: '100%',
    borderRadius: 3,
  },

  // Metrics Grid
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,                        // explicit 12px gap between all cards
    marginTop: 4,
    marginBottom: 8,
  },
  metricCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,               // matches Figma — not too round
    padding: 14,
    height: 130,                    // fixed height so all cards are uniform
    justifyContent: 'space-between',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  metricIconBg: {
    position: 'absolute',
    right: -10,
    bottom: -10,
    opacity: 0.15,
  },
  metricTitle: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
    maxWidth: '75%',                // prevents text from overlapping icon
  },
  metricValueRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  metricValue: {
    fontSize: 42,
    fontWeight: '700',
    lineHeight: 46,
    letterSpacing: -1,
  },
  metricUnit: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 6,
    marginLeft: 2,
  },
  metricProgressContainer: {
    justifyContent: 'flex-end',
  },
  metricProgressLabel: {
    color: colors.textSecondary,
    fontSize: 10,
    textAlign: 'right',
    marginBottom: 5,
  },
  metricTrack: {
    width: '100%',
    height: 5,
    backgroundColor: colors.border,
    borderRadius: 3,
    overflow: 'hidden',
  },
  metricFill: {
    height: '100%',
    borderRadius: 3,
  },

  // Section Header
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 4,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  viewAll: {
    color: colors.primaryGradientStart,
    fontSize: 14,
    fontWeight: '600',
  },

  // Learning Card
  learningCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
  },
  learningTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 20,
  },
  learningProgressRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 5,
  },
  learningProgressLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '500',
  },
  learningTrack: {
    width: '100%',
    height: 5,
    backgroundColor: colors.border,
    borderRadius: 3,
    overflow: 'hidden',
  },
  learningFill: {
    height: '100%',
    borderRadius: 3,
  },
});
