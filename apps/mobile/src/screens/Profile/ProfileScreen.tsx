import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Settings, BookOpen, ChevronRight, Trophy, Flame, Target } from 'lucide-react-native';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { StatTile } from '../../components/StatTile';

export default function ProfileScreen({ navigation }: any) {
  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView style={styles.container} contentContainerStyle={styles.contentPadding}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Profile</Text>
          <TouchableOpacity style={styles.iconButton} onPress={() => navigation.navigate('SettingsStack')}>
            <Settings color={colors.hudjeeTextPrimary} size={24} />
          </TouchableOpacity>
        </View>

        {/* User Card */}
        <View style={styles.userCard}>
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarText}>A</Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>Aspirant_123</Text>
            <Text style={styles.userHandle}>@aspirant_123</Text>
          </View>
        </View>

        {/* Quick Stats */}
        <View style={styles.statsRow}>
          <StatTile 
            label="Day Streak"
            value="12"
            icon={<Flame color="#E8B84B" size={24} />}
          />
          <StatTile 
            label="Accuracy"
            value="68%"
            icon={<Target color="#34D399" size={24} />}
          />
          <StatTile 
            label="Arena Rating"
            value="1450"
            icon={<Trophy color="#9B6FFF" size={24} />}
          />
        </View>

        {/* Actions */}
        <Text style={styles.sectionTitle}>Tools</Text>
        
        <TouchableOpacity 
          style={styles.actionCard} 
          activeOpacity={0.8}
          onPress={() => navigation.navigate('MistakeNotebookScreen')}
        >
          <View style={styles.actionIcon}>
            <BookOpen color="#9B6FFF" size={24} />
          </View>
          <View style={styles.actionInfo}>
            <Text style={styles.actionTitle}>Mistake Notebook</Text>
            <Text style={styles.actionSub}>Review and practice deferred concepts</Text>
          </View>
          <ChevronRight color={colors.hudjeeTextSecondary} size={20} />
        </TouchableOpacity>
        
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { 
    flex: 1, 
    backgroundColor: colors.hudjeeBgBase 
  },
  container: { 
    flex: 1 
  },
  contentPadding: { 
    padding: 16, 
    paddingBottom: 40 
  },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 24 
  },
  headerTitle: { 
    ...typography.hudjee.headingLg,
    color: colors.hudjeeTextPrimary,
  },
  iconButton: { 
    width: 44, 
    height: 44, 
    borderRadius: 22, 
    backgroundColor: colors.hudjeeSurfaceCardElevated, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  
  userCard: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: colors.hudjeeSurfaceCard, 
    padding: 20, 
    borderRadius: 24, 
    marginBottom: 24, 
  },
  avatarContainer: { 
    width: 80, 
    height: 80, 
    borderRadius: 40, 
    backgroundColor: colors.hudjeeSurfaceCardElevated, 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginRight: 16 
  },
  avatarText: { 
    ...typography.hudjee.display,
    color: colors.hudjeeTextPrimary, 
  },
  userInfo: { 
    flex: 1 
  },
  userName: { 
    ...typography.hudjee.headingLg,
    color: colors.hudjeeTextPrimary, 
    marginBottom: 4 
  },
  userHandle: { 
    ...typography.hudjee.caption,
    color: colors.hudjeeTextSecondary, 
  },
  
  statsRow: { 
    flexDirection: 'row', 
    flexWrap: 'wrap',
    gap: 12, 
    marginBottom: 32,
    justifyContent: 'space-between',
  },
  
  sectionTitle: { 
    ...typography.hudjee.headingMd,
    color: colors.hudjeeTextPrimary,
    marginBottom: 16 
  },
  
  actionCard: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: colors.hudjeeSurfaceCard, 
    padding: 16, 
    borderRadius: 20, 
    marginBottom: 12, 
  },
  actionIcon: { 
    width: 48, 
    height: 48, 
    borderRadius: 24, 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginRight: 16,
    backgroundColor: '#9B6FFF20'
  },
  actionInfo: { 
    flex: 1 
  },
  actionTitle: { 
    ...typography.hudjee.headingMd,
    color: colors.hudjeeTextPrimary,
    fontSize: 16,
    marginBottom: 2 
  },
  actionSub: { 
    ...typography.hudjee.caption,
    color: colors.hudjeeTextSecondary,
  },
});
