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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Bell, Star, ArrowDownRight } from 'lucide-react-native';
import { colors } from '../../theme/colors';

const { width } = Dimensions.get('window');

const SUBJECTS = ['Physics', 'Chemistry', 'Maths'];

// ─── Subject Tab Bar ──────────────────────────────────────────────────────────
function SubjectTabs({
  active,
  onChange,
}: {
  active: string;
  onChange: (s: string) => void;
}) {
  return (
    <View style={tabStyles.container}>
      {SUBJECTS.map((subject) => {
        const isActive = active === subject;

        if (isActive) {
          // Gradient border trick: LinearGradient as outer shell, inner View clips to surface color
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
          <Pressable
            key={subject}
            style={tabStyles.tab}
            onPress={() => onChange(subject)}
          >
            <Text style={tabStyles.label}>{subject}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const tabStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: colors.surface,
    borderRadius: 100,
    padding: 4,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  tab: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 100,
    alignItems: 'center',
  },
  // Gradient border shell — 1.5px padding becomes the visible gradient stroke
  activeGradientBorder: {
    flex: 1,
    borderRadius: 100,
    padding: 1.5,
  },
  // Inner pill sits inside the gradient shell
  activeInner: {
    backgroundColor: colors.surfaceLight,
    borderRadius: 100,
    paddingVertical: 8,
    alignItems: 'center',
  },
  label: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '500',
  },
  activeLabel: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
});

// ─── Hero Banner Card ─────────────────────────────────────────────────────────
function HeroBanner({ subject }: { subject: string }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    fadeAnim.setValue(0);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 350,
      useNativeDriver: true,
    }).start();
  }, [subject]);

  return (
    <Animated.View style={[heroStyles.card, { opacity: fadeAnim }]}>
      {/* Left content */}
      <View style={heroStyles.content}>
        <Text style={heroStyles.categoryLabel}>HUDJEE LEARN</Text>
        <Text style={heroStyles.title}>{subject.toUpperCase()}</Text>
        <Text style={heroStyles.subtitle}>
          Master the concepts of {subject} with interactive lectures
        </Text>

        {/* Coloured tags */}
        <View style={heroStyles.tagsRow}>
          <View style={[heroStyles.tag, { borderColor: colors.tagPurple, backgroundColor: colors.tagPurpleBg }]}>
            <Text style={[heroStyles.tagText, { color: colors.tagPurple }]}>AVG RETENTION 78%</Text>
          </View>
          <View style={[heroStyles.tag, { borderColor: colors.tagRed, backgroundColor: colors.tagRedBg }]}>
            <Text style={[heroStyles.tagText, { color: colors.tagRed }]}>ACTIVE STREAK: 7 DAYS</Text>
          </View>
          <View style={[heroStyles.tag, { borderColor: colors.tagGreen, backgroundColor: colors.tagGreenBg }]}>
            <Text style={[heroStyles.tagText, { color: colors.tagGreen }]}>MASTERY LEVEL : NOVICE</Text>
          </View>
        </View>

        {/* Progress */}
        <View style={heroStyles.progressSection}>
          <View style={heroStyles.progressTrack}>
            <LinearGradient
              colors={[colors.primaryGradientStart, colors.primaryGradientEnd]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[heroStyles.progressFill, { width: '0%' }]}
            />
          </View>
          <Text style={heroStyles.progressLabel}>0% watched</Text>
        </View>

        {/* Stats pills */}
        <View style={heroStyles.statsRow}>
          <View style={heroStyles.statPill}>
            <Text style={heroStyles.statText}>Watch Time: 0 Hrs</Text>
          </View>
          <View style={heroStyles.statPill}>
            <Text style={heroStyles.statText}>0 Lectures</Text>
          </View>
          <View style={heroStyles.statPill}>
            <Text style={heroStyles.statText}>0 Concepts</Text>
          </View>
        </View>
      </View>
    </Animated.View>
  );
}

const heroStyles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    marginHorizontal: 16,
    marginBottom: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  content: {
    padding: 16,
  },
  categoryLabel: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  title: {
    color: colors.text,
    fontSize: 40,
    fontWeight: '800',
    letterSpacing: -1,
    lineHeight: 44,
    marginBottom: 4,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 14,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 16,
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
  },
  tagText: {
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  progressSection: {
    backgroundColor: colors.surfaceLight,
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  progressTrack: {
    width: '100%',
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  progressLabel: {
    color: colors.textSecondary,
    fontSize: 10,
    textAlign: 'right',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statPill: {
    backgroundColor: colors.surfaceLight,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  statText: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: '500',
  },
});

// ─── Chapter Card ─────────────────────────────────────────────────────────────
function ChapterCard({
  title,
  progress,
  rating,
  questions,
  hours,
  onPress,
  delay = 0,
}: {
  title: string;
  progress: number;
  rating: string;
  questions: string;
  hours: string;
  onPress?: () => void;
  delay?: number;
}) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(16)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, delay, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 400, delay, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }, { scale: scaleAnim }], marginBottom: 12 }}>
      <Pressable
        onPressIn={() => Animated.spring(scaleAnim, { toValue: 0.98, useNativeDriver: true, friction: 8 }).start()}
        onPressOut={() => Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, friction: 8 }).start()}
        onPress={onPress}
      >
        <View style={chapterStyles.card}>
          {/* Title row */}
          <View style={chapterStyles.titleRow}>
            <Text style={chapterStyles.title}>{title}</Text>
            <View style={chapterStyles.actionBtn}>
              <ArrowDownRight size={14} color={colors.textSecondary} />
            </View>
          </View>

          {/* Progress */}
          <View style={chapterStyles.progressRow}>
            <Text style={chapterStyles.progressLabel}>{progress}%</Text>
          </View>
          <View style={chapterStyles.progressTrack}>
            <LinearGradient
              colors={[colors.primaryGradientStart, colors.primaryGradientEnd]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[chapterStyles.progressFill, { width: `${progress}%` }]}
            />
          </View>

          {/* Meta */}
          <View style={chapterStyles.metaRow}>
            <View style={chapterStyles.metaItem}>
              <Star size={11} color={colors.textSecondary} />
              <Text style={chapterStyles.metaText}>{rating}</Text>
            </View>
            <Text style={chapterStyles.metaDot}>·</Text>
            <Text style={chapterStyles.metaText}>{questions}</Text>
            <Text style={chapterStyles.metaDot}>·</Text>
            <Text style={chapterStyles.metaText}>{hours}</Text>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const chapterStyles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  actionBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: colors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 5,
  },
  progressLabel: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '500',
  },
  progressTrack: {
    width: '100%',
    height: 5,
    backgroundColor: colors.surfaceElevated,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  metaDot: {
    color: colors.border,
    fontSize: 12,
  },
  metaText: {
    color: colors.textSecondary,
    fontSize: 12,
  },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function LearnScreen({ navigation }: any) {
  const [activeSubject, setActiveSubject] = useState('Physics');

  const headerFade = useRef(new Animated.Value(0)).current;
  const headerSlide = useRef(new Animated.Value(-8)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(headerFade, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(headerSlide, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Header */}
      <Animated.View
        style={[styles.header, { opacity: headerFade, transform: [{ translateY: headerSlide }] }]}
      >
        <Image
          source={require('../../../assets/logo.png')}
          style={styles.logoImage}
          resizeMode="contain"
        />
        <TouchableOpacity style={styles.iconButton} activeOpacity={0.7}>
          <Bell color={colors.textSecondary} size={22} />
        </TouchableOpacity>
      </Animated.View>

      {/* Subject Tabs */}
      <SubjectTabs active={activeSubject} onChange={setActiveSubject} />

      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 32 }}
      >
        {/* Hero Banner */}
        <HeroBanner subject={activeSubject} />

        {/* Chapters Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Chapters</Text>
          <TouchableOpacity activeOpacity={0.7}>
            <Text style={styles.viewAll}>View All</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.chaptersList}>
          <ChapterCard
            title="NLM"
            progress={17}
            rating="4.7"
            questions="10k Ques"
            hours="147 Hours"
            delay={100}
            onPress={() => navigation.navigate('ChapterCardScreen')}
          />
          <ChapterCard
            title="WPE"
            progress={17}
            rating="4.7"
            questions="10k Ques"
            hours="147 Hours"
            delay={200}
            onPress={() => navigation.navigate('ChapterCardScreen')}
          />
        </View>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  viewAll: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  chaptersList: {
    paddingHorizontal: 16,
  },
});
