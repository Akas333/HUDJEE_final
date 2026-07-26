import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Flame, Snowflake, Plus, Trophy, ChevronRight, Swords, Clock, CheckCircle2, XCircle, Zap } from 'lucide-react-native';
import { colors } from '../../theme/colors';
import { MockEngineApi, Challenge, Friend } from '../../services/api.mock';
import AnimatedButton from '../../components/AnimatedButton';
import Skeleton from '../../components/Skeleton';
import { HapticService } from '../../services/HapticService';
import { useToastStore } from '../../services/ToastService';

// --- Components ---

const StreakHeader = () => (
  <View style={styles.streakHeader}>
    <View style={styles.streakBadge}>
      <Flame color="#FF6B6B" size={24} fill="#FF6B6B" />
      <Text style={styles.streakCount}>12</Text>
      <Text style={styles.streakLabel}>Day Streak</Text>
    </View>
    <View style={styles.freezeBadge}>
      <Snowflake color="#4ECDC4" size={16} style={{ marginRight: 6 }} />
      <Text style={styles.freezeText}>1 Freeze available</Text>
    </View>
  </View>
);

const FriendAvatar = ({ uri, name, onAddPress }: { uri?: string; name?: string; onAddPress?: () => void }) => {
  if (onAddPress) {
    return (
      <TouchableOpacity style={styles.addFriendAvatar} onPress={onAddPress}>
        <Plus color={colors.textSecondary} size={24} />
      </TouchableOpacity>
    );
  }
  return (
    <View style={styles.friendAvatarContainer}>
      <Image source={{ uri }} style={styles.friendAvatarImage} />
      <Text style={styles.friendAvatarName} numberOfLines={1}>{name?.split(' ')[0]}</Text>
    </View>
  );
};

export default function ChallengesScreen({ navigation }: any) {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [incoming, setIncoming] = useState<Challenge[]>([]);
  const [sent, setSent] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);

  // Send Challenge Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
  const [selectedMode, setSelectedMode] = useState<'auto' | 'manual'>('auto');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const [fData, inData, outData] = await Promise.all([
        MockEngineApi.getFriends(),
        MockEngineApi.getIncomingChallenges(),
        MockEngineApi.getSentChallenges()
      ]);
      setFriends(fData);
      setIncoming(inData);
      setSent(outData);
      setLoading(false);
    };
    
    const unsubscribe = navigation.addListener('focus', fetchData);
    fetchData();
    return unsubscribe;
  }, [navigation]);

  const handleOpenModal = () => {
    HapticService.light();
    setStep(1);
    setSelectedFriend(null);
    setSelectedMode('auto');
    setModalVisible(true);
  };

  const handleSendChallenge = async () => {
    if (!selectedFriend) return;
    setSending(true);
    await MockEngineApi.sendChallenge(selectedFriend.friend_id, selectedMode);
    
    // Refresh sent challenges
    const outData = await MockEngineApi.getSentChallenges();
    setSent(outData);
    
    setSending(false);
    setModalVisible(false);
    HapticService.success();
    // Assuming showToast is available or we just rely on haptics
  };

  const handleSolve = (challengeId: string) => {
    navigation.navigate('SolveChallenge', { challengeId });
  };

  const renderStatusChip = (status: string) => {
    switch (status) {
      case 'waiting':
        return (
          <View style={[styles.statusChip, { backgroundColor: '#333' }]}>
            <Clock color={colors.textSecondary} size={14} style={{ marginRight: 6 }} />
            <Text style={styles.statusText}>Waiting</Text>
          </View>
        );
      case 'solved_first_try':
        return (
          <View style={[styles.statusChip, { backgroundColor: '#FF6B6B20', borderColor: '#FF6B6B50', borderWidth: 1 }]}>
            <Flame color="#FF6B6B" size={14} style={{ marginRight: 6 }} />
            <Text style={[styles.statusText, { color: '#FF6B6B', fontWeight: 'bold' }]}>Solved on first try!</Text>
          </View>
        );
      case 'solved':
        return (
          <View style={[styles.statusChip, { backgroundColor: '#34D39920' }]}>
            <CheckCircle2 color="#34D399" size={14} style={{ marginRight: 6 }} />
            <Text style={[styles.statusText, { color: '#34D399' }]}>Solved</Text>
          </View>
        );
      case 'declined':
        return (
          <View style={[styles.statusChip, { backgroundColor: '#333' }]}>
            <XCircle color={colors.textSecondary} size={14} style={{ marginRight: 6 }} />
            <Text style={styles.statusText}>Declined</Text>
          </View>
        );
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* Header - Streak */}
        <StreakHeader />

        {/* Primary CTA */}
        <AnimatedButton hapticType="medium" style={styles.primaryCta} onPress={handleOpenModal}>
          <Swords color="#000" size={24} />
          <Text style={styles.primaryCtaText}>Challenge a Friend</Text>
        </AnimatedButton>

        {/* Friends Row */}
        <View style={styles.friendsSection}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 16 }}>
            {friends.map(f => (
              <FriendAvatar key={f.friend_id} uri={f.avatar_url} name={f.name} />
            ))}
            <FriendAvatar onAddPress={() => navigation.navigate('ManageFriends')} />
          </ScrollView>
        </View>

        {loading ? (
          <View style={{ paddingHorizontal: 20, gap: 16 }}>
            <Skeleton width="100%" height={120} borderRadius={16} />
            <Skeleton width="100%" height={80} borderRadius={16} />
            <Skeleton width="100%" height={80} borderRadius={16} />
          </View>
        ) : (
          <>
            {/* Incoming Challenges */}
            {incoming.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Incoming</Text>
                  <View style={styles.badge}><Text style={styles.badgeText}>{incoming.length}</Text></View>
                </View>
                {incoming.map(chal => (
                  <View key={chal.challenge_id} style={styles.challengeCard}>
                    <View style={styles.chalHeaderRow}>
                      <Image source={{ uri: chal.from_friend?.avatar_url }} style={styles.smallAvatar} />
                      <Text style={styles.chalFriendName}>{chal.from_friend?.name}</Text>
                      <Text style={styles.chalTime}>2h ago</Text>
                    </View>
                    <View style={styles.chalTagRow}>
                      <View style={styles.tag}><Text style={styles.tagText}>{chal.subject}</Text></View>
                      <View style={styles.tag}><Text style={styles.tagText}>{chal.chapter}</Text></View>
                    </View>
                    <View style={styles.chalActions}>
                      <TouchableOpacity style={styles.solveBtn} onPress={() => handleSolve(chal.challenge_id)}>
                        <Text style={styles.solveBtnText}>Solve</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.declineBtn}>
                        <Text style={styles.declineBtnText}>Decline</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Sent Challenges */}
            {sent.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Sent</Text>
                {sent.map(chal => (
                  <View key={chal.challenge_id} style={styles.sentCard}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      <Image source={{ uri: chal.to_friend?.avatar_url }} style={styles.smallAvatar} />
                      <Text style={styles.chalFriendName}>{chal.to_friend?.name}</Text>
                    </View>
                    {renderStatusChip(chal.status)}
                  </View>
                ))}
              </View>
            )}

            {/* Leaderboard Preview */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Weekly Top Friends</Text>
              </View>
              
              <View style={styles.leaderboardPreview}>
                {friends.sort((a, b) => b.xp_this_week - a.xp_this_week).slice(0,3).map((f, i) => (
                  <View key={f.friend_id} style={styles.lbRow}>
                    <Text style={styles.lbRank}>#{i + 1}</Text>
                    <Image source={{ uri: f.avatar_url }} style={styles.smallAvatar} />
                    <Text style={styles.lbName}>{f.name}</Text>
                    <Text style={styles.lbXp}>{f.xp_this_week} XP</Text>
                  </View>
                ))}
                
                <View style={styles.lbDivider} />
                <View style={styles.lbRow}>
                  <Text style={styles.lbRank}>#7</Text>
                  <View style={[styles.smallAvatar, { backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' }]}>
                    <Text style={{ color: '#000', fontWeight: 'bold' }}>You</Text>
                  </View>
                  <Text style={styles.lbName}>You</Text>
                  <Text style={styles.lbXp}>450 XP</Text>
                </View>

                <TouchableOpacity 
                  style={styles.viewFullLbBtn}
                  onPress={() => navigation.navigate('LeaderBoard')}
                >
                  <Trophy color={colors.textSecondary} size={16} style={{ marginRight: 8 }} />
                  <Text style={styles.viewFullLbText}>View full leaderboard</Text>
                  <ChevronRight color={colors.textSecondary} size={16} style={{ marginLeft: 'auto' }} />
                </TouchableOpacity>
              </View>
            </View>
          </>
        )}
      </ScrollView>

      {/* SEND CHALLENGE MODAL / BOTTOM SHEET */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {step === 1 ? 'Pick a Friend' : 'Pick a Question'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.modalClose}>
                <XCircle color={colors.textSecondary} size={24} />
              </TouchableOpacity>
            </View>

            {step === 1 && (
              <ScrollView style={{ maxHeight: 400 }}>
                {friends.map(f => (
                  <TouchableOpacity 
                    key={f.friend_id} 
                    style={[styles.friendSelectRow, selectedFriend?.friend_id === f.friend_id && styles.friendSelectRowActive]}
                    onPress={() => setSelectedFriend(f)}
                  >
                    <Image source={{ uri: f.avatar_url }} style={styles.smallAvatar} />
                    <Text style={styles.friendSelectName}>{f.name}</Text>
                    {selectedFriend?.friend_id === f.friend_id && <CheckCircle2 color={colors.primary} size={20} style={{ marginLeft: 'auto' }} />}
                  </TouchableOpacity>
                ))}
                
                <TouchableOpacity 
                  style={[styles.modalPrimaryBtn, !selectedFriend && { opacity: 0.5 }]}
                  disabled={!selectedFriend}
                  onPress={() => setStep(2)}
                >
                  <Text style={styles.modalPrimaryBtnText}>Next</Text>
                </TouchableOpacity>
              </ScrollView>
            )}

            {step === 2 && (
              <View>
                <View style={styles.modeToggleGroup}>
                  <TouchableOpacity 
                    style={[styles.modeToggleBtn, selectedMode === 'auto' && styles.modeToggleBtnActive]}
                    onPress={() => setSelectedMode('auto')}
                  >
                    <Text style={[styles.modeToggleText, selectedMode === 'auto' && { color: '#000' }]}>Auto-pick for me</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.modeToggleBtn, selectedMode === 'manual' && styles.modeToggleBtnActive]}
                    onPress={() => setSelectedMode('manual')}
                  >
                    <Text style={[styles.modeToggleText, selectedMode === 'manual' && { color: '#000' }]}>Choose manually</Text>
                  </TouchableOpacity>
                </View>

                {selectedMode === 'auto' && (
                  <View style={styles.autoPickDesc}>
                    <Zap color={colors.primary} size={32} style={{ marginBottom: 12 }} />
                    <Text style={styles.autoPickDescText}>
                      We'll select a question calibrated to both your level and {selectedFriend?.name}'s level.
                    </Text>
                  </View>
                )}
                {selectedMode === 'manual' && (
                  <View style={styles.autoPickDesc}>
                    <Text style={styles.autoPickDescText}>
                      (Manual selection UI goes here)
                    </Text>
                  </View>
                )}

                <TouchableOpacity 
                  style={styles.modalPrimaryBtn}
                  disabled={sending}
                  onPress={handleSendChallenge}
                >
                  {sending ? <ActivityIndicator color="#000" /> : <Text style={styles.modalPrimaryBtnText}>Send Challenge</Text>}
                </TouchableOpacity>
              </View>
            )}

          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  scrollContent: { paddingBottom: 60 },
  
  streakHeader: { alignItems: 'center', marginVertical: 32 },
  streakBadge: { alignItems: 'center', marginBottom: 12 },
  streakCount: { color: colors.text, fontSize: 64, fontWeight: '800', marginVertical: -8, letterSpacing: -2 },
  streakLabel: { color: colors.textSecondary, fontSize: 16, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  freezeBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#4ECDC415', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 100 },
  freezeText: { color: '#4ECDC4', fontSize: 13, fontWeight: '600' },

  primaryCta: { backgroundColor: colors.primary, marginHorizontal: 20, borderRadius: 16, paddingVertical: 20, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 12, shadowColor: colors.primary, shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
  primaryCtaText: { color: '#000', fontSize: 18, fontWeight: '800' },

  friendsSection: { marginVertical: 32 },
  friendAvatarContainer: { alignItems: 'center', width: 64 },
  friendAvatarImage: { width: 64, height: 64, borderRadius: 32, marginBottom: 8, borderWidth: 2, borderColor: colors.border },
  friendAvatarName: { color: colors.textSecondary, fontSize: 13, fontWeight: '500' },
  addFriendAvatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.surface, borderWidth: 2, borderColor: colors.border, borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center' },

  section: { paddingHorizontal: 20, marginBottom: 32 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  sectionTitle: { color: colors.text, fontSize: 18, fontWeight: '700' },
  badge: { backgroundColor: colors.primary, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 100 },
  badgeText: { color: '#000', fontSize: 12, fontWeight: '700' },

  challengeCard: { backgroundColor: colors.surface, padding: 16, borderRadius: 16, borderWidth: 1, borderColor: colors.border, marginBottom: 12 },
  chalHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  smallAvatar: { width: 28, height: 28, borderRadius: 14, marginRight: 10 },
  chalFriendName: { color: colors.text, fontSize: 15, fontWeight: '600', flex: 1 },
  chalTime: { color: colors.textSecondary, fontSize: 13 },
  
  chalTagRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  tag: { backgroundColor: colors.surfaceLight, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  tagText: { color: colors.textSecondary, fontSize: 12, fontWeight: '600' },
  
  chalActions: { flexDirection: 'row', gap: 12 },
  solveBtn: { flex: 2, backgroundColor: colors.primary, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  solveBtnText: { color: '#000', fontSize: 15, fontWeight: '700' },
  declineBtn: { flex: 1, backgroundColor: colors.surfaceLight, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  declineBtnText: { color: colors.text, fontSize: 15, fontWeight: '600' },

  sentCard: { backgroundColor: colors.surface, padding: 16, borderRadius: 16, borderWidth: 1, borderColor: colors.border, marginBottom: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statusChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  statusText: { color: colors.textSecondary, fontSize: 12, fontWeight: '600' },

  leaderboardPreview: { backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 16 },
  lbRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  lbRank: { color: colors.textSecondary, fontSize: 14, fontWeight: '700', width: 30 },
  lbName: { color: colors.text, fontSize: 15, fontWeight: '500', flex: 1 },
  lbXp: { color: colors.primary, fontSize: 14, fontWeight: '700' },
  lbDivider: { height: 1, backgroundColor: colors.border, marginVertical: 8 },
  
  viewFullLbBtn: { flexDirection: 'row', alignItems: 'center', marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: colors.border },
  viewFullLbText: { color: colors.textSecondary, fontSize: 14, fontWeight: '600' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { color: colors.text, fontSize: 20, fontWeight: '700' },
  modalClose: { padding: 4 },
  
  friendSelectRow: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 12, backgroundColor: colors.surfaceLight, marginBottom: 8 },
  friendSelectRowActive: { backgroundColor: '#9B6FFF15', borderWidth: 1, borderColor: colors.primary },
  friendSelectName: { color: colors.text, fontSize: 16, fontWeight: '500' },
  
  modeToggleGroup: { flexDirection: 'row', backgroundColor: colors.surfaceLight, borderRadius: 10, padding: 4, marginBottom: 24 },
  modeToggleBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 8 },
  modeToggleBtnActive: { backgroundColor: colors.primary },
  modeToggleText: { color: colors.textSecondary, fontSize: 14, fontWeight: '600' },
  
  autoPickDesc: { alignItems: 'center', padding: 24, backgroundColor: colors.surfaceLight, borderRadius: 16, marginBottom: 24 },
  autoPickDescText: { color: colors.textSecondary, fontSize: 15, textAlign: 'center', lineHeight: 22 },

  modalPrimaryBtn: { backgroundColor: colors.primary, paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginTop: 16 },
  modalPrimaryBtnText: { color: '#000', fontSize: 16, fontWeight: '700' }
});
