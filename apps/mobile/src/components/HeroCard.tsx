import React from 'react';
import { View, Text, StyleSheet, ImageBackground } from 'react-native';
import { colors } from '../theme/colors';
import ProgressBar from './ProgressBar';

interface HeroCardProps {
  label: string;
  title: string;
  subtitle: string;
  tags: { text: string; color: string; bgColor: string }[];
  progress: number;
  stats: { label: string; value: string }[];
  backgroundImageUrl?: string;
}

export default function HeroCard({ label, title, subtitle, tags, progress, stats, backgroundImageUrl }: HeroCardProps) {
  return (
    <View style={styles.cardContainer}>
      <ImageBackground 
        source={{ uri: backgroundImageUrl || 'https://via.placeholder.com/400x200' }} 
        style={styles.background}
        imageStyle={styles.backgroundImage}
      >
        <View style={styles.overlay}>
          <Text style={styles.label}>{label.toUpperCase()}</Text>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>

          <View style={styles.tagsContainer}>
            {tags.map((tag, index) => (
              <View key={index} style={[styles.tag, { backgroundColor: tag.bgColor, borderColor: tag.color, borderWidth: 1 }]}>
                <Text style={[styles.tagText, { color: tag.color }]}>{tag.text.toUpperCase()}</Text>
              </View>
            ))}
          </View>

          <View style={styles.progressSection}>
             <ProgressBar progress={progress} showText={false} />
             <Text style={styles.progressLabel}>{progress}% watched</Text>
          </View>

          <View style={styles.statsContainer}>
            {stats.map((stat, index) => (
              <View key={index} style={styles.statPill}>
                <Text style={styles.statText}>
                  {stat.label ? `${stat.label}: ${stat.value}` : stat.value}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 24,
    backgroundColor: colors.card,
  },
  background: {
    width: '100%',
  },
  backgroundImage: {
    opacity: 0.6,
  },
  overlay: {
    padding: 20,
    backgroundColor: 'rgba(18, 18, 18, 0.4)', // dark overlay to ensure text readability
  },
  label: {
    color: '#3B82F6', // Blue color for HUDJEE LEARN
    fontSize: 10,
    fontWeight: '800',
    marginBottom: 4,
  },
  title: {
    color: colors.text,
    fontSize: 32,
    fontWeight: '800',
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
    marginBottom: 20,
    gap: 8,
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  tagText: {
    fontSize: 9,
    fontWeight: '700',
  },
  progressSection: {
    marginBottom: 16,
  },
  progressLabel: {
    color: '#FFFFFF', // pure white in design
    fontSize: 10,
    alignSelf: 'flex-end',
    marginTop: 4,
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statPill: {
    backgroundColor: '#000000', // solid black in design
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statText: {
    color: '#9CA3AF',
    fontSize: 10,
    fontWeight: '600',
  }
});
