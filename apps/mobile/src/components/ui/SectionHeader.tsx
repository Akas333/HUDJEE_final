import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { typography } from '../../theme/typography';
import { TEXT, TEXT_FAINT } from '../../theme/ui';

/**
 * The divider between stacks of cards: a title on the left, an optional count or
 * hint on the right, both sitting on the baseline so the small text does not
 * float. Arena and Home already draw it this way; this is that, extracted.
 */
export default function SectionHeader({
  title,
  meta,
  style,
}: {
  title: string;
  meta?: string;
  style?: any;
}) {
  return (
    <View style={[styles.row, style]}>
      <Text style={styles.title}>{title}</Text>
      {meta ? <Text style={styles.meta}>{meta}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 16,
  },
  title: { color: TEXT, fontSize: 17, fontFamily: typography.semiBold, letterSpacing: -0.2 },
  meta: { color: TEXT_FAINT, fontSize: 12, fontFamily: typography.regular },
});
