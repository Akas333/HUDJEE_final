import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { ChevronLeft } from 'lucide-react-native';

import PressableScale from '../PressableScale';
import { typography } from '../../theme/typography';
import { enter, GLASS, GLASS_BORDER, TEXT, TEXT_MUTED } from '../../theme/ui';

/**
 * How every screen below a tab hub opens: a back chevron in a hairline disc,
 * then the title block sitting where Home puts its greeting.
 *
 * This started life inside Challenges. It is app-wide now because the screens
 * that lacked it were not merely inconsistent — four of the Settings screens had
 * no header at all, so the only way back out of them was a swipe.
 */
export default function ScreenHeader({
  title,
  subtitle,
  eyebrow,
  onBack,
  action,
  leading,
}: {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  /** Omit on a screen that is the root of its stack — no chevron is drawn. */
  onBack?: () => void;
  /** Right-hand affordance, aligned with the back button. */
  action?: React.ReactNode;
  /** Sits under the title block — a hero card, a summary strip. */
  leading?: React.ReactNode;
}) {
  const hasTopRow = Boolean(onBack || action);

  return (
    <>
      {hasTopRow ? (
        <Animated.View entering={enter(0)} style={styles.topRow}>
          {onBack ? (
            <PressableScale
              scaleTo={0.9}
              style={styles.iconButton}
              onPress={onBack}
              accessibilityLabel="Go back"
            >
              <ChevronLeft color={TEXT_MUTED} size={20} strokeWidth={2} />
            </PressableScale>
          ) : (
            <View />
          )}
          {action}
        </Animated.View>
      ) : null}

      <Animated.View entering={enter(1)} style={styles.titleBlock}>
        {eyebrow ? <Text style={styles.eyebrow}>{eyebrow.toUpperCase()}</Text> : null}
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </Animated.View>

      {leading}
    </>
  );
}

const styles = StyleSheet.create({
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 22,
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: GLASS,
    borderWidth: 1,
    borderColor: GLASS_BORDER,
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleBlock: { marginBottom: 24 },
  eyebrow: {
    color: 'rgba(245,245,247,0.4)',
    fontSize: 10,
    fontFamily: typography.bold,
    letterSpacing: 1.4,
    marginBottom: 8,
  },
  title: { color: TEXT, fontSize: 28, fontFamily: typography.bold, letterSpacing: -0.4 },
  subtitle: {
    color: TEXT_MUTED,
    fontSize: 15,
    fontFamily: typography.regular,
    marginTop: 6,
    lineHeight: 21,
  },
});
