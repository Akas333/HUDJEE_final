import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';

interface SegmentedControlProps {
  options: string[];
  selectedIndex: number;
  onChange: (index: number) => void;
}

export const SegmentedControl: React.FC<SegmentedControlProps> = ({
  options,
  selectedIndex,
  onChange,
}) => {
  return (
    <View style={styles.container}>
      {options.map((option, index) => {
        const isActive = index === selectedIndex;
        return (
          <TouchableOpacity
            key={index}
            style={[styles.segment, isActive && styles.activeSegment]}
            onPress={() => onChange(index)}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.segmentText,
                isActive ? styles.activeText : styles.inactiveText,
              ]}
            >
              {option}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: colors.hudjeeSurfaceCardElevated || '#1F2937',
    padding: 4,
    borderRadius: 100,
  },
  segment: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 100,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  activeSegment: {
    backgroundColor: colors.hudjeeTextPrimary || '#FFFFFF',
  },
  segmentText: {
    ...typography.hudjee.label,
  },
  activeText: {
    color: colors.hudjeeBgBase || '#000000',
  },
  inactiveText: {
    color: colors.hudjeeTextSecondary || '#9CA3AF',
  },
});
