import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Bell, ArrowLeft } from 'lucide-react-native';
import { colors } from '../../theme/colors';
import HeroHeader from '../../components/ui/HeroHeader';
import ContentCard from '../../components/ui/ContentCard';

export default function ChapterCardScreen({ navigation }: any) {
  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Top Header */}
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginRight: 16 }}>
             <ArrowLeft color={colors.text} size={24} />
          </TouchableOpacity>
          <View style={styles.logoIconPlaceholder} />
          <Text style={styles.logoText}>HudJee</Text>
        </View>
        <TouchableOpacity style={styles.iconButton}>
          <Bell color={colors.textSecondary} size={24} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.contentPadding}>
        
        {/* Chapter Hero Header */}
        <HeroHeader 
          category="HUDJEE LEARN"
          title="NLM"
          subtitle="Master the concepts of Physics with interactive lectures"
          retention="AVG RETENTION 78%"
          streak="ACTIVE STREAK: 7 DAYS"
          mastery="MASTERY LEVEL : NOVICE"
          progress={0}
          watchTime="0 Hrs"
          lecturesCount="0"
          conceptsCount="0"
        />

        {/* Lectures Section */}
        <Text style={styles.sectionTitle}>Lectures</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
          <ContentCard 
            title="Full length lectures" 
            progress={17} 
            rating="4.7"
            lessons="10 Lessons"
            hours="147 Hours"
          />
          <ContentCard 
            title="One Shots" 
            progress={17} 
            rating="4.7"
            lessons="10 Lessons"
            hours="147 Hours"
          />
        </ScrollView>

        {/* Practice Section */}
        <Text style={[styles.sectionTitle, { marginTop: 32 }]}>Practice</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
          <ContentCard 
            title="Practice\nJEE MAINS" 
            progress={17} 
            questions="10 k Ques"
            width={180} // slightly thinner for 2.5 columns visible
          />
          <ContentCard 
            title="Practice\nJEE ADV" 
            progress={17} 
            questions="10 k Ques"
            width={180}
          />
          <ContentCard 
            title="Practice\nEXTRAS+" 
            progress={17} 
            questions="10 k Ques"
            width={180}
          />
        </ScrollView>

        {/* Practice Test Section */}
        <Text style={[styles.sectionTitle, { marginTop: 32 }]}>Practice Test</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
           <ContentCard 
            title="Practice\nTest 1" 
            progress={0} 
            questions="30 Ques"
            width={180}
          />
        </ScrollView>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoIconPlaceholder: {
    width: 24,
    height: 24,
    backgroundColor: colors.text,
    borderRadius: 12,
    marginRight: 8,
  },
  logoText: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '300',
    letterSpacing: -0.5,
  },
  iconButton: {
    padding: 8,
  },
  container: {
    flex: 1,
  },
  contentPadding: {
    padding: 16,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    marginTop: 8,
  },
  horizontalScroll: {
    marginLeft: -16, 
    paddingLeft: 16,
  },
});
