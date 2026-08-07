import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Animated from 'react-native-reanimated';
import { Hammer } from 'lucide-react-native';

import Screen from './Screen';
import ScreenHeader from './ScreenHeader';
import { typography } from '../../theme/typography';
import {
  DEFAULT_TINT,
} from '../../theme/subjects';
import {
  enter,
  GAP,
  RADIUS,
  SURFACE,
  SURFACE_BORDER,
  TEXT,
  TEXT_FAINT,
  TEXT_MUTED,
} from '../../theme/ui';

/**
 * The screens that are routed but not yet built.
 *
 * They used to render their own class name on a bare black page with a "Go Back"
 * button, which is fine as a routing stub and indefensible as a thing a student
 * can reach. This gives them the same header, gutter and wash as everywhere
 * else, says plainly that the screen is unfinished, and — where the caller can
 * say — lists what will live here, so the page is worth landing on even now.
 */
export default function PlaceholderScreen({
  title,
  eyebrow,
  blurb,
  planned,
  tint = DEFAULT_TINT,
}: {
  title: string;
  eyebrow?: string;
  /** One sentence on what this screen is for. */
  blurb?: string;
  /** What it will hold, once it holds anything. */
  planned?: string[];
  tint?: string;
}) {
  const navigation = useNavigation<any>();

  return (
    <Screen tint={tint}>
      <ScreenHeader
        eyebrow={eyebrow}
        title={title}
        subtitle={blurb}
        onBack={navigation.canGoBack() ? () => navigation.goBack() : undefined}
      />

      <Animated.View entering={enter(2)} style={styles.card}>
        <View style={styles.badgeRow}>
          <View style={styles.badge}>
            <Hammer color={TEXT_MUTED} size={15} strokeWidth={1.8} />
          </View>
          <Text style={styles.badgeText}>Not built yet</Text>
        </View>

        <Text style={styles.body}>
          This screen has a route and a place in the navigation, but no content
          behind it. Nothing you did got you here by mistake.
        </Text>

        {planned && planned.length > 0 ? (
          <View style={styles.plannedBlock}>
            <Text style={styles.plannedLabel}>PLANNED</Text>
            {planned.map((item) => (
              <View key={item} style={styles.plannedRow}>
                <View style={styles.plannedDot} />
                <Text style={styles.plannedText}>{item}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </Animated.View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: SURFACE,
    borderRadius: RADIUS,
    borderWidth: 1,
    borderColor: SURFACE_BORDER,
    padding: 20,
  },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  badge: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.09)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: TEXT_MUTED,
    fontSize: 10,
    fontFamily: typography.bold,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  body: { color: TEXT_MUTED, fontSize: 13, fontFamily: typography.regular, lineHeight: 21 },

  plannedBlock: { marginTop: 20, gap: GAP - 4 },
  plannedLabel: {
    color: TEXT_FAINT,
    fontSize: 10,
    fontFamily: typography.bold,
    letterSpacing: 1.2,
    marginBottom: 2,
  },
  plannedRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  plannedDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: TEXT_FAINT },
  plannedText: { color: TEXT, fontSize: 13, fontFamily: typography.regular, flex: 1 },
});
