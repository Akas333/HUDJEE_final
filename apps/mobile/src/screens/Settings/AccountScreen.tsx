import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { SettingsInput } from '../../components/settings/SettingsInput';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { ArrowLeft } from 'lucide-react-native';

export function AccountScreen() {
  const navigation = useNavigation<any>();
  const [name, setName] = useState('John Doe');
  const [contact, setContact] = useState('john.doe@example.com');
  const [targetYear, setTargetYear] = useState('2027');

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Account</Text>
      </View>
      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <SettingsInput 
            label="Name"
            value={name}
            onChangeText={setName}
            placeholder="Enter your name"
          />
          <SettingsInput 
            label="Contact (Email/Phone)"
            value={contact}
            onChangeText={setContact}
            placeholder="Enter email or phone"
          />
          <SettingsInput 
            label="Target Exam Year"
            value={targetYear}
            onChangeText={setTargetYear}
            placeholder="e.g. 2027"
          />
        </View>
        <View style={styles.linkedMethodContainer}>
          <Text style={styles.linkedMethodText}>Linked sign-in method: Google</Text>
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
  linkedMethodContainer: {
    marginTop: 32,
    paddingHorizontal: 16,
  },
  linkedMethodText: {
    ...typography.hudjee.body,
    color: '#9CA3AF',
  }
});
