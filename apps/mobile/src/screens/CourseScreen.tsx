import React from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { colors } from '../theme/colors';
import Header from '../components/Header';
import HeroCard from '../components/HeroCard';
import SectionHeader from '../components/SectionHeader';
import CourseCard from '../components/CourseCard';
import { ChevronLeft } from 'lucide-react-native';

export default function CourseScreen({ navigation, route }: any) {
  // const { courseName } = route.params;

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <ChevronLeft color={colors.text} size={24} />
        </TouchableOpacity>
        <Header />
      </View>
      
      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        <HeroCard 
          label="HudJee Learn"
          title="NLM"
          subtitle="Master the concepts of Physics with interactive lectures"
          tags={[
            { text: 'Avg Retention 78%', color: '#3B82F6', bgColor: 'rgba(59,130,246,0.1)' },
            { text: 'Active Stereek: 7 Days', color: '#EF4444', bgColor: 'rgba(239,68,68,0.1)' },
            { text: 'Mastry Level : Novice', color: '#10B981', bgColor: 'rgba(16,185,129,0.1)' }
          ]}
          progress={0}
          stats={[
            { label: 'Watch Time', value: '0 Hrs' },
            { label: 'Lectures', value: '0' },
            { label: 'Concepts', value: '0' }
          ]}
        />

        <SectionHeader title="Lectures" />
        <View style={styles.grid}>
          <CourseCard 
            title="Full lenght lectures" 
            progress={17} 
            rating={4.7}
            lessons={10}
            hours={147}
            style={styles.gridCard}
          />
          <CourseCard 
            title="One Shots" 
            progress={17} 
            rating={4.7}
            lessons={10}
            hours={147}
            style={styles.gridCard}
          />
        </View>

        <SectionHeader title="Practice" />
        <View style={styles.grid}>
          <CourseCard 
            title="Practice JEE MAINS" 
            progress={17} 
            lessons="10 k Ques"
            style={styles.gridCard}
          />
          <CourseCard 
            title="Practice JEE ADV" 
            progress={17} 
            lessons="10 k Ques"
            style={styles.gridCard}
          />
        </View>
        <View style={styles.grid}>
          <CourseCard 
            title="Practice EXTRAS+" 
            progress={17} 
            lessons="10 k Ques"
            style={styles.gridCard}
          />
        </View>

        <SectionHeader title="Practice Test" />
        <CourseCard 
          title="Practice Test 1" 
          progress={0} 
          lessons="30 Ques"
        />
        
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    paddingLeft: 20,
    paddingTop: 60,
    paddingBottom: 20,
    justifyContent: 'center',
    position: 'absolute',
    zIndex: 10,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  grid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: -4,
  },
  gridCard: {
    flex: 1,
    marginHorizontal: 4,
  }
});
