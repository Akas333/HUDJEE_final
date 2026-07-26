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
              <View key={index} style={[styles.tag, { backgroundColor: tag.bgColor, borderColor: tag.color }]}>
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
    borderRadius: 24,
    borderWidth: 2,
    borderColor: colors.border,
    borderBottomWidth: 6,
    borderBottomColor: colors.border,
    overflow: 'hidden',
    marginBottom: 32,
    backgroundColor: colors.surface,
  },
  background: {
    width: '100%',
  },
  backgroundImage: {
    opacity: 0.2,
  },
  overlay: {
    padding: 24,
    backgroundColor: 'transparent',
  },
  label: {
    color: colors.primary, // Cyan color
    fontSize: 14,
    fontWeight: '900',
    marginBottom: 8,
    letterSpacing: 1,
  },
  title: {
    color: colors.text,
    fontSize: 36,
    fontWeight: '900', // Black
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 20,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 24,
    gap: 8,
  },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 2,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '800',
  },
  progressSection: {
    marginBottom: 24,
  },
  progressLabel: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
    alignSelf: 'flex-end',
    marginTop: 8,
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statPill: {
    backgroundColor: colors.background,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
  },
  statText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '800',
  }
});
