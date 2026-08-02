import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { ChevronLeft } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'react-native';

import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { useChallengesStore } from '../../store/challengesStore';
import { MockEngineApi, FriendV2, Chapter, ChallengeScope } from '../../services/api.mock';
import { HapticService } from '../../services/HapticService';
import { useToastStore } from '../../services/ToastService';
import { SegmentedControl } from '../../components/SegmentedControl';
import Skeleton from '../../components/Skeleton';

export const ChallengeComposeScreen = () => {
  const navigation = useNavigation<any>();
  const showToast = useToastStore((s) => s.showToast);
  const { friends, createChallenge } = useChallengesStore();

  const [selectedFriend, setSelectedFriend] = useState<FriendV2 | null>(null);
  const [selectedScope, setSelectedScope] = useState<ChallengeScope>('mixed');
  const [questionCount, setQuestionCount] = useState<number>(10);
  const [windowHours, setWindowHours] = useState<number>(48);
  
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [selectedChapter, setSelectedChapter] = useState<Chapter | null>(null);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadChapters = async () => {
      try {
        const chaps = await MockEngineApi.getAllChaptersFlat();
        setChapters(chaps);
        if (chaps.length > 0) {
          setSelectedChapter(chaps[0]);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    };
    loadChapters();
  }, []);

  const handleBack = () => {
    HapticService.light();
    navigation.goBack();
  };

  const handleSend = async () => {
    if (!selectedFriend) {
      showToast('Please select an opponent', 'error');
      return;
    }
    
    HapticService.light();
    setIsSubmitting(true);
    
    try {
      await createChallenge(
        selectedFriend.friend_id,
        selectedScope,
        selectedScope === 'chapter' && selectedChapter ? selectedChapter.chapter_id : null,
        questionCount,
        windowHours
      );
      
      HapticService.success();
      showToast(`Challenge sent to ${selectedFriend.name}`, 'success');
      navigation.goBack();
    } catch (e) {
      console.error(e);
      showToast('Failed to send challenge', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <ChevronLeft color={colors.hudjeeTextPrimary} size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New Challenge</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Opponent Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Opponent</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.avatarScroll}>
            {isLoading && !friends.length ? (
              <Skeleton width={64} height={64} borderRadius={32} />
            ) : friends.length === 0 ? (
              <Text style={styles.emptyText}>No friends available</Text>
            ) : (
              friends.map((friend) => {
                const isSelected = selectedFriend?.friend_id === friend.friend_id;
                return (
                  <TouchableOpacity
                    key={friend.friend_id}
                    style={styles.avatarContainer}
                    onPress={() => {
                      HapticService.light();
                      setSelectedFriend(friend);
                    }}
                  >
                    <View style={[styles.avatarWrapper, isSelected && styles.avatarWrapperSelected]}>
                      <Image source={{ uri: friend.avatar_url }} style={styles.avatar} />
                    </View>
                    <Text style={styles.avatarName} numberOfLines={1}>{friend.name.split(' ')[0]}</Text>
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>
        </View>

        {/* Scope Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Scope</Text>
          <View style={styles.scopeToggleContainer}>
            <TouchableOpacity
              style={[styles.scopeToggleBtn, selectedScope === 'mixed' && styles.scopeToggleBtnActive]}
              onPress={() => {
                HapticService.light();
                setSelectedScope('mixed');
              }}
            >
              <Text style={[styles.scopeToggleText, selectedScope === 'mixed' && styles.scopeToggleTextActive]}>Mixed</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.scopeToggleBtn, selectedScope === 'chapter' && styles.scopeToggleBtnActive]}
              onPress={() => {
                HapticService.light();
                setSelectedScope('chapter');
              }}
            >
              <Text style={[styles.scopeToggleText, selectedScope === 'chapter' && styles.scopeToggleTextActive]}>Chapter</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Length Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Length</Text>
          <SegmentedControl
            options={['5', '10', '15']}
            selectedIndex={questionCount === 5 ? 0 : questionCount === 10 ? 1 : 2}
            onChange={(index) => {
              HapticService.light();
              setQuestionCount(index === 0 ? 5 : index === 1 ? 10 : 15);
            }}
          />
        </View>

        {/* Window Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Window</Text>
          <SegmentedControl
            options={['24h', '48h', '72h']}
            selectedIndex={windowHours === 24 ? 0 : windowHours === 48 ? 1 : 2}
            onChange={(index) => {
              HapticService.light();
              setWindowHours(index === 0 ? 24 : index === 1 ? 48 : 72);
            }}
          />
        </View>

      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.primaryButtonWrapper}
          onPress={handleSend}
          disabled={isSubmitting || !selectedFriend}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={[colors.hudjeeMilestoneStart, colors.hudjeeMilestoneEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.primaryButton, (!selectedFriend || isSubmitting) && styles.primaryButtonDisabled]}
          >
            {isSubmitting ? (
              <ActivityIndicator color={colors.hudjeeBgBase} />
            ) : (
              <Text style={styles.primaryButtonText}>Send Challenge</Text>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.hudjeeBgBase,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.hudjeeBorderSubtle,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    ...typography.hudjee.headingMd,
    color: colors.hudjeeTextPrimary,
  },
  scrollContent: {
    padding: 24,
    gap: 32,
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    ...typography.hudjee.headingMd,
    color: colors.hudjeeTextPrimary,
  },
  emptyText: {
    ...typography.hudjee.body,
    color: colors.hudjeeTextSecondary,
  },
  avatarScroll: {
    gap: 16,
  },
  avatarContainer: {
    alignItems: 'center',
    gap: 8,
    width: 64,
  },
  avatarWrapper: {
    width: 64,
    height: 64,
    borderRadius: 32,
    padding: 2,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  avatarWrapperSelected: {
    borderColor: colors.hudjeeMilestoneStart,
  },
  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: 30,
  },
  avatarName: {
    ...typography.hudjee.caption,
    color: colors.hudjeeTextSecondary,
    textAlign: 'center',
  },
  scopeToggleContainer: {
    flexDirection: 'row',
    backgroundColor: colors.hudjeeSurfaceCard,
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: colors.hudjeeBorderSubtle,
  },
  scopeToggleBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  scopeToggleBtnActive: {
    backgroundColor: colors.hudjeeSurfaceCardElevated,
  },
  scopeToggleText: {
    ...typography.hudjee.body,
    color: colors.hudjeeTextSecondary,
  },
  scopeToggleTextActive: {
    color: colors.hudjeeTextPrimary,
    fontFamily: typography.hudjee.headingMd.fontFamily,
  },
  footer: {
    padding: 24,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderTopColor: colors.hudjeeBorderSubtle,
    backgroundColor: colors.hudjeeBgBase,
  },
  primaryButtonWrapper: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  primaryButton: {
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonDisabled: {
    opacity: 0.5,
  },
  primaryButtonText: {
    ...typography.hudjee.headingMd,
    color: colors.hudjeeBgBase,
  },
});
