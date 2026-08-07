import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Clock, Hourglass, Play, Target, X } from 'lucide-react-native';

import PressableScale from '../../components/PressableScale';
import SubjectBackdrop from '../../components/SubjectBackdrop';
import Avatar from '../../components/challenges/Avatar';
import ChallengeHeader from '../../components/challenges/ChallengeHeader';
import TierBadge from '../../components/challenges/TierBadge';
import { useToastStore } from '../../services/ToastService';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { SUBJECT_COLORS } from '../../theme/subjects';
import {
  CHALLENGE_TINT,
  GAP,
  GUTTER,
  RADIUS,
  SECTION_GAP,
  SURFACE,
  SURFACE_BORDER,
  TEXT,
  TEXT_FAINT,
  TEXT_MUTED,
  formatTimeLeft,
} from '../../theme/challenges';
import { useChallengesStore } from '../../store/challengesStore';
import { displayName, resultsUnlocked, stateOf } from '../../services/challengesApi';

// The challenge itself, before and between attempts. Which of the three shapes it
// takes — an invitation to answer, a receipt for one you sent, or a holding screen
// while the other side catches up — is decided by whose turn it is, not by which
// screen you arrived from.

const enter = (index: number) =>
  FadeInDown.springify().damping(18).mass(0.6).delay(Math.min(index, 8) * 45);

function Fact({ icon, label, value }: { icon?: React.ReactNode; label: string; value: string }) {
  return (
    <View style={styles.fact}>
      {icon ? <View style={styles.factIcon}>{icon}</View> : null}
      <Text style={styles.factValue}>{value}</Text>
      <Text style={styles.factLabel}>{label}</Text>
    </View>
  );
}

export default function ChallengeDetailScreen({ navigation, route }: any) {
  const matchId: string = route.params?.matchId;

  const matchById = useChallengesStore((s) => s.matchById);
  const refreshMatch = useChallengesStore((s) => s.refreshMatch);
  const respond = useChallengesStore((s) => s.respond);
  const headToHead = useChallengesStore((s) => s.headToHead);
  const loadHeadToHead = useChallengesStore((s) => s.loadHeadToHead);

  const match = matchById(matchId);
  const [busy, setBusy] = useState<'accept' | 'later' | 'decline' | null>(null);

  useFocusEffect(
    useCallback(() => {
      refreshMatch(matchId);
    }, [matchId, refreshMatch])
  );

  useEffect(() => {
    if (match?.opponentId) loadHeadToHead(match.opponentId);
  }, [match?.opponentId]);

  // A finished challenge belongs on the results screen, not here. Replacing keeps
  // the back gesture pointing at the list rather than at this screen.
  useEffect(() => {
    if (match && resultsUnlocked(match)) {
      navigation.replace('ChallengeResult', { matchId });
    }
  }, [match && resultsUnlocked(match)]);

  if (!match) {
    return (
      <View style={styles.root}>
        <SubjectBackdrop color={CHALLENGE_TINT} />
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <View style={styles.centered}>
            <ActivityIndicator color={TEXT_MUTED} />
          </View>
        </SafeAreaView>
      </View>
    );
  }

  const state = stateOf(match);
  const opponent = displayName(match.opponent?.username);
  const record = headToHead[match.opponentId];
  const count = match.questionIds.length;
  const iFinished = !!match.myAttempt?.completedAt;

  const startAttempt = () => navigation.replace('SolveChallenge', { matchId });

  const onAccept = async (startNow: boolean) => {
    setBusy(startNow ? 'accept' : 'later');
    try {
      // Only the invited side has anything to accept; the sender's half of the
      // set is open to them from the moment they created it.
      if (!match.isSender && match.status === 'pending') await respond(matchId, true);
      if (startNow) startAttempt();
      else {
        useToastStore.getState().showToast('Saved for later — the window keeps running.');
        navigation.goBack();
      }
    } catch (e: any) {
      useToastStore.getState().showToast(e?.message || 'Could not accept that', 'error');
    } finally {
      setBusy(null);
    }
  };

  const onDecline = async () => {
    setBusy('decline');
    try {
      await respond(matchId, false);
      useToastStore.getState().showToast('Passed on it — no penalty either way.');
      navigation.goBack();
    } catch (e: any) {
      useToastStore.getState().showToast(e?.message || 'Could not decline that', 'error');
    } finally {
      setBusy(null);
    }
  };

  return (
    <View style={styles.root}>
      <SubjectBackdrop color={match.subject ? SUBJECT_COLORS[match.subject] : CHALLENGE_TINT} />

      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <ChallengeHeader
            eyebrow={state.label.toUpperCase()}
            title={match.isSender ? `You challenged ${opponent}` : `${opponent} challenged you`}
            subtitle={
              match.windowClosed
                ? 'The window has closed on this one.'
                : `${formatTimeLeft(match.expiresAt)} — both of you answer the same set.`
            }
            onBack={() => navigation.goBack()}
          />

          {/* Who */}
          <Animated.View entering={enter(2)} style={styles.opponentCard}>
            <Avatar username={match.opponent?.username} size={52} />
            <View style={styles.opponentText}>
              <Text style={styles.opponentName} numberOfLines={1}>
                {opponent}
              </Text>
              <Text style={styles.opponentMeta}>
                {record
                  ? record.wins === record.losses
                    ? `Level with you ${record.wins}–${record.losses}`
                    : record.wins > record.losses
                      ? `You lead ${record.wins}–${record.losses}`
                      : `They lead ${record.losses}–${record.wins}`
                  : 'First time against each other'}
              </Text>
            </View>
            <PressableScale
              scaleTo={0.95}
              style={styles.profileLink}
              onPress={() =>
                navigation.navigate('FriendProfile', {
                  userId: match.opponentId,
                  username: match.opponent?.username,
                })
              }
            >
              <Text style={styles.profileLinkText}>Profile</Text>
            </PressableScale>
          </Animated.View>

          {/* What */}
          <Animated.View entering={enter(3)} style={styles.factRow}>
            <Fact
              icon={<Target color={TEXT_MUTED} size={15} strokeWidth={2} />}
              label="questions"
              value={`${count}`}
            />
            <Fact
              icon={<Clock color={TEXT_MUTED} size={15} strokeWidth={2} />}
              label="per question"
              value={`${match.timerSeconds}s`}
            />
            <Fact
              icon={<Hourglass color={TEXT_MUTED} size={15} strokeWidth={2} />}
              label="to respond"
              value={match.windowClosed ? 'closed' : formatTimeLeft(match.expiresAt).replace(' left', '')}
            />
          </Animated.View>

          <Animated.View entering={enter(4)} style={styles.setCard}>
            <View style={styles.setTop}>
              <Text style={styles.setTitle} numberOfLines={2}>
                {match.chapterName || 'Mixed questions'}
              </Text>
              <TierBadge tier={match.tier} withBlurb />
            </View>

            <Text style={styles.setBody}>
              The set is fixed and identical for both of you, so a question you have already seen in
              Practice can turn up here. There is no skip, and no review pass after you submit.
            </Text>

            <View style={styles.ruleRow}>
              <Text style={styles.ruleText}>Nothing here moves your mastery or Arena rating</Text>
            </View>
            <View style={styles.ruleRow}>
              <Text style={styles.ruleText}>Finishing counts towards today's streak</Text>
            </View>
          </Animated.View>

          {/* Where it stands */}
          {iFinished ? (
            <Animated.View entering={enter(5)} style={styles.waitingCard}>
              <Text style={styles.waitingTitle}>Readout pending</Text>
              <Text style={styles.waitingText}>
                Your answers are locked in — {match.myAttempt?.correctCount}/{count} correct.
                {match.isSender
                  ? ` ${opponent} hasn't finished yet.`
                  : ` ${opponent} hasn't finished their half yet.`}{' '}
                We'll show the comparison the moment they do.
              </Text>
            </Animated.View>
          ) : null}
        </ScrollView>

        {/* Actions */}
        {!match.windowClosed && !iFinished ? (
          <View style={styles.footer}>
            {!match.isSender && match.status === 'pending' ? (
              <>
                <PressableScale
                  onPress={onDecline}
                  scaleTo={0.96}
                  disabled={busy !== null}
                  style={styles.declineButton}
                  accessibilityLabel="Decline challenge"
                >
                  {busy === 'decline' ? (
                    <ActivityIndicator color={TEXT_MUTED} size="small" />
                  ) : (
                    <X color={TEXT_MUTED} size={17} strokeWidth={2.2} />
                  )}
                </PressableScale>
                <PressableScale
                  onPress={() => onAccept(false)}
                  scaleTo={0.97}
                  disabled={busy !== null}
                  style={styles.secondaryButton}
                >
                  <Text style={styles.secondaryText}>Play later</Text>
                </PressableScale>
                <PressableScale
                  onPress={() => onAccept(true)}
                  scaleTo={0.97}
                  disabled={busy !== null}
                  style={styles.primaryButton}
                >
                  {busy === 'accept' ? (
                    <ActivityIndicator color="#0B0B0C" size="small" />
                  ) : (
                    <>
                      <Play color="#0B0B0C" size={15} strokeWidth={2.6} />
                      <Text style={styles.primaryText}>Start now</Text>
                    </>
                  )}
                </PressableScale>
              </>
            ) : (
              <PressableScale onPress={startAttempt} scaleTo={0.97} style={styles.primaryButtonWide}>
                <Play color="#0B0B0C" size={15} strokeWidth={2.6} />
                <Text style={styles.primaryText}>
                  {match.myAttempt ? 'Resume your set' : 'Answer your set'}
                </Text>
              </PressableScale>
            )}
          </View>
        ) : null}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.hudjeeBgBase },
  safeArea: { flex: 1 },
  container: { flex: 1 },
  content: { paddingHorizontal: GUTTER, paddingTop: 8, paddingBottom: 32 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  opponentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: SURFACE,
    borderRadius: RADIUS,
    borderWidth: 1,
    borderColor: SURFACE_BORDER,
    padding: 18,
  },
  opponentText: { flex: 1 },
  opponentName: { color: TEXT, fontSize: 17, fontFamily: typography.bold, letterSpacing: -0.3 },
  opponentMeta: { color: TEXT_MUTED, fontSize: 12, fontFamily: typography.regular, marginTop: 4 },
  profileLink: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: SURFACE_BORDER,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  profileLinkText: { color: TEXT_MUTED, fontSize: 12, fontFamily: typography.semiBold },

  factRow: { flexDirection: 'row', gap: GAP, marginTop: GAP },
  fact: {
    flex: 1,
    backgroundColor: SURFACE,
    borderRadius: RADIUS,
    borderWidth: 1,
    borderColor: SURFACE_BORDER,
    paddingVertical: 16,
    paddingHorizontal: 14,
  },
  factIcon: { marginBottom: 10 },
  factValue: { color: TEXT, fontSize: 19, fontFamily: typography.bold, letterSpacing: -0.5 },
  factLabel: { color: TEXT_FAINT, fontSize: 11, fontFamily: typography.regular, marginTop: 3 },

  setCard: {
    backgroundColor: SURFACE,
    borderRadius: RADIUS,
    borderWidth: 1,
    borderColor: SURFACE_BORDER,
    padding: 20,
    marginTop: GAP,
  },
  setTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  setTitle: { flex: 1, color: TEXT, fontSize: 18, fontFamily: typography.semiBold, letterSpacing: -0.3 },
  setBody: { color: TEXT_MUTED, fontSize: 13, fontFamily: typography.regular, lineHeight: 20, marginTop: 14 },
  ruleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  ruleText: { color: TEXT_FAINT, fontSize: 12, fontFamily: typography.regular },

  waitingCard: {
    backgroundColor: 'rgba(64,201,255,0.08)',
    borderRadius: RADIUS,
    borderWidth: 1,
    borderColor: 'rgba(64,201,255,0.24)',
    padding: 20,
    marginTop: SECTION_GAP,
  },
  waitingTitle: { color: TEXT, fontSize: 16, fontFamily: typography.bold, letterSpacing: -0.2 },
  waitingText: { color: TEXT_MUTED, fontSize: 13, fontFamily: typography.regular, lineHeight: 20, marginTop: 8 },

  footer: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: GUTTER,
    paddingTop: 12,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: SURFACE_BORDER,
    backgroundColor: 'rgba(11,11,12,0.86)',
  },
  declineButton: {
    width: 50,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: SURFACE_BORDER,
    backgroundColor: SURFACE,
  },
  secondaryButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 15,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: SURFACE_BORDER,
    backgroundColor: SURFACE,
  },
  secondaryText: { color: TEXT, fontSize: 14, fontFamily: typography.semiBold },
  primaryButton: {
    flex: 1.3,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingVertical: 15,
    borderRadius: 999,
    backgroundColor: '#F5F5F7',
  },
  primaryButtonWide: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 15,
    borderRadius: 999,
    backgroundColor: '#F5F5F7',
  },
  primaryText: { color: '#0B0B0C', fontSize: 14, fontFamily: typography.bold },
});
