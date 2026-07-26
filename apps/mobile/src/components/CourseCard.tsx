import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors } from '../theme/colors';
import ProgressBar from './ProgressBar';
import { ArrowDownRight, Star } from 'lucide-react-native';

interface CourseCardProps {
  title: string;
  progress: number;
  rating?: number;
  lessons?: number | string;
  hours?: number | string;
  showActionIcon?: boolean;
  onPress?: () => void;
  style?: any;
}

export default function CourseCard({ title, progress, rating, lessons, hours, showActionIcon, onPress, style }: CourseCardProps) {
  return (
    <TouchableOpacity style={[styles.card, style]} onPress={onPress} activeOpacity={0.7}>
      <Text style={styles.title}>{title}</Text>
      
      <ProgressBar 
        progress={progress} 
        showText={true} 
        textFormat={`${progress}%`}
        textColor={colors.text}
      />
      
      <View style={styles.footer}>
        <View style={styles.metaContainer}>
          {rating && (
            <View style={styles.metaItem}>
              <Star color={colors.accent} size={14} fill={colors.accent} style={{ marginRight: 4 }} />
              <Text style={styles.metaText}>{rating}</Text>
            </View>
          )}
          {lessons && <Text style={styles.metaText}>{lessons} Lessons</Text>}
          {hours && <Text style={styles.metaText}>{hours} Hours</Text>}
        </View>
        
        {showActionIcon && (
          <View style={styles.actionIcon}>
            <ArrowDownRight color={colors.text} size={20} strokeWidth={3} />
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: colors.border,
    borderBottomWidth: 6,
    borderBottomColor: colors.border,
    padding: 24,
    marginBottom: 20,
  },
  title: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 16,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
  },
  metaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '700',
  },
  actionIcon: {
    backgroundColor: colors.surfaceElevated,
    padding: 8,
    borderRadius: 12,
  }
});
