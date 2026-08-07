import React, { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { AlertTriangle } from 'lucide-react-native';

import PressableScale from '../PressableScale';
import { typography } from '../../theme/typography';
import { colors } from '../../theme/colors';
import {
  NEGATIVE,
  RADIUS_INNER,
  SURFACE,
  SURFACE_BORDER,
  SURFACE_STRONG,
  TEXT,
  TEXT_FAINT,
  TEXT_MUTED,
  TRACK,
} from '../../theme/ui';

const FAST_OUT_SLOW_IN = Easing.bezier(0.4, 0, 0.2, 1);

/**
 * The confirmation for anything that cannot be undone.
 *
 * It is red, not amber. The old sheet used the streak-at-risk amber for "delete
 * my account", which is the colour this app uses to mean "you can still fix
 * this" — precisely the wrong promise. Amber stays with the streak; destruction
 * gets its own hue and nothing else in Settings is allowed to use it.
 */
export default function DestructiveActionSheet({
  visible,
  title,
  description,
  confirmText,
  confirmIsTyped,
  typedWord,
  onConfirm,
  onCancel,
}: {
  visible: boolean;
  title: string;
  description: string;
  confirmText: string;
  /** Requires the word to be typed out — for the genuinely unrecoverable. */
  confirmIsTyped?: boolean;
  typedWord?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [typed, setTyped] = useState('');
  const [mounted, setMounted] = useState(visible);

  const progress = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      setTyped('');
      setMounted(true);
      progress.value = withTiming(1, { duration: 240, easing: FAST_OUT_SLOW_IN });
    } else {
      progress.value = withTiming(0, { duration: 200, easing: FAST_OUT_SLOW_IN }, (done) => {
        if (done) runOnJS(setMounted)(false);
      });
    }
  }, [visible, progress]);

  const scrimStyle = useAnimatedStyle(() => ({ opacity: progress.value }));
  const sheetStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: (1 - progress.value) * 260 }],
  }));

  if (!mounted) return null;

  const locked = Boolean(confirmIsTyped && typed.trim() !== typedWord);

  return (
    <Modal visible transparent animationType="none" onRequestClose={onCancel}>
      <View style={styles.root}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.scrim, scrimStyle]}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={onCancel}
            accessibilityLabel="Dismiss"
          />
        </Animated.View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.sheetWrap}
          pointerEvents="box-none"
        >
          <Animated.View
            style={[styles.sheet, { paddingBottom: 24 + insets.bottom }, sheetStyle]}
          >
            <View style={styles.grabber} />

            <View style={styles.warnDisc}>
              <AlertTriangle color={NEGATIVE} size={20} strokeWidth={2} />
            </View>

            <Text style={styles.title}>{title}</Text>
            <Text style={styles.description}>{description}</Text>

            {confirmIsTyped && typedWord ? (
              <View style={styles.typeBlock}>
                <Text style={styles.typeLabel}>
                  Type <Text style={styles.typeWord}>{typedWord}</Text> to confirm
                </Text>
                <TextInput
                  style={styles.input}
                  value={typed}
                  onChangeText={setTyped}
                  placeholder={typedWord}
                  placeholderTextColor={TEXT_FAINT}
                  autoCapitalize="characters"
                  autoCorrect={false}
                />
              </View>
            ) : null}

            <PressableScale
              scaleTo={0.97}
              disabled={locked}
              onPress={onConfirm}
              style={[styles.confirm, locked && styles.confirmLocked]}
              accessibilityLabel={confirmText}
            >
              <Text style={styles.confirmText}>{confirmText}</Text>
            </PressableScale>

            <PressableScale scaleTo={0.97} onPress={onCancel} style={styles.cancel}>
              <Text style={styles.cancelText}>Cancel</Text>
            </PressableScale>
          </Animated.View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  scrim: { backgroundColor: colors.hudjeeOverlayScrim },
  sheetWrap: { justifyContent: 'flex-end' },

  sheet: {
    backgroundColor: SURFACE,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: SURFACE_BORDER,
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  grabber: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: SURFACE_STRONG,
    alignSelf: 'center',
    marginBottom: 22,
  },
  warnDisc: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: `${NEGATIVE}1F`,
    borderWidth: 1,
    borderColor: `${NEGATIVE}3D`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: { color: TEXT, fontSize: 20, fontFamily: typography.bold, letterSpacing: -0.3 },
  description: {
    color: TEXT_MUTED,
    fontSize: 14,
    fontFamily: typography.regular,
    lineHeight: 21,
    marginTop: 8,
    marginBottom: 24,
  },

  typeBlock: { marginBottom: 24, gap: 8 },
  typeLabel: { color: TEXT_MUTED, fontSize: 12, fontFamily: typography.regular },
  typeWord: { color: TEXT, fontFamily: typography.bold },
  input: {
    backgroundColor: TRACK,
    borderWidth: 1,
    borderColor: SURFACE_BORDER,
    borderRadius: RADIUS_INNER,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: TEXT,
    fontSize: 15,
    fontFamily: typography.medium,
    letterSpacing: 1,
  },

  confirm: {
    backgroundColor: NEGATIVE,
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: 'center',
  },
  confirmLocked: { opacity: 0.35 },
  confirmText: { color: '#1A0B0B', fontSize: 15, fontFamily: typography.bold },

  cancel: { paddingVertical: 15, alignItems: 'center', marginTop: 4 },
  cancelText: { color: TEXT_MUTED, fontSize: 15, fontFamily: typography.medium },
});
