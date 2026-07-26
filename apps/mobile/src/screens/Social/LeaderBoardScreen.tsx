import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Trophy, Globe, Users } from 'lucide-react-native';
import { colors } from '../../theme/colors';
import { MockEngineApi, Friend } from '../../services/api.mock';

export default function LeaderBoardScreen({ navigation }: any) {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const [scope, setScope] = useState<'friends' | 'global'>('friends');
  
  useEffect(() => {
    const fetchLB = async () => {
      setLoading(true);
      // For now, global just shows friends + some dummy global users
      const data = await MockEngineApi.getFriends();
      let lbData = [...data];
      if (scope === 'global') {
        lbData.push({ friend_id: 'g1', name: 'Alakh P.', avatar_url: 'https://i.pravatar.cc/150?u=g1', xp_this_week: 5400 });
        lbData.push({ friend_id: 'g2', name: 'Naman M.', avatar_url: 'https://i.pravatar.cc/150?u=g2', xp_this_week: 4200 });
      }
      // Sort by XP descending
      lbData.sort((a, b) => b.xp_this_week - a.xp_this_week);
      setFriends(lbData);
      setLoading(false);
    };
    fetchLB();
  }, [scope]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ChevronLeft color={colors.text} size={28} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Leaderboard</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.toggleContainer}>
        <View style={styles.toggleGroup}>
          <TouchableOpacity 
            style={[styles.toggleBtn, scope === 'friends' && styles.toggleBtnActive]}
            onPress={() => setScope('friends')}
          >
            <Users color={scope === 'friends' ? '#000' : colors.textSecondary} size={18} style={{ marginRight: 6 }} />
            <Text style={[styles.toggleText, scope === 'friends' && styles.toggleTextActive]}>Friends</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.toggleBtn, scope === 'global' && styles.toggleBtnActive]}
            onPress={() => setScope('global')}
          >
            <Globe color={scope === 'global' ? '#000' : colors.textSecondary} size={18} style={{ marginRight: 6 }} />
            <Text style={[styles.toggleText, scope === 'global' && styles.toggleTextActive]}>Global</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.timeframeHeader}>
        <Trophy color="#FFD700" size={24} />
        <Text style={styles.timeframeTitle}>Weekly Top Rankers</Text>
        <Text style={styles.timeframeSub}>Resets in 2d 14h</Text>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <View style={styles.listContainer}>
          <ScrollView contentContainerStyle={styles.scrollContent}>
            {friends.map((user, index) => (
              <View key={user.friend_id} style={[styles.lbRow, index < 3 && styles.lbRowTop]}>
                <View style={styles.rankCol}>
                  <Text style={[styles.rankText, index === 0 && { color: '#FFD700', fontSize: 20 }, index === 1 && { color: '#C0C0C0', fontSize: 18 }, index === 2 && { color: '#CD7F32', fontSize: 18 }]}>
                    {index + 1}
                  </Text>
                </View>
                <Image source={{ uri: user.avatar_url }} style={styles.avatar} />
                <Text style={styles.nameText}>{user.name}</Text>
                <Text style={styles.xpText}>{user.xp_this_week} XP</Text>
              </View>
            ))}
          </ScrollView>

          {/* Sticky Self Row */}
          <View style={styles.stickySelfRow}>
            <View style={styles.rankCol}>
              <Text style={styles.rankText}>7</Text>
            </View>
            <View style={[styles.avatar, { backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' }]}>
              <Text style={{ color: '#000', fontWeight: 'bold' }}>You</Text>
            </View>
            <Text style={[styles.nameText, { color: colors.primary }]}>You</Text>
            <Text style={styles.xpText}>450 XP</Text>
          </View>
        </View>
      )}

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: { padding: 4, marginLeft: -4 },
  headerTitle: { color: colors.text, fontSize: 18, fontWeight: '700' },
  
  toggleContainer: { paddingHorizontal: 20, paddingVertical: 12 },
  toggleGroup: { flexDirection: 'row', backgroundColor: colors.surface, borderRadius: 10, padding: 4 },
  toggleBtn: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 12, borderRadius: 8 },
  toggleBtnActive: { backgroundColor: colors.primary },
  toggleText: { color: colors.textSecondary, fontSize: 15, fontWeight: '600' },
  toggleTextActive: { color: '#000' },

  timeframeHeader: { alignItems: 'center', paddingVertical: 24 },
  timeframeTitle: { color: colors.text, fontSize: 20, fontWeight: '800', marginTop: 12, marginBottom: 4 },
  timeframeSub: { color: colors.textSecondary, fontSize: 14, fontWeight: '500' },

  listContainer: { flex: 1, backgroundColor: colors.surface, borderTopLeftRadius: 32, borderTopRightRadius: 32, overflow: 'hidden' },
  scrollContent: { padding: 20, paddingBottom: 100 },
  
  lbRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
  lbRowTop: { backgroundColor: '#1A1A1A', marginHorizontal: -20, paddingHorizontal: 20 },
  rankCol: { width: 40, alignItems: 'center', marginRight: 8 },
  rankText: { color: colors.textSecondary, fontSize: 16, fontWeight: '800' },
  avatar: { width: 44, height: 44, borderRadius: 22, marginRight: 16, borderWidth: 1, borderColor: colors.border },
  nameText: { flex: 1, color: colors.text, fontSize: 16, fontWeight: '600' },
  xpText: { color: colors.textSecondary, fontSize: 15, fontWeight: '700' },

  stickySelfRow: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#161618', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderTopWidth: 1, borderTopColor: colors.border, paddingBottom: 40 }
});
