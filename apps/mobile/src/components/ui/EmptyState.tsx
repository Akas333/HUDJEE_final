import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import PressableScale from '../PressableScale';
import { typography } from '../../theme/typography';
import {
  RADIUS,
  SURFACE,
  SURFACE_BORDER,
  SURFACE_STRONG,
  TEXT,
  TEXT_MUTED,
} from '../../theme/ui';

/**
 * What a screen shows when it has nothing to show. Drawn as a card rather than
 * centred text on the page, because a bare sentence floating on the wash reads
 * as a failed load — a card reads as an answer.
 */
export default function EmptyState({
  icon: Icon,
  title,
  body,
  accent = TEXT_MUTED,
  action,
}: {
  icon: any;
  title: string;
  body?: string;
  /** Tints the icon disc. Defaults to muted, which is right for most cases. */
  accent?: string;
  action?: { label: string; onPress: () => void };
}) {
  return (
    <View style={styles.card}>
      <View
        style={[styles.iconDisc, { backgroundColor: `${accent}1F`, borderColor: `${accent}3D` }]}
      >
        <Icon color={accent} size={22} strokeWidth={1.8} />
      </View>

      <Text style={styles.title}>{title}</Text>
      {body ? <Text style={styles.body}>{body}</Text> : null}

      {action ? (
        <PressableScale style={styles.action} scaleTo={0.95} onPress={action.onPress}>
          <Text style={styles.actionText}>{action.label}</Text>
        </PressableScale>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: SURFACE,
    borderRadius: RADIUS,
    borderWidth: 1,
    borderColor: SURFACE_BORDER,
    padding: 24,
    alignItems: 'center',
  },
  iconDisc: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    color: TEXT,
    fontSize: 16,
    fontFamily: typography.semiBold,
    letterSpacing: -0.2,
    textAlign: 'center',
  },
  body: {
    color: TEXT_MUTED,
    fontSize: 13,
    fontFamily: typography.regular,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: 8,
  },
  action: {
    marginTop: 20,
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderRadius: 14,
    backgroundColor: SURFACE_STRONG,
    borderWidth: 1,
    borderColor: SURFACE_BORDER,
  },
  actionText: { color: TEXT, fontSize: 13, fontFamily: typography.semiBold },
});
