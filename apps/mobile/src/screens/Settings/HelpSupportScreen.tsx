import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SettingsRow } from '../../components/settings/SettingsRow';
import { colors } from '../../theme/colors';
import { useToastStore } from '../../services/ToastService';
import { HapticService } from '../../services/HapticService';

export default function HelpSupportScreen({ navigation }: any) {
  const showToast = useToastStore((state) => state.showToast);

  const handleAction = (action: string) => {
    HapticService.light();
    showToast(`Opening ${action}...`, 'info');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.section}>
          <SettingsRow 
            title="FAQ"
            onPress={() => handleAction('FAQ')}
          />
          <SettingsRow 
            title="Contact support"
            onPress={() => handleAction('Contact Support')}
          />
          <SettingsRow 
            title="Send feedback"
            onPress={() => handleAction('Feedback Form')}
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
  }
});
