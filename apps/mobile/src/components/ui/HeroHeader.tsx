import React from 'react';
import { View, Text, StyleSheet, ImageBackground } from 'react-native';
import { colors } from '../../theme/colors';
import ProgressBar from './ProgressBar';

interface HeroHeaderProps {
  title: string;
  subtitle: string;
  category: string; // e.g. "HUDJEE LEARN"
  retention?: string;
  streak?: string;
  mastery?: string;
  progress: number;
  watchTime: string;
  lecturesCount: string;
  conceptsCount: string;
  backgroundImage?: any;
}

export default function HeroHeader({
  title,
  subtitle,
  category,
  retention,
  streak,
  mastery,
  progress,
  watchTime,
  lecturesCount,
  conceptsCount,
  backgroundImage = require('../../../assets/splash-icon.png'), // Placeholder
}: HeroHeaderProps) {
  return (
    <View style={styles.container}>
      {/* We use a solid background on the left and fade into the image on the right. 
          For simplicity in React Native without complex masking, we can render the image 
          with a dark overlay, or just a solid card if no image. */}
      <View style={styles.content}>
        <Text style={styles.category}>{category}</Text>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>

        <View style={styles.tagsContainer}>
          {retention && (
            <View style={[styles.tag, { borderColor: '#4F46E5', backgroundColor: 'rgba(79, 70, 229, 0.1)' }]}>
              <Text style={[styles.tagText, { color: '#818CF8' }]}>{retention}</Text>
            </View>
          )}
          {streak && (
            <View style={[styles.tag, { borderColor: '#EF4444', backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
              <Text style={[styles.tagText, { color: '#F87171' }]}>{streak}</Text>
            </View>
          )}
          {mastery && (
            <View style={[styles.tag, { borderColor: '#10B981', backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
              <Text style={[styles.tagText, { color: '#34D399' }]}>{mastery}</Text>
            </View>
          )}
        </View>

        <View style={styles.progressSection}>
          <ProgressBar progress={progress} showLabel />
          <Text style={styles.progressLabel}>watched</Text>
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statPill}><Text style={styles.statText}>Watch Time: {watchTime}</Text></View>
          <View style={styles.statPill}><Text style={styles.statText}>{lecturesCount} Lectures</Text></View>
          <View style={styles.statPill}><Text style={styles.statText}>{conceptsCount} Concepts</Text></View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    marginVertical: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  content: {
    padding: 20,
    zIndex: 2,
  },
  category: {
    color: '#818CF8', // Light blue/purple
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  title: {
    color: colors.text,
    fontSize: 36,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 12,
    marginBottom: 16,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
  },
  tagText: {
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  progressSection: {
    backgroundColor: 'rgba(0,0,0,0.2)',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  progressLabel: {
    color: colors.textSecondary,
    fontSize: 10,
    textAlign: 'right',
    marginTop: 4,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  statPill: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statText: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: '600',
  },
});
