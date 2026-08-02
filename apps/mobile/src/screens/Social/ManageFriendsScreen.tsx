import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { UserPlus } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { useChallengesStore } from '../../store/challengesStore';
import { useToastStore } from '../../services/ToastService';
import { HapticService } from '../../services/HapticService';
import { ListRowCard } from '../../components/ListRowCard';
import Skeleton from '../../components/Skeleton';

export default function ManageFriendsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const { 
    friends, 
    friendRequestsIncoming, 
    respondFriendRequest, 
    removeFriend, 
  } = useChallengesStore();
  
  const showToast = useToastStore((state) => state.showToast);

  const fetchFriends = useChallengesStore((state) => (state as any).fetchFriends);
  const fetchFriendRequests = useChallengesStore((state) => (state as any).fetchFriendRequests);

  const isLoading = !friends;

  useEffect(() => {
    if (fetchFriends) fetchFriends();
    if (fetchFriendRequests) fetchFriendRequests();
  }, [fetchFriends, fetchFriendRequests]);

  const handleAddFriend = () => {
    HapticService.light();
    // Open add friend sheet/modal
  };

  const handleAcceptRequest = (id: string, name: string) => {
    HapticService.success();
    respondFriendRequest(id, true);
    showToast(`Added ${name}`, 'success');
  };

  const handleDeclineRequest = (id: string) => {
    HapticService.light();
    respondFriendRequest(id, false);
  };

  const handleRemoveFriend = (id: string, name: string) => {
    HapticService.light();
    removeFriend(id);
    showToast(`${name} removed`, 'success');
  };

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Friends</Text>
        <TouchableOpacity style={styles.addButton} onPress={handleAddFriend}>
          <UserPlus color={colors.hudjeeTextPrimary} size={24} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Pending Requests */}
        {friendRequestsIncoming && friendRequestsIncoming.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Pending Requests</Text>
            <View style={styles.listContainer}>
              {friendRequestsIncoming.map((req) => (
                <ListRowCard avatarInitials="JD"
                  key={req.friend_id}
                  title={req.name}
                  subtitle="Wants to be friends"
                  avatarUrl={req.avatar_url}
                  rightElement={
                    <View style={styles.requestActions}>
                      <TouchableOpacity 
                        style={styles.declineButton} 
                        onPress={() => handleDeclineRequest(req.friend_id)}
                      >
                        <Text style={styles.declineText}>Decline</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={styles.acceptButton} 
                        onPress={() => handleAcceptRequest(req.friend_id, req.name)}
                      >
                        <Text style={styles.acceptText}>Accept</Text>
                      </TouchableOpacity>
                    </View>
                  }
                />
              ))}
            </View>
          </View>
        )}

        {/* Your Friends */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Friends</Text>
          <View style={styles.listContainer}>
            {isLoading ? (
              <>
                <Skeleton height={72} borderRadius={16} />
                <Skeleton height={72} borderRadius={16} />
                <Skeleton height={72} borderRadius={16} />
              </>
            ) : friends && friends.length > 0 ? (
              friends.map((friend) => (
                <ListRowCard avatarInitials="JD"
                  key={friend.friend_id}
                  title={friend.name}
                  subtitle={`Arena ${friend.arena_rating} • ${friend.streak_length} day streak`}
                  avatarUrl={friend.avatar_url}
                  onPress={() => {}}
                />
              ))
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>No friends yet.</Text>
              </View>
            )}
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.hudjeeBgBase,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.hudjeeBorderSubtle,
  },
  headerTitle: {
    ...typography.hudjee.display,
    fontSize: 28, // slightly smaller for top app bar
    color: colors.hudjeeTextPrimary,
  },
  addButton: {
    padding: 8,
    marginRight: -8,
  },
  scrollContent: {
    padding: 24,
    gap: 32,
  },
  section: {
    gap: 16,
  },
  sectionTitle: {
    ...typography.hudjee.headingMd,
    color: colors.hudjeeTextPrimary,
  },
  listContainer: {
    gap: 12,
  },
  requestActions: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  acceptButton: {
    backgroundColor: colors.hudjeeMilestoneStart,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  acceptText: {
    ...typography.hudjee.label,
    color: colors.hudjeeBgBase,
    fontFamily: typography.hudjee.headingMd.fontFamily,
  },
  declineButton: {
    backgroundColor: colors.hudjeeSurfaceCardElevated,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  declineText: {
    ...typography.hudjee.label,
    color: colors.hudjeeTextPrimary,
    fontFamily: typography.hudjee.headingMd.fontFamily,
  },
  emptyState: {
    padding: 24,
    alignItems: 'center',
    backgroundColor: colors.hudjeeSurfaceCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.hudjeeBorderSubtle,
  },
  emptyStateText: {
    ...typography.hudjee.body,
    color: colors.hudjeeTextSecondary,
  },
});
