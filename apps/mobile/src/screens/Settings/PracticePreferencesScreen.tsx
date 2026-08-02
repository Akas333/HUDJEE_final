import React from 'react';
import { View, StyleSheet, ScrollView, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { SettingsToggle } from '../../components/settings/SettingsToggle';
import { useSettingsStore } from '../../store/settingsStore';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { ArrowLeft } from 'lucide-react-native';

export function PracticePreferencesScreen() {
  const navigation = useNavigation<any>();
  const { practicePrefs, togglePracticePref, updatePracticePref } = useSettingsStore();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Practice Preferences</Text>
      </View>
      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <SettingsToggle
            title="Sound effects"
            value={practicePrefs.sound}
            onValueChange={() => togglePracticePref('sound')}
          />
          <SettingsToggle
            title="Haptics"
            value={practicePrefs.haptics}
            onValueChange={() => togglePracticePref('haptics')}
          />
          <SettingsToggle
            title="Reduce motion"
            value={practicePrefs.reduceMotion}
            onValueChange={() => togglePracticePref('reduceMotion')}
          />
          
          <View style={styles.customRow}>
            <Text style={styles.customRowLabel}>Default session length (mins)</Text>
            <View style={styles.sessionOptions}>
              {[10, 20, 30].map(length => (
                <TouchableOpacity 
                  key={length}
                  style={[
                    styles.sessionOption,
                    practicePrefs.defaultSessionLength === length && styles.sessionOptionSelected
                  ]}
                  onPress={() => updatePracticePref('defaultSessionLength', length)}
                >
                  <Text style={[
                    styles.sessionOptionText,
                    practicePrefs.defaultSessionLength === length && styles.sessionOptionTextSelected
                  ]}>
                    {length}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </ScrollView>
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
  customRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  customRowLabel: {
    ...typography.hudjee.body,
    color: colors.text,
  },
  sessionOptions: {
    flexDirection: 'row',
    gap: 8,
  },
  sessionOption: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  sessionOptionSelected: {
    borderColor: '#38BDF8',
    backgroundColor: '#38BDF820',
  },
  sessionOptionText: {
    ...typography.hudjee.label,
    color: '#9CA3AF',
  },
  sessionOptionTextSelected: {
    color: '#38BDF8',
    fontWeight: 'bold',
  },
});
