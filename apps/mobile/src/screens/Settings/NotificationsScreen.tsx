import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Text, TouchableOpacity, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { SettingsToggle } from '../../components/settings/SettingsToggle';
import { useSettingsStore } from '../../store/settingsStore';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { ArrowLeft } from 'lucide-react-native';

export function NotificationsScreen() {
  const navigation = useNavigation<any>();
  const { notifications, toggleNotification } = useSettingsStore();
  const [showPrePrompt, setShowPrePrompt] = useState(true); // Mock first launch state

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
      </View>
      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <SettingsToggle
            title="Streak reminders"
            value={notifications.streak}
            onValueChange={() => toggleNotification('streak')}
          />
          <SettingsToggle
            title="Challenge activity"
            value={notifications.challenge}
            onValueChange={() => toggleNotification('challenge')}
          />
          <SettingsToggle
            title="Daily practice reminder"
            value={notifications.practice}
            onValueChange={() => toggleNotification('practice')}
          />
          <SettingsToggle
            title="Arena rating changes"
            value={notifications.arena}
            onValueChange={() => toggleNotification('arena')}
          />
        </View>
      </ScrollView>

      {showPrePrompt && (
        <Modal transparent animationType="fade" visible={showPrePrompt}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Stay on track</Text>
              <Text style={styles.modalBody}>
                Enable notifications so we can remind you to keep your daily momentum going. We won't spam you.
              </Text>
              <TouchableOpacity 
                style={styles.modalButtonPrimary}
                onPress={() => setShowPrePrompt(false)}
              >
                <Text style={styles.modalButtonPrimaryText}>Turn on notifications</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.modalButtonSecondary}
                onPress={() => setShowPrePrompt(false)}
              >
                <Text style={styles.modalButtonSecondaryText}>Maybe later</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    ...typography.hudjee.headingLg,
    color: colors.text,
  },
  content: {
    flex: 1,
    paddingVertical: 16,
  },
  section: {
    paddingHorizontal: 16,
    gap: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 24,
    width: '100%',
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalTitle: {
    ...typography.hudjee.headingLg,
    color: colors.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  modalBody: {
    ...typography.hudjee.body,
    color: '#9CA3AF',
    textAlign: 'center',
    marginBottom: 24,
  },
  modalButtonPrimary: {
    backgroundColor: '#38BDF8',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  modalButtonPrimaryText: {
    ...typography.hudjee.label,
    color: colors.background,
    fontWeight: 'bold',
  },
  modalButtonSecondary: {
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonSecondaryText: {
    ...typography.hudjee.label,
    color: '#9CA3AF',
  }
});
