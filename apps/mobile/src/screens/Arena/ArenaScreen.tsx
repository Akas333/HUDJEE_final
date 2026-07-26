import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  Switch
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Zap, Check, Lock, Play } from 'lucide-react-native';
import { colors } from '../../theme/colors';
import { MockEngineApi, ArenaChapter, ArenaRating } from '../../services/api.mock';

export default function ArenaScreen({ navigation }: any) {
  const [chapters, setChapters] = useState<ArenaChapter[]>([]);
  const [ratingData, setRatingData] = useState<ArenaRating | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [timedMode, setTimedMode] = useState(false);

  const headerFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const [rData, cData] = await Promise.all([
        MockEngineApi.getArenaRating(),
        MockEngineApi.getArenaChapters()
      ]);
      setRatingData(rData);
      setChapters(cData);
      setLoading(false);

      Animated.timing(headerFade, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    };

    const unsubscribe = navigation.addListener('focus', fetchData);
    fetchData();
    return unsubscribe;
  }, [navigation]);

  const toggleSelection = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const handleQuickStart = () => {
    const eligibleIds = chapters.filter(c => c.eligible).map(c => c.chapter_id);
    setSelectedIds(new Set(eligibleIds));
  };

  const handleEnterArena = () => {
    if (selectedIds.size === 0) return;
    navigation.navigate('ActiveArenaSession', { 
      chapterIds: Array.from(selectedIds), 
      timedMode 
    });
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        
        <Animated.View style={[styles.ratingHeader, { opacity: headerFade }]}>
          <View style={styles.ratingBox}>
            <Zap color="#E8B84B" size={32} />
            <Text style={styles.ratingNumber}>{ratingData?.rating || '---'}</Text>
            <View style={styles.tierBadge}>
              <Text style={styles.tierText}>{ratingData?.tier_label?.toUpperCase() || 'LOADING'}</Text>
            </View>
          </View>
          <Text style={styles.ratingSubtitle}>Cross-Concept Arena</Text>
        </Animated.View>

        {loading ? (
          <ActivityIndicator color={colors.primary} size="large" style={{ marginTop: 40 }} />
        ) : (
          <View style={styles.content}>
            
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Select Chapters</Text>
              <TouchableOpacity onPress={handleQuickStart}>
                <Text style={styles.quickStartText}>Select All Eligible</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.chapterList}>
              {chapters.map(chapter => {
                const isSelected = selectedIds.has(chapter.chapter_id);
                
                if (chapter.eligible) {
                  return (
                    <TouchableOpacity
                      key={chapter.chapter_id}
                      style={[styles.chapterChip, isSelected && styles.chapterChipSelected]}
                      onPress={() => toggleSelection(chapter.chapter_id)}
                      activeOpacity={0.7}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                        <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                          {isSelected && <Check size={14} color="#000" />}
                        </View>
                        <View>
                          <Text style={[styles.chapterName, isSelected && { color: colors.primary }]}>{chapter.name}</Text>
                          <Text style={styles.chapterSubject}>{chapter.subject}</Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                } else {
                  return (
                    <View key={chapter.chapter_id} style={styles.chapterChipLocked}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                        <View style={styles.lockedIcon}>
                          <Lock size={16} color={colors.textSecondary} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.chapterNameLocked}>{chapter.name}</Text>
                          <Text style={styles.chapterSubject}>{chapter.subject}</Text>
                          <View style={styles.lockedReasonBox}>
                            <Text style={styles.lockedReasonText}>Reach {chapter.eligibility_threshold}% mastery in Practice to unlock ({chapter.mastery_pct}% currently)</Text>
                          </View>
                        </View>
                      </View>
                    </View>
                  );
                }
              })}
            </View>

            <View style={styles.timedModeContainer}>
              <View>
                <Text style={styles.timedModeTitle}>Timed Mode</Text>
                <Text style={styles.timedModeDesc}>60s per question</Text>
              </View>
              <Switch
                value={timedMode}
                onValueChange={setTimedMode}
                trackColor={{ false: colors.surfaceLight, true: colors.primary }}
                thumbColor={colors.text}
              />
            </View>

          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity 
          style={[styles.enterBtn, selectedIds.size === 0 && styles.enterBtnDisabled]}
          disabled={selectedIds.size === 0}
          onPress={handleEnterArena}
          activeOpacity={0.8}
        >
          <Text style={[styles.enterBtnText, selectedIds.size === 0 && { color: colors.textSecondary }]}>
            {selectedIds.size === 0 ? 'Select chapters to enter' : 'Enter Arena'}
          </Text>
          {selectedIds.size > 0 && <Play size={20} color="#000" fill="#000" />}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  
  ratingHeader: { alignItems: 'center', paddingVertical: 40, borderBottomWidth: 1, borderBottomColor: colors.border },
  ratingBox: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  ratingNumber: { color: colors.text, fontSize: 56, fontWeight: '800', letterSpacing: -2 },
  tierBadge: { backgroundColor: '#E8B84B20', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 100, borderWidth: 1, borderColor: '#E8B84B50', marginLeft: 8 },
  tierText: { color: '#E8B84B', fontSize: 12, fontWeight: '800', letterSpacing: 1 },
  ratingSubtitle: { color: colors.textSecondary, fontSize: 15, fontWeight: '500', letterSpacing: 0.5, textTransform: 'uppercase' },

  content: { padding: 16 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, marginTop: 16 },
  sectionTitle: { color: colors.text, fontSize: 18, fontWeight: '700' },
  quickStartText: { color: colors.primary, fontSize: 14, fontWeight: '600' },

  chapterList: { gap: 12, marginBottom: 32 },
  
  chapterChip: { backgroundColor: colors.surface, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: colors.border },
  chapterChipSelected: { borderColor: colors.primary, backgroundColor: '#9B6FFF10' },
  checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: colors.border, justifyContent: 'center', alignItems: 'center' },
  checkboxSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  
  chapterName: { color: colors.text, fontSize: 16, fontWeight: '600', marginBottom: 2 },
  chapterSubject: { color: colors.textSecondary, fontSize: 12, fontWeight: '500', textTransform: 'uppercase', letterSpacing: 0.5 },

  chapterChipLocked: { backgroundColor: colors.surface, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: colors.border, opacity: 0.7 },
  lockedIcon: { width: 24, height: 24, justifyContent: 'center', alignItems: 'center' },
  chapterNameLocked: { color: colors.textSecondary, fontSize: 16, fontWeight: '600', marginBottom: 2 },
  lockedReasonBox: { marginTop: 8, backgroundColor: colors.surfaceLight, padding: 8, borderRadius: 6 },
  lockedReasonText: { color: colors.textSecondary, fontSize: 12, lineHeight: 18 },

  timedModeContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.surface, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: colors.border },
  timedModeTitle: { color: colors.text, fontSize: 16, fontWeight: '600', marginBottom: 2 },
  timedModeDesc: { color: colors.textSecondary, fontSize: 13 },

  footer: { padding: 16, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.background },
  enterBtn: { backgroundColor: colors.primary, paddingVertical: 16, borderRadius: 100, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  enterBtnDisabled: { backgroundColor: colors.surfaceLight },
  enterBtnText: { color: '#000', fontSize: 16, fontWeight: '700' }
});
