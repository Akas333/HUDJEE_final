import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Settings, BookOpen, ChevronRight, Trophy, Flame, Target } from 'lucide-react-native';
import { colors } from '../../theme/colors';

export default function ProfileScreen({ navigation }: any) {
  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView style={styles.container} contentContainerStyle={styles.contentPadding}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Profile</Text>
          <TouchableOpacity style={styles.iconButton}>
            <Settings color={colors.textSecondary} size={22} />
          </TouchableOpacity>
        </View>

        {/* User Card */}
        <View style={styles.userCard}>
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarText}>A</Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>Aspirant_123</Text>
            <Text style={styles.userHandle}>@aspirant_123</Text>
          </View>
        </View>

        {/* Quick Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Flame color="#E8B84B" size={24} />
            <Text style={styles.statValue}>12</Text>
            <Text style={styles.statLabel}>Day Streak</Text>
          </View>
          <View style={styles.statBox}>
            <Target color="#34D399" size={24} />
            <Text style={styles.statValue}>68%</Text>
            <Text style={styles.statLabel}>Accuracy</Text>
          </View>
          <View style={styles.statBox}>
            <Trophy color="#9B6FFF" size={24} />
            <Text style={styles.statValue}>1450</Text>
            <Text style={styles.statLabel}>Arena Rating</Text>
          </View>
        </View>

        {/* Actions */}
        <Text style={styles.sectionTitle}>Tools</Text>
        
        <TouchableOpacity 
          style={styles.actionCard} 
          activeOpacity={0.8}
          onPress={() => navigation.navigate('MistakeNotebookScreen')}
        >
          <View style={[styles.actionIcon, { backgroundColor: '#9B6FFF20' }]}>
            <BookOpen color="#9B6FFF" size={24} />
          </View>
          <View style={styles.actionInfo}>
            <Text style={styles.actionTitle}>Mistake Notebook</Text>
            <Text style={styles.actionSub}>Review and practice deferred concepts</Text>
          </View>
          <ChevronRight color={colors.textSecondary} size={20} />
        </TouchableOpacity>
        
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1 },
  contentPadding: { padding: 16, paddingBottom: 40 },
  
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  headerTitle: { color: colors.text, fontSize: 24, fontWeight: '700' },
  iconButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center' },
  
  userCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, padding: 16, borderRadius: 16, marginBottom: 24, borderWidth: 1, borderColor: colors.border },
  avatarPlaceholder: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.primaryGradientStart, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  avatarText: { color: '#fff', fontSize: 28, fontWeight: '700' },
  userInfo: { flex: 1 },
  userName: { color: colors.text, fontSize: 20, fontWeight: '700', marginBottom: 4 },
  userHandle: { color: colors.textSecondary, fontSize: 14 },
  
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 32 },
  statBox: { flex: 1, backgroundColor: colors.surface, padding: 16, borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  statValue: { color: colors.text, fontSize: 20, fontWeight: '700', marginTop: 8, marginBottom: 4 },
  statLabel: { color: colors.textSecondary, fontSize: 12, fontWeight: '500' },
  
  sectionTitle: { color: colors.text, fontSize: 18, fontWeight: '700', marginBottom: 16 },
  
  actionCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, padding: 16, borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: colors.border },
  actionIcon: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  actionInfo: { flex: 1 },
  actionTitle: { color: colors.text, fontSize: 16, fontWeight: '600', marginBottom: 4 },
  actionSub: { color: colors.textSecondary, fontSize: 13 },
});
