import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import RichContent from './RichContent';
import { typography } from '../../theme/typography';
import { RADIUS, SURFACE, SURFACE_BORDER, TEXT, TEXT_MUTED } from '../../theme/ui';

/**
 * The worked solution. Its steps are authored as LaTeX with diagrams pasted in,
 * so each one goes through the same renderer the question body uses.
 */
export default function SolutionCard({
  steps,
  misconception,
}: {
  steps: string[];
  misconception?: string | null;
}) {
  const written = steps.filter((s) => s && s.trim().length > 0);
  if (written.length === 0) return null;

  return (
    <Animated.View entering={FadeIn.duration(200)} style={styles.card}>
      <Text style={styles.title}>Solution</Text>

      {misconception ? (
        <View style={styles.misconception}>
          <Text style={styles.misconceptionText}>{misconception}</Text>
        </View>
      ) : null}

      {written.map((step, i) => (
        <View key={i} style={styles.step}>
          {written.length > 1 ? <Text style={styles.stepNumber}>{i + 1}</Text> : null}
          <View style={{ flex: 1 }}>
            <RichContent content={step} textStyle={styles.stepText} />
          </View>
        </View>
      ))}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 12,
    padding: 18,
    borderRadius: RADIUS,
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: SURFACE_BORDER,
  },
  title: { color: TEXT, fontSize: 14, fontFamily: typography.bold },
  step: { flexDirection: 'row', gap: 10 },
  stepNumber: { color: TEXT_MUTED, fontSize: 14, fontFamily: typography.bold, width: 16, lineHeight: 22 },
  stepText: { color: TEXT_MUTED, fontSize: 14, lineHeight: 22 },

  misconception: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(167,139,250,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(167,139,250,0.22)',
  },
  misconceptionText: { color: '#A78BFA', fontSize: 13, fontFamily: typography.semiBold, lineHeight: 20 },
});
