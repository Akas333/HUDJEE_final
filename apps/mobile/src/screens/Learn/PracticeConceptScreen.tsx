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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Bell } from 'lucide-react-native';
import { colors } from '../../theme/colors';

const SUBJECTS = ['Physics', 'Chemistry', 'Maths'];

// ─── Subject Tab Bar (Read-only for this screen, or pops back) ─────────────
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

// ─── Concept Card ─────────────────────────────────────────────────────────────
function ConceptCard({ title, progress, delay = 0, onPress }: { title: string, progress: number, delay?: number, onPress: () => void }) {
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
    <Animated.View style={[{ opacity: fadeAnim, transform: [{ translateY: slideAnim }, { scale: scaleAnim }] }, conceptStyles.cardContainer]}>
      <Pressable
        onPressIn={() => Animated.spring(scaleAnim, { toValue: 0.96, useNativeDriver: true, friction: 8 }).start()}
        onPressOut={() => Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, friction: 8 }).start()}
        onPress={onPress}
      >
        <View style={conceptStyles.card}>
          <Text style={conceptStyles.title}>{title}</Text>
          
          <View style={conceptStyles.progressContainer}>
            <Text style={conceptStyles.percentageText}>{progress}/100</Text>
            <View style={conceptStyles.progressTrack}>
              <LinearGradient 
                colors={[colors.primaryGradientStart, colors.primaryGradientEnd]} 
                start={{x: 0, y: 0}} 
                end={{x: 1, y: 0}} 
                style={[conceptStyles.progressFill, { width: `${progress}%` }]} 
              />
            </View>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const conceptStyles = StyleSheet.create({
  cardContainer: {
    width: '48%', // roughly half width minus gap
    marginBottom: 16,
  },
  card: { 
    backgroundColor: '#1A1A1A', 
    borderRadius: 16, 
    padding: 16,
    height: 140,
    justifyContent: 'space-between'
  },
  title: { 
    color: colors.text, 
    fontSize: 20, 
    fontWeight: '700', 
    lineHeight: 24 
  },
  progressContainer: {
    alignItems: 'flex-end',
  },
  percentageText: { 
    color: colors.textSecondary, 
    fontSize: 12, 
    fontWeight: '500',
    marginBottom: 8
  },
  progressTrack: { 
    height: 6, 
    width: '100%',
    backgroundColor: '#333333', 
    borderRadius: 3, 
    overflow: 'hidden' 
  },
  progressFill: { 
    height: '100%', 
    borderRadius: 3 
  },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function PracticeConceptScreen({ route, navigation }: any) {
  const { chapterId, chapterName, activeSubject } = route.params;

  // Mock concepts based on the design
  const concepts = [
    { id: '1', title: 'Motion in 1D', progress: 17 },
    { id: '2', title: 'Motion in 2d&3d', progress: 17 },
    { id: '3', title: 'Projectile Motion', progress: 17 },
    { id: '4', title: 'Relative Motion', progress: 17 },
    { id: '5', title: 'Constraint Motion', progress: 17 },
  ];

  const handleSubjectChange = (subject: string) => {
    // If they change subject, pop back to PracticeScreen to load that subject's chapters
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Image source={require('../../../assets/logo.png')} style={styles.logoImage} resizeMode="contain" />
        <TouchableOpacity style={styles.iconButton} activeOpacity={0.7}>
          <Bell color={colors.textSecondary} size={22} />
        </TouchableOpacity>
      </View>

      {/* Subject Tabs */}
      <SubjectTabs active={activeSubject} onChange={handleSubjectChange} />

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
        <View style={styles.chapterHeader}>
          <Text style={styles.chapterTitle}>{chapterName}</Text>
        </View>

        <View style={styles.gridContainer}>
          {concepts.map((concept, idx) => (
            <ConceptCard
              key={concept.id}
              title={concept.title}
              progress={concept.progress}
              delay={idx * 50}
              onPress={() => console.log('Start practice for concept', concept.id)}
            />
          ))}
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
  chapterHeader: { paddingHorizontal: 16, marginBottom: 20 },
  chapterTitle: { color: colors.text, fontSize: 24, fontWeight: '700' },
  gridContainer: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    justifyContent: 'space-between', 
    paddingHorizontal: 16 
  },
});
