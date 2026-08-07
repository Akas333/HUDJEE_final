import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ChevronRight } from 'lucide-react-native';

import PressableScale from '../PressableScale';
import { typography } from '../../theme/typography';
import { NEGATIVE, RADIUS_INNER, TEXT, TEXT_FAINT, TEXT_MUTED } from '../../theme/ui';

export type RowTone = 'default' | 'danger';

/**
 * One line inside a `SettingsGroup`.
 *
 * The icon sits in a tinted square rather than floating loose in the row: it
 * gives the column a hard left edge, which is what makes a list of eight rows
 * scannable instead of just tall. Icons are per-group, not per-row — a group
 * either has them on every row or on none, otherwise the text edge zigzags.
 */
export default function SettingsRow({
  icon: Icon,
  accent,
  title,
  subtitle,
  value,
  onPress,
  right,
  tone = 'default',
  disabled = false,
}: {
  icon?: any;
  /** Tints the icon square. Defaults to muted — colour is for the exceptions. */
  accent?: string;
  title: string;
  subtitle?: string;
  /** Current setting, shown right-aligned before the chevron. */
  value?: string;
  onPress?: () => void;
  /** Replaces the chevron — a switch, a button. */
  right?: React.ReactNode;
  tone?: RowTone;
  disabled?: boolean;
}) {
  const hue = tone === 'danger' ? NEGATIVE : accent ?? TEXT_MUTED;
  const titleColor = tone === 'danger' ? NEGATIVE : TEXT;

  const body = (
    <View style={[styles.row, disabled && styles.disabled]}>
      {Icon ? (
        <View style={[styles.iconBox, { backgroundColor: `${hue}1F`, borderColor: `${hue}3D` }]}>
          <Icon color={hue} size={17} strokeWidth={1.9} />
        </View>
      ) : null}

      <View style={styles.text}>
        <Text style={[styles.title, { color: titleColor }]} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>

      {value ? (
        <Text style={styles.value} numberOfLines={1}>
          {value}
        </Text>
      ) : null}

      {right ?? (onPress ? <ChevronRight color={TEXT_FAINT} size={17} strokeWidth={2} /> : null)}
    </View>
  );

  if (!onPress || disabled) return body;

  return (
    <PressableScale onPress={onPress} scaleTo={0.985} accessibilityLabel={title}>
      {body}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 60,
    gap: 14,
  },
  disabled: { opacity: 0.45 },
  iconBox: {
    width: 34,
    height: 34,
    borderRadius: RADIUS_INNER - 1,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: { flex: 1, gap: 3 },
  title: { fontSize: 15, fontFamily: typography.medium, letterSpacing: -0.1 },
  subtitle: { color: TEXT_MUTED, fontSize: 12, fontFamily: typography.regular, lineHeight: 17 },
  value: { color: TEXT_MUTED, fontSize: 13, fontFamily: typography.regular, maxWidth: 140 },
});
