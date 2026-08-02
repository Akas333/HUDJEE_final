import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SettingsRow } from '../../components/settings/SettingsRow';
import { DestructiveActionSheet } from '../../components/settings/DestructiveActionSheet';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { useToastStore } from '../../services/ToastService';
import { HapticService } from '../../services/HapticService';

type ActionSheetType = 'none' | 'chapter' | 'all' | 'mistake' | 'delete';

export default function DataResetScreen({ navigation }: any) {
  const [activeSheet, setActiveSheet] = useState<ActionSheetType>('none');
  const showToast = useToastStore((state) => state.showToast);

  const handleExportData = () => {
    HapticService.light();
    showToast('Data export started', 'success');
  };

  const handleConfirm = () => {
    HapticService.heavy();
    setActiveSheet('none');
    showToast('Action completed successfully', 'success');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.section}>
          <SettingsRow 
            title="Reset chapter progress"
            onPress={() => {
              HapticService.light();
              setActiveSheet('chapter');
            }}
          />
          <SettingsRow 
            title="Reset all progress"
            onPress={() => {
              HapticService.light();
              setActiveSheet('all');
            }}
          />
          <SettingsRow 
            title="Clear mistake notebook"
            onPress={() => {
              HapticService.light();
              setActiveSheet('mistake');
            }}
          />
          <SettingsRow 
            title="Export my data"
            onPress={handleExportData}
          />
        </View>

        <TouchableOpacity 
          style={styles.deleteLinkContainer}
          onPress={() => {
            HapticService.light();
            setActiveSheet('delete');
          }}
        >
          <Text style={styles.deleteLinkText}>Delete my account</Text>
        </TouchableOpacity>
      </ScrollView>

      <DestructiveActionSheet
        visible={activeSheet === 'chapter'}
        title="Reset chapter progress"
        description="Reset Rotational Mechanics? This clears your mastery..."
        confirmText="Reset Chapter"
        onConfirm={handleConfirm}
        onCancel={() => setActiveSheet('none')}
      />
      
      <DestructiveActionSheet
        visible={activeSheet === 'all'}
        title="Reset all progress"
        description="Reset all progress? This clears mastery scores..."
        confirmText="Reset Progress"
        onConfirm={handleConfirm}
        onCancel={() => setActiveSheet('none')}
      />

      <DestructiveActionSheet
        visible={activeSheet === 'mistake'}
        title="Clear mistake notebook"
        description="Clear your mistake notebook? The questions..."
        confirmText="Clear Notebook"
        onConfirm={handleConfirm}
        onCancel={() => setActiveSheet('none')}
      />

      <DestructiveActionSheet
        visible={activeSheet === 'delete'}
        title="Delete account"
        description="This permanently deletes your account... Type DELETE to confirm."
        confirmText="Delete Account"
        confirmIsTyped={true}
        typedWord="DELETE"
        onConfirm={handleConfirm}
        onCancel={() => setActiveSheet('none')}
      />
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
  deleteLinkContainer: {
    marginTop: 16,
    alignItems: 'center',
    padding: 16,
  },
  deleteLinkText: {
    ...typography.hudjee.body,
    color: colors.error,
  }
});
