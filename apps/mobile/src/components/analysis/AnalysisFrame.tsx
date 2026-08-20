import React, { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { FileQuestion } from 'lucide-react-native';

import EmptyState from '../ui/EmptyState';
import Screen from '../ui/Screen';
import ScreenHeader from '../ui/ScreenHeader';
import { SessionAnalysis } from '../../services/analysisApi';
import { useAnalysisStore } from '../../store/analysisStore';
import { typography } from '../../theme/typography';
import { TEST_TINT, TEXT_MUTED } from '../../theme/ui';

/**
 * The frame every screen in the Analysis stack sits in.
 *
 * All eight of them want the same three states — loading, failed, and one
 * `SessionAnalysis` to read — and the same header. Written once here, the
 * screens below hold nothing but the thing they are actually about.
 *
 * The session id travels in route params rather than in the store's identity,
 * so a deep link into any single section loads correctly on its own instead of
 * only working when entered through the hub.
 */
export default function AnalysisFrame({
  sessionId,
  title,
  eyebrow = 'Analysis',
  subtitle,
  action,
  scroll = true,
  children,
}: {
  sessionId: string;
  title: string;
  eyebrow?: string;
  subtitle?: string;
  action?: React.ReactNode;
  scroll?: boolean;
  children: (analysis: SessionAnalysis) => React.ReactNode;
}) {
  const navigation = useNavigation<any>();
  const { analysis, loading, error, load } = useAnalysisStore();

  useEffect(() => {
    load(sessionId);
  }, [sessionId]);

  const ready = analysis && analysis.sessionId === sessionId;

  return (
    <Screen tint={TEST_TINT} scroll={scroll}>
      <ScreenHeader
        eyebrow={eyebrow}
        title={title}
        subtitle={subtitle}
        onBack={navigation.canGoBack() ? () => navigation.goBack() : undefined}
        action={action}
      />

      {ready ? (
        children(analysis)
      ) : loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={TEXT_MUTED} />
          <Text style={styles.loadingText}>Working out what happened…</Text>
        </View>
      ) : (
        <EmptyState
          icon={FileQuestion}
          title="No analysis for this session"
          body={error || 'This session has nothing recorded against it yet.'}
          action={
            navigation.canGoBack()
              ? { label: 'Go back', onPress: () => navigation.goBack() }
              : undefined
          }
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  centered: { paddingVertical: 64, alignItems: 'center', gap: 14 },
  loadingText: { color: TEXT_MUTED, fontSize: 13, fontFamily: typography.regular },
});
