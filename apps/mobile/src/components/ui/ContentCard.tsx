import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ArrowDownRight, Star } from 'lucide-react-native';
import { colors } from '../../theme/colors';
import ProgressBar from './ProgressBar';

interface ContentCardProps {
  title: string;
  progress?: number;
  rating?: string;
  lessons?: string;
  hours?: string;
  questions?: string;
  showActionIcon?: boolean;
  onPress?: () => void;
  width?: number; // Optional exact width for horizontal scrolling
}

export default function ContentCard({
  title,
  progress,
  rating,
  lessons,
  hours,
  questions,
  showActionIcon,
  onPress,
  width = 240, // Default width for horizontal cards
}: ContentCardProps) {
  return (
    <TouchableOpacity 
      style={[styles.container, { width }]} 
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text style={styles.title}>{title}</Text>
      
      {progress !== undefined && (
        <View style={styles.progressContainer}>
          <Text style={styles.progressLabel}>{progress}%</Text>
          <ProgressBar progress={progress} height={6} />
        </View>
      )}

      <View style={styles.footer}>
        <View style={styles.metaContainer}>
          {rating && (
            <View style={styles.metaItem}>
              <Star size={10} color={colors.textSecondary} style={{ marginRight: 2 }} />
              <Text style={styles.metaText}>{rating}</Text>
            </View>
          )}
          {lessons && <Text style={styles.metaText}>{lessons}</Text>}
          {hours && <Text style={styles.metaText}>{hours}</Text>}
          {questions && <Text style={styles.metaText}>{questions}</Text>}
        </View>

        {showActionIcon && (
          <View style={styles.actionIcon}>
            <ArrowDownRight size={14} color={colors.text} />
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    marginRight: 16,
    height: 140,
    justifyContent: 'space-between',
  },
  title: {
    color: colors.text,
    fontSize: 18,
    fontWeight: 'bold',
  },
  progressContainer: {
    marginTop: 16,
  },
  progressLabel: {
    color: colors.textSecondary,
    fontSize: 10,
    textAlign: 'right',
    marginBottom: 4,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 16,
  },
  metaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  actionIcon: {
    backgroundColor: colors.surfaceLight,
    padding: 6,
    borderRadius: 20,
  },
});
