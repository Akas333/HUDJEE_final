import React from 'react';
import { View, StyleSheet, ScrollView, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SettingsRow } from '../../components/settings/SettingsRow';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { useToastStore } from '../../services/ToastService';
import { HapticService } from '../../services/HapticService';

export default function AboutScreen({ navigation }: any) {
  const showToast = useToastStore((state) => state.showToast);

  const handleAction = (action: string) => {
    HapticService.light();
    showToast(`Opening ${action}...`, 'info');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        
        <View style={styles.header}>
          <Text style={styles.title}>HudJee</Text>
          <Text style={styles.version}>Version 2.0.0 (Build 42)</Text>
        </View>

        <View style={styles.section}>
          <SettingsRow 
            title="Terms of Service"
            onPress={() => handleAction('Terms of Service')}
          />
          <SettingsRow 
            title="Privacy Policy"
            onPress={() => handleAction('Privacy Policy')}
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
    paddingTop: 48,
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  title: {
    ...typography.hudjee.headingLg,
    color: colors.hudjeeTextPrimary,
    marginBottom: 8,
  },
  version: {
    ...typography.hudjee.body,
    color: colors.hudjeeTextSecondary,
  },
  section: {
    marginBottom: 32,
  }
});
