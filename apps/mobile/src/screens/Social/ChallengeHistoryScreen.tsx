import React, { useCallback } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import SubjectBackdrop from '../../components/SubjectBackdrop';
import ChallengeHeader from '../../components/challenges/ChallengeHeader';
import ChallengeTicket from '../../components/challenges/ChallengeTicket';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import {
  CHALLENGE_TINT,
  GAP,
  GUTTER,
  RADIUS,
  SURFACE,
  SURFACE_BORDER,
  TEXT_MUTED,
} from '../../theme/challenges';
import { useChallengesStore } from '../../store/challengesStore';
import { outcomeOf, resultsUnlocked } from '../../services/challengesApi';

// Everything that has closed, newest first. Kept off the hub behind a "view all"
// because history is something you go looking for, not something that should be
// between you and the challenge somebody is waiting on.

const enter = (index: number) =>
  FadeInDown.springify().damping(18).mass(0.6).delay(Math.min(index, 10) * 35);

export default function ChallengeHistoryScreen({ navigation }: any) {
  const historyMatches = useChallengesStore((s) => s.historyMatches);
  const refreshMatches = useChallengesStore((s) => s.refreshMatches);

  useFocusEffect(
    useCallback(() => {
      refreshMatches();
    }, [refreshMatches])
  );

  const history = historyMatches();
  const wins = history.filter((m) => resultsUnlocked(m) && outcomeOf(m) === 'won').length;
  const losses = history.filter((m) => resultsUnlocked(m) && outcomeOf(m) === 'lost').length;

  return (
    <View style={styles.root}>
      <SubjectBackdrop color={CHALLENGE_TINT} />

      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <ChallengeHeader
            eyebrow="ARCHIVE"
            title="Past challenges"
            subtitle={
              history.length > 0
                ? `${wins} won · ${losses} lost across ${history.length} closed challenge${
                    history.length === 1 ? '' : 's'
                  }`
                : undefined
            }
            onBack={() => navigation.goBack()}
          />

          {history.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>Nothing has closed yet.</Text>
            </View>
          ) : (
            <View style={{ gap: GAP }}>
              {history.map((match, i) => (
                <Animated.View key={match.id} entering={enter(i)}>
                  <ChallengeTicket
                    match={match}
                    onPress={() => navigation.navigate('ChallengeResult', { matchId: match.id })}
                  />
                </Animated.View>
              ))}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.hudjeeBgBase },
  safeArea: { flex: 1 },
  content: { paddingHorizontal: GUTTER, paddingTop: 8, paddingBottom: 48 },

  emptyCard: {
    backgroundColor: SURFACE,
    borderRadius: RADIUS,
    borderWidth: 1,
    borderColor: SURFACE_BORDER,
    padding: 20,
  },
  emptyText: { color: TEXT_MUTED, fontSize: 13, fontFamily: typography.regular, lineHeight: 20 },
});
