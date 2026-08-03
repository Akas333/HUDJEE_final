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
import { EngineApi } from '../../services/api';

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

// ─── Chapter Practice Card ──────────────────────────────────────────────────
function ChapterPracticeCard({ title, progress, onPress }: { title: string, progress: number, onPress: () => void }) {
  return (
    <View style={chapterCardStyles.card}>
      <View style={chapterCardStyles.headerRow}>
        <Text style={chapterCardStyles.title}>{title}</Text>
        <TouchableOpacity style={chapterCardStyles.practiceBtn} onPress={onPress}>
          <Text style={chapterCardStyles.practiceBtnText}>Practice</Text>
        </TouchableOpacity>
      </View>
      
      <Text style={chapterCardStyles.masteryText}>Mastery Score</Text>
      <View style={chapterCardStyles.progressTrack}>
        <LinearGradient 
          colors={['#80EEC1', '#34D399']} 
          start={{x: 0, y: 0}} 
          end={{x: 1, y: 0}} 
          style={[chapterCardStyles.progressFill, { width: `${progress}%` }]} 
        />
      </View>
      
      <View style={chapterCardStyles.statsRow}>
        <Text style={chapterCardStyles.statText}>10k Ques Solved</Text>
        <Text style={chapterCardStyles.statText}>147hrs spent</Text>
      </View>
    </View>
  );
}

const chapterCardStyles = StyleSheet.create({
  card: {
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 16,
    marginBottom: 24,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '700',
    flex: 1,
  },
  practiceBtn: {
    backgroundColor: '#80EEC1',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 12,
    marginLeft: 16,
  },
  practiceBtnText: {
    color: '#000',
    fontWeight: '700',
    fontSize: 15,
  },
  masteryText: {
    color: '#A1A1AA',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
  },
  progressTrack: {
    height: 8,
    backgroundColor: '#333',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 16,
  },
  statText: {
    color: '#71717A',
    fontSize: 12,
    fontWeight: '500',
  },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function PracticeConceptScreen({ route, navigation }: any) {
  const { chapterId, chapterName, activeSubject } = route.params;

  const [concepts, setConcepts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchConcepts = async () => {
      setLoading(true);
      const data = await EngineApi.getConcepts(chapterId);
      setConcepts(data);
      setLoading(false);
    };
    
    fetchConcepts();
  }, [chapterId]);

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
        
        {/* Chapter Overview Practice Card */}
        <ChapterPracticeCard 
          title={chapterName}
          progress={32}
          onPress={() => navigation.navigate('AdaptiveSessionScreen', { 
            chapterId, 
            chapterTitle: chapterName 
          })}
        />

        <View style={styles.chapterHeader}>
          <Text style={styles.chapterTitle}>{chapterName}</Text>
        </View>

        <View style={styles.gridContainer}>
          {loading ? (
            <ActivityIndicator color={colors.primary} style={{ marginTop: 40, alignSelf: 'center', width: '100%' }} />
          ) : concepts.length === 0 ? (
            <Text style={{ color: colors.textSecondary, marginTop: 40, textAlign: 'center', width: '100%' }}>
              No concepts found for this chapter yet.
            </Text>
          ) : (
            concepts.map((concept, idx) => (
              <ConceptCard
                key={concept.id}
                title={concept.title}
                progress={concept.progress}
                delay={idx * 50}
                onPress={() => navigation.navigate('AdaptiveSessionScreen', { 
                  chapterId, 
                  chapterTitle: chapterName, 
                  conceptId: concept.id 
                })}
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
  chapterHeader: { paddingHorizontal: 16, marginBottom: 20 },
  chapterTitle: { color: colors.text, fontSize: 24, fontWeight: '700' },
  gridContainer: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    justifyContent: 'space-between', 
    paddingHorizontal: 16 
  },
});
