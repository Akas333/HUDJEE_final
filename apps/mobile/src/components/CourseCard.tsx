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
    <TouchableOpacity style={[styles.card, style]} onPress={onPress} activeOpacity={0.8}>
      <Text style={styles.title}>{title}</Text>
      
      <ProgressBar 
        progress={progress} 
        showText={true} 
        gradientColors={['#7C3AED', '#8B5CF6']} 
        textFormat={`${progress}%`}
        textColor="#FFFFFF"
      />
      
      <View style={styles.footer}>
        <View style={styles.metaContainer}>
          {rating && (
            <View style={styles.metaItem}>
              <Star color={colors.textSecondary} size={10} style={{ marginRight: 2 }} />
              <Text style={styles.metaText}>{rating}</Text>
            </View>
          )}
          {lessons && <Text style={styles.metaText}>{lessons} Lessons</Text>}
          {hours && <Text style={styles.metaText}>{hours} Hours</Text>}
        </View>
        
        {showActionIcon && (
          <View style={styles.actionIcon}>
            <ArrowDownRight color={colors.text} size={14} />
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  title: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  metaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    color: colors.textSecondary,
    fontSize: 10,
  },
  actionIcon: {
    backgroundColor: colors.cardElevated,
    padding: 6,
    borderRadius: 8,
  }
});
