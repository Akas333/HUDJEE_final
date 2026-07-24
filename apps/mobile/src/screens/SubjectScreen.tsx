import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { colors } from '../theme/colors';
import Header from '../components/Header';
import HeroCard from '../components/HeroCard';
import SectionHeader from '../components/SectionHeader';
import CourseCard from '../components/CourseCard';
import { LinearGradient } from 'expo-linear-gradient';

export default function SubjectScreen({ navigation }: any) {
  const [activeTab, setActiveTab] = useState('Physics');
  const tabs = ['Physics', 'Chemistry', 'Maths'];

  return (
    <View style={styles.container}>
      <Header />
      
      {/* Top Tabs */}
      <View style={styles.tabsContainer}>
        <View style={styles.segmentedControl}>
          {tabs.map(tab => {
            const isActive = activeTab === tab;
            return (
              <TouchableOpacity 
                key={tab} 
                style={styles.tabWrapper}
                onPress={() => setActiveTab(tab)}
                activeOpacity={0.8}
              >
                {isActive ? (
                  <LinearGradient 
                    colors={['#6366F1', '#FBBF24']} 
                    style={styles.activeTabGradient}
                    start={{x: 0, y: 0}}
                    end={{x: 1, y: 1}}
                  >
                    <View style={styles.activeTabInner}>
                      <Text style={[styles.tabText, styles.activeTabText]}>{tab}</Text>
                    </View>
                  </LinearGradient>
                ) : (
                  <View style={styles.inactiveTab}>
                    <Text style={styles.tabText}>{tab}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        <HeroCard 
          label="HudJee Learn"
          title={activeTab.toUpperCase()}
          subtitle="Master the concepts of Physics with interactive lectures"
          tags={[
            { text: 'AVG RETENTION 78%', color: '#6366F1', bgColor: 'transparent' },
            { text: 'ACTIVE STEREEK: 7 DAYS', color: '#D97757', bgColor: 'transparent' },
            { text: 'MASTRY LEVEL : NOVICE', color: '#4ADE80', bgColor: 'transparent' }
          ]}
          progress={0}
          stats={[
            { label: '', value: 'Watch Time: 0 Hrs' },
            { label: '', value: '0 Lectures' },
            { label: '', value: '0 Concepts' }
          ]}
        />

        <SectionHeader title="Chapters" actionText="View All" actionColor="#6366F1" />
        
        <CourseCard 
          title="NLM" 
          progress={17} 
          rating={4.7}
          lessons="10k Ques"
          hours="147"
          showActionIcon={true}
          onPress={() => navigation.navigate('CourseDetail', { courseId: 'nlm', courseName: 'NLM' })}
        />

        <CourseCard 
          title="WPE" 
          progress={17} 
          rating={4.7}
          lessons="10k Ques"
          hours="147"
          showActionIcon={true}
        />
        
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Bottom Gradient Line (above tab bar) */}
      <LinearGradient 
        colors={['#4F46E5', '#9333EA', '#FBBF24']} 
        start={{x: 0, y: 0}}
        end={{x: 1, y: 0}}
        style={{ height: 2, width: '100%' }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  tabsContainer: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  segmentedControl: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#FFFFFF', // bright white outer border matching design
    borderRadius: 30,
    padding: 2,
    backgroundColor: colors.background,
  },
  tabWrapper: {
    flex: 1,
  },
  activeTabGradient: {
    borderRadius: 28,
    padding: 1,
  },
  activeTabInner: {
    backgroundColor: colors.background,
    borderRadius: 27,
    paddingVertical: 10,
    alignItems: 'center',
  },
  inactiveTab: {
    paddingVertical: 11,
    alignItems: 'center',
  },
  tabText: {
    color: colors.textSecondary,
    fontWeight: '600',
    fontSize: 14,
  },
  activeTabText: {
    color: colors.text,
  }
});
