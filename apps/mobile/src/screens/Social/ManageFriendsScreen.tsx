import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Image,
  TouchableOpacity
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Search, Share, CheckCircle2, XCircle } from 'lucide-react-native';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { FriendRequest } from '../../services/api.mock';
import { EngineApi } from '../../services/api';
import AnimatedButton from '../../components/AnimatedButton';
import Skeleton from '../../components/Skeleton';
import { useToastStore } from '../../services/ToastService';
import { HapticService } from '../../services/HapticService';

export default function ManageFriendsScreen({ navigation }: any) {
  const [searchQuery, setSearchQuery] = useState('');
  const [incoming, setIncoming] = useState<FriendRequest[]>([]);
  const [outgoing, setOutgoing] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(true);
  
  const { showToast } = useToastStore();
  
  useEffect(() => {
    const fetchRequests = async () => {
      setLoading(true);
      const data = await EngineApi.getFriendRequests();
      setIncoming(data.incoming);
      setOutgoing(data.outgoing);
      setLoading(false);
    };
    fetchRequests();
  }, []);

  const handleSearch = async () => {
    if (!searchQuery) return;
    await EngineApi.addFriend(searchQuery);
    showToast(`Friend request sent to ${searchQuery}`, 'success');
    HapticService.success();
    setSearchQuery('');
  };

  const handleRespond = async (id: string, accept: boolean) => {
    await EngineApi.respondFriendRequest(id, accept);
    setIncoming(prev => prev.filter(r => r.request_id !== id));
    showToast(accept ? 'Request accepted' : 'Request declined', 'success');
    HapticService.success();
  };

  const handleShare = () => {
    showToast('Invite link copied to clipboard!', 'success');
    HapticService.light();
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ChevronLeft color={colors.text} size={28} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Friends</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        
        {/* Search */}
        <View style={styles.searchBox}>
          <Search color={colors.textSecondary} size={20} style={{ marginLeft: 12 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search username"
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={handleSearch} style={styles.searchAddBtn}>
              <Text style={styles.searchAddText}>Add</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Share Link */}
        <AnimatedButton style={styles.shareCard} onPress={handleShare}>
          <View style={styles.shareIconBox}>
            <Share color={colors.primary} size={24} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.shareTitle}>Invite a friend</Text>
            <Text style={styles.shareDesc}>Send them your personal invite link</Text>
          </View>
        </AnimatedButton>

        {loading ? (
          <View style={{ gap: 12 }}>
             <Text style={styles.sectionTitle}>Incoming Requests</Text>
             <Skeleton width="100%" height={64} borderRadius={12} />
             <Skeleton width="100%" height={64} borderRadius={12} />
          </View>
        ) : (
          <>
            {incoming.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Incoming Requests</Text>
                {incoming.map(req => (
                  <View key={req.request_id} style={styles.requestRow}>
                    <Image source={{ uri: req.user.avatar_url }} style={styles.avatar} />
                    <Text style={styles.requestName}>{req.user.name}</Text>
                    <View style={styles.actions}>
                      <TouchableOpacity onPress={() => handleRespond(req.request_id, false)}>
                        <XCircle color={colors.textSecondary} size={28} />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleRespond(req.request_id, true)} style={{ marginLeft: 12 }}>
                        <CheckCircle2 color={colors.primary} size={28} />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {outgoing.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Sent Requests</Text>
                {outgoing.map(req => (
                  <View key={req.request_id} style={styles.requestRow}>
                    <Image source={{ uri: req.user.avatar_url }} style={styles.avatar} />
                    <Text style={styles.requestName}>{req.user.name}</Text>
                    <Text style={styles.statusText}>Pending</Text>
                  </View>
                ))}
              </View>
            )}
          </>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  backBtn: { padding: 4, marginLeft: -4 },
  headerTitle: { color: colors.text, fontSize: 18, fontWeight: '700' },
  
  content: { padding: 20 },
  
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 12, borderWidth: 1, borderColor: colors.border, marginBottom: 24, paddingRight: 8 },
  searchInput: { flex: 1, color: colors.text, fontSize: 16, padding: 16 },
  searchAddBtn: { backgroundColor: colors.surfaceLight, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  searchAddText: { color: colors.text, fontWeight: '600' },

  shareCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, padding: 16, borderRadius: 16, borderWidth: 1, borderColor: colors.border, marginBottom: 32 },
  shareIconBox: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#9B6FFF20', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  shareTitle: { color: colors.text, fontSize: 16, fontWeight: '600', marginBottom: 4 },
  shareDesc: { color: colors.textSecondary, fontSize: 13 },

  section: { marginBottom: 32 },
  sectionTitle: { color: colors.textSecondary, fontSize: 14, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 },
  
  requestRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: colors.border, marginBottom: 12 },
  avatar: { width: 40, height: 40, borderRadius: 20, marginRight: 12 },
  requestName: { color: colors.text, fontSize: 16, fontWeight: '500', flex: 1 },
  actions: { flexDirection: 'row', alignItems: 'center' },
  statusText: { color: colors.textSecondary, fontSize: 14, fontWeight: '500' }
});
