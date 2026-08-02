import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  TouchableWithoutFeedback,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';

interface DestructiveActionSheetProps {
  visible: boolean;
  title: string;
  description: string;
  confirmText: string;
  confirmIsTyped?: boolean;
  typedWord?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DestructiveActionSheet({
  visible,
  title,
  description,
  confirmText,
  confirmIsTyped,
  typedWord,
  onConfirm,
  onCancel,
}: DestructiveActionSheetProps) {
  const [inputValue, setInputValue] = useState('');
  const [showModal, setShowModal] = useState(visible);

  const opacity = useSharedValue(0);
  const translateY = useSharedValue(300);

  useEffect(() => {
    if (visible) {
      setShowModal(true);
      opacity.value = withTiming(1, { duration: 250 });
      translateY.value = withTiming(0, { duration: 250 });
    } else {
      opacity.value = withTiming(0, { duration: 250 });
      translateY.value = withTiming(300, { duration: 250 }, () => {
        runOnJS(setShowModal)(false);
      });
      setInputValue(''); // Reset input
    }
  }, [visible, opacity, translateY]);

  const animatedBackgroundStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const animatedContentStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  if (!showModal) return null;

  const isConfirmDisabled = confirmIsTyped && inputValue !== typedWord;

  return (
    <Modal visible={showModal} transparent animationType="none">
      <View style={styles.overlay}>
        <TouchableWithoutFeedback onPress={onCancel}>
          <Animated.View style={[styles.background, animatedBackgroundStyle]} />
        </TouchableWithoutFeedback>
        <Animated.View style={[styles.content, animatedContentStyle]}>
          <View style={styles.dragIndicator} />
          
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.description}>{description}</Text>

          {confirmIsTyped && typedWord && (
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>
                Type <Text style={styles.boldWord}>{typedWord}</Text> to confirm
              </Text>
              <TextInput
                style={styles.input}
                value={inputValue}
                onChangeText={setInputValue}
                placeholder={typedWord}
                placeholderTextColor={colors.textSecondary}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          )}

          <TouchableOpacity
            style={[styles.confirmButton, isConfirmDisabled && styles.confirmButtonDisabled]}
            disabled={isConfirmDisabled}
            onPress={onConfirm}
          >
            <Text style={styles.confirmButtonText}>{confirmText}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  background: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  content: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dragIndicator: {
    width: 40,
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  title: {
    ...typography.hudjee.headingMd,
    color: colors.text,
    marginBottom: 12,
  },
  description: {
    ...typography.hudjee.body,
    color: colors.textSecondary,
    marginBottom: 24,
  },
  inputContainer: {
    marginBottom: 24,
  },
  inputLabel: {
    ...typography.hudjee.caption,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  boldWord: {
    color: colors.text,
    fontWeight: '700',
  },
  input: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 16,
    ...typography.hudjee.body,
    color: colors.text,
  },
  confirmButton: {
    backgroundColor: colors.amberRisk, // Or error color if we had one, instructions said use warm amber for at-risk
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 12,
    // 3D effect
    borderBottomWidth: 5,
    borderBottomColor: '#D97706', // Darker amber
  },
  confirmButtonDisabled: {
    opacity: 0.5,
  },
  confirmButtonText: {
    ...typography.hudjee.label,
    color: colors.background,
  },
  cancelButton: {
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  cancelButtonText: {
    ...typography.hudjee.label,
    color: colors.text,
  },
});
