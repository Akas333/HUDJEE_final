import React from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { SettingsRow } from '../../components/settings/SettingsRow';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { User, Bell, Sliders, Shield, Database, HelpCircle, Info, LogOut } from 'lucide-react-native';

export function SettingsScreen() {
  const navigation = useNavigation<any>();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Settings</Text>
      </View>
      <ScrollView style={styles.content}>
        <SettingsRow 
          icon={<User size={24} color={colors.text} />}
          title="Account"
          onPress={() => navigation.navigate('Account')}
        />
        <SettingsRow 
          icon={<Bell size={24} color={colors.text} />}
          title="Notifications"
          onPress={() => navigation.navigate('Notifications')}
        />
        <SettingsRow 
          icon={<Sliders size={24} color={colors.text} />}
          title="Practice Preferences"
          onPress={() => navigation.navigate('PracticePreferences')}
        />
        <SettingsRow 
          icon={<Shield size={24} color={colors.text} />}
          title="Privacy & Friends"
          onPress={() => navigation.navigate('Privacy')}
        />
        <SettingsRow 
          icon={<Database size={24} color={colors.text} />}
          title="Data & Reset"
          onPress={() => navigation.navigate('DataReset')}
        />
        <SettingsRow 
          icon={<HelpCircle size={24} color={colors.text} />}
          title="Help & Support"
          onPress={() => navigation.navigate('HelpSupport')}
        />
        <SettingsRow 
          icon={<Info size={24} color={colors.text} />}
          title="About"
          onPress={() => navigation.navigate('About')}
        />
        <View style={styles.divider} />
        <SettingsRow 
          icon={<LogOut size={24} color={colors.amberRisk || '#FBBF24'} />}
          title="Sign Out"
          onPress={() => {/* handle sign out */}}
          textColor={colors.amberRisk || '#FBBF24'}
          iconColor={colors.amberRisk || '#FBBF24'}
        />
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    ...typography.hudjee.headingLg,
    color: colors.text,
  },
  content: {
    flex: 1,
    paddingVertical: 16,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 16,
    marginHorizontal: 16,
  },
});
