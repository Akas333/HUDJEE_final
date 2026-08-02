import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { HapticService } from '../services/HapticService';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';

export interface ReactionBarProps {
  selectedReaction: string | null;
  opponentReaction: string | null;
  onSelect: (emoji: string) => void;
  disabled?: boolean;
}

const REACTIONS = ['🔥', '👏', '🤝', '💪', '😤'];

const ReactionButton = ({ 
  emoji, 
  isSelected, 
  isOpponentSelection, 
  onPress, 
  disabled 
}: { 
  emoji: string; 
  isSelected: boolean; 
  isOpponentSelection: boolean;
  onPress: () => void; 
  disabled?: boolean;
}) => {
  const scale = useSharedValue(isSelected ? 1.2 : 1);

  React.useEffect(() => {
    scale.value = withSpring(isSelected ? 1.2 : 1, {
      mass: 0.5,
      damping: 12,
      stiffness: 150,
    });
  }, [isSelected, scale]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
    };
  });

  return (
    <View style={styles.reactionWrapper}>
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => {
          if (!disabled) {
            HapticService.light();
            onPress();
          }
        }}
        disabled={disabled}
      >
        <Animated.View
          style={[
            styles.emojiCircle,
            isSelected && styles.selectedCircle,
            animatedStyle,
          ]}
        >
          <Text style={styles.emojiText}>{emoji}</Text>
        </Animated.View>
      </TouchableOpacity>
      {isOpponentSelection && (
        <View style={styles.opponentBadge}>
          <Text style={styles.opponentBadgeText}>Opponent</Text>
        </View>
      )}
    </View>
  );
};

export const ReactionBar: React.FC<ReactionBarProps> = ({
  selectedReaction,
  opponentReaction,
  onSelect,
  disabled = false,
}) => {
  return (
    <View style={[styles.container, disabled && styles.containerDisabled]}>
      {REACTIONS.map((emoji) => (
        <ReactionButton
          key={emoji}
          emoji={emoji}
          isSelected={selectedReaction === emoji}
          isOpponentSelection={opponentReaction === emoji}
          onPress={() => onSelect(emoji)}
          disabled={disabled}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  containerDisabled: {
    opacity: 0.5,
  },
  reactionWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 60,
    height: 70,
  },
  emojiCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surfaceLight || '#1F2937',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  selectedCircle: {
    backgroundColor: colors.surface,
    borderColor: colors.chalkboardGreen,
    shadowColor: colors.chalkboardGreen,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  emojiText: {
    fontSize: 20,
    includeFontPadding: false,
  },
  opponentBadge: {
    position: 'absolute',
    bottom: -4,
    backgroundColor: colors.surfaceLight || '#1F2937',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  opponentBadgeText: {
    fontFamily: typography.hudjee.headingMd.fontFamily,
    fontSize: 8,
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
});
