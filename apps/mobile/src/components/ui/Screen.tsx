import React from 'react';
import { ScrollView, StyleSheet, View, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import SubjectBackdrop from '../SubjectBackdrop';
import { colors } from '../../theme/colors';
import { GUTTER, PROFILE_TINT } from '../../theme/ui';

/**
 * The frame every screen in the app sits in: the near-black base, a tinted wash
 * over it, and a 24pt gutter. Screens used to re-type this four-deep nesting
 * each time, and the ones that skipped it — Settings, Profile — ended up flat
 * black while everything around them had a wash, which is exactly how a screen
 * ends up looking like it belongs to a different app.
 *
 * Pass `scroll={false}` when the screen owns its own scroller (a FlatList, a
 * fixed-footer layout); the backdrop and safe area still apply.
 */
export default function Screen({
  children,
  tint = PROFILE_TINT,
  scroll = true,
  contentStyle,
  footer,
}: {
  children: React.ReactNode;
  /** The colour of the backdrop wash. One per area of the app — see theme/ui. */
  tint?: string;
  scroll?: boolean;
  contentStyle?: ViewStyle;
  /** Pinned below the scroller — a primary action that must not scroll away. */
  footer?: React.ReactNode;
}) {
  return (
    <View style={styles.root}>
      <SubjectBackdrop color={tint} />

      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {scroll ? (
          <ScrollView
            style={styles.flex}
            contentContainerStyle={[styles.content, contentStyle]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {children}
          </ScrollView>
        ) : (
          <View style={styles.flex}>{children}</View>
        )}

        {footer}
      </SafeAreaView>
    </View>
  );
}

/** The gutter/padding a screen's own scroller should use to match `Screen`. */
export const screenContent = {
  paddingHorizontal: GUTTER,
  paddingTop: 8,
  paddingBottom: 48,
} as const;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.hudjeeBgBase },
  safeArea: { flex: 1 },
  flex: { flex: 1 },
  content: screenContent,
});
