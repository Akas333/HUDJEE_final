import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SettingsRow } from '../../components/settings/SettingsRow';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { useToastStore } from '../../services/ToastService';
import { HapticService } from '../../services/HapticService';

const MOCK_BLOCKED_USERS = [
  { id: '1', name: 'ToxicUser99' },
  { id: '2', name: 'SpamBot2024' },
];

export default function PrivacyFriendsScreen({ navigation }: any) {
  const [blockedUsers, setBlockedUsers] = useState(MOCK_BLOCKED_USERS);
  const showToast = useToastStore((state) => state.showToast);

  const handleUnblock = (id: string, name: string) => {
    HapticService.light();
    setBlockedUsers(blockedUsers.filter(u => u.id !== id));
    showToast(`Unblocked ${name}`, 'success');
  };

  const handleResetInviteCode = () => {
    HapticService.heavy();
    showToast('Invite code reset successfully', 'success');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Privacy</Text>
          <SettingsRow 
            title="Who can send request"
            subtitle="Anyone with your code"
            rightElement={<View />} // Empty right element for read-only
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Blocked Users</Text>
          {blockedUsers.length === 0 ? (
            <Text style={styles.emptyText}>No blocked users.</Text>
          ) : (
            blockedUsers.map(user => (
              <SettingsRow
                key={user.id}
                title={user.name}
                rightElement={
                  <TouchableOpacity 
                    style={styles.unblockButton}
                    onPress={() => handleUnblock(user.id, user.name)}
                  >
                    <Text style={styles.unblockText}>Unblock</Text>
                  </TouchableOpacity>
                }
              />
            ))
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Invite Code</Text>
          <SettingsRow 
            title="Reset invite code"
            onPress={handleResetInviteCode}
          />
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
  content: {
    padding: 16,
    paddingTop: 24,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    ...typography.hudjee.headingMd,
    color: colors.hudjeeTextPrimary,
    marginBottom: 16,
    marginLeft: 4,
  },
  emptyText: {
    ...typography.hudjee.body,
    color: colors.hudjeeTextSecondary,
    marginLeft: 4,
  },
  unblockButton: {
    backgroundColor: colors.hudjeeSurfaceCardElevated,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.hudjeeBorderSubtle,
  },
  unblockText: {
    ...typography.hudjee.label,
    color: colors.hudjeeTextPrimary,
  }
});
