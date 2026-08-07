import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { BellOff, Check, Search, Swords, UserMinus, UserPlus, X } from 'lucide-react-native';

import PressableScale from '../../components/PressableScale';
import SubjectBackdrop from '../../components/SubjectBackdrop';
import Avatar from '../../components/challenges/Avatar';
import ChallengeHeader from '../../components/challenges/ChallengeHeader';
import { useToastStore } from '../../services/ToastService';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { withAlpha } from '../../theme/subjects';
import {
  CHALLENGE_TINT,
  GUTTER,
  RADIUS,
  SECTION_GAP,
  SURFACE,
  SURFACE_BORDER,
  TEXT,
  TEXT_FAINT,
  TEXT_MUTED,
} from '../../theme/challenges';
import { useChallengesStore } from '../../store/challengesStore';
import { PublicProfile, displayName, searchProfiles } from '../../services/challengesApi';

// The roster. Three things in one scroll, in the order they need attention:
// requests waiting on you, the friends you already have, and the search box for
// finding new ones.

const enter = (index: number) =>
  FadeInDown.springify().damping(18).mass(0.6).delay(Math.min(index, 8) * 40);

const SEARCH_DEBOUNCE_MS = 320;

function SectionHeader({ title, meta }: { title: string; meta?: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {meta ? <Text style={styles.sectionMeta}>{meta}</Text> : null}
    </View>
  );
}

export default function ManageFriendsScreen({ navigation }: any) {
  const load = useChallengesStore((s) => s.load);
  const acceptedFriends = useChallengesStore((s) => s.acceptedFriends);
  const incomingRequests = useChallengesStore((s) => s.incomingRequests);
  const outgoingRequests = useChallengesStore((s) => s.outgoingRequests);
  const answerRequest = useChallengesStore((s) => s.answerRequest);
  const dropFriend = useChallengesStore((s) => s.dropFriend);
  const toggleMute = useChallengesStore((s) => s.toggleMute);
  const addFriend = useChallengesStore((s) => s.addFriend);
  const friends = useChallengesStore((s) => s.friends);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PublicProfile[]>([]);
  const [searching, setSearching] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  // Debounced, and tagged so a slow response for an older query cannot land on
  // top of a newer one.
  const searchRef = useRef(0);
  useEffect(() => {
    const term = query.trim();
    if (term.length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }

    const token = ++searchRef.current;
    setSearching(true);
    const id = setTimeout(() => {
      searchProfiles(term).then((rows) => {
        if (searchRef.current !== token) return;
        setResults(rows);
        setSearching(false);
      });
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(id);
  }, [query]);

  const accepted = acceptedFriends();
  const incoming = incomingRequests();
  const outgoing = outgoingRequests();

  const knownIds = new Set(friends.map((f) => f.userId));

  const onAdd = async (profile: PublicProfile) => {
    setBusyId(profile.userId);
    try {
      await addFriend(profile.userId);
      useToastStore.getState().showToast(`Request sent to ${displayName(profile.username)}`);
    } catch (e: any) {
      useToastStore.getState().showToast(e?.message || 'Could not send that request', 'error');
    } finally {
      setBusyId(null);
    }
  };

  const onRespond = async (friendshipId: string, accept: boolean, name: string) => {
    setBusyId(friendshipId);
    try {
      await answerRequest(friendshipId, accept);
      useToastStore
        .getState()
        .showToast(accept ? `${name} is on your roster` : 'Request dismissed');
    } catch (e: any) {
      useToastStore.getState().showToast(e?.message || 'Could not do that', 'error');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <View style={styles.root}>
      <SubjectBackdrop color={CHALLENGE_TINT} />

      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <ChallengeHeader
            eyebrow="ROSTER"
            title="Friends"
            subtitle="Challenges are one-on-one, so this list is who you can put questions in front of."
            onBack={() => navigation.goBack()}
          />

          {/* Requests first — somebody is waiting on an answer. */}
          {incoming.length > 0 ? (
            <Animated.View entering={enter(2)} style={{ marginBottom: SECTION_GAP }}>
              <SectionHeader title="Requests" meta={`${incoming.length} waiting`} />
              <View style={{ gap: 10 }}>
                {incoming.map((friend) => (
                  <View key={friend.friendshipId} style={styles.row}>
                    <Avatar username={friend.username} size={40} />
                    <View style={styles.rowText}>
                      <Text style={styles.rowName} numberOfLines={1}>
                        {displayName(friend.username)}
                      </Text>
                      <Text style={styles.rowMeta}>wants to be friends</Text>
                    </View>

                    {busyId === friend.friendshipId ? (
                      <ActivityIndicator color={TEXT_MUTED} size="small" />
                    ) : (
                      <View style={styles.rowActions}>
                        <PressableScale
                          scaleTo={0.9}
                          style={styles.ghostButton}
                          onPress={() => onRespond(friend.friendshipId, false, displayName(friend.username))}
                          accessibilityLabel={`Dismiss request from ${displayName(friend.username)}`}
                        >
                          <X color={TEXT_MUTED} size={16} strokeWidth={2.2} />
                        </PressableScale>
                        <PressableScale
                          scaleTo={0.9}
                          style={styles.acceptButton}
                          onPress={() => onRespond(friend.friendshipId, true, displayName(friend.username))}
                          accessibilityLabel={`Accept ${displayName(friend.username)}`}
                        >
                          <Check color="#0B0B0C" size={16} strokeWidth={2.6} />
                        </PressableScale>
                      </View>
                    )}
                  </View>
                ))}
              </View>
            </Animated.View>
          ) : null}

          {/* Friends */}
          <Animated.View entering={enter(3)} style={{ marginBottom: SECTION_GAP }}>
            <SectionHeader
              title="Your friends"
              meta={accepted.length > 0 ? `${accepted.length}` : undefined}
            />

            {accepted.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyText}>
                  Nobody yet. Search below by username — you both have to agree, so nothing shows up
                  on their side until they accept.
                </Text>
              </View>
            ) : (
              <View style={{ gap: 10 }}>
                {accepted.map((friend) => (
                  <PressableScale
                    key={friend.friendshipId}
                    scaleTo={0.99}
                    style={styles.row}
                    onPress={() =>
                      navigation.navigate('FriendProfile', {
                        userId: friend.userId,
                        username: friend.username,
                      })
                    }
                  >
                    <Avatar username={friend.username} size={40} />
                    <View style={styles.rowText}>
                      <Text style={styles.rowName} numberOfLines={1}>
                        {displayName(friend.username)}
                      </Text>
                      <Text style={styles.rowMeta}>
                        {friend.muted ? 'Challenges muted' : `Level ${friend.level}`}
                      </Text>
                    </View>

                    <View style={styles.rowActions}>
                      <PressableScale
                        scaleTo={0.9}
                        style={[styles.ghostButton, friend.muted && styles.ghostButtonActive]}
                        onPress={() => toggleMute(friend.userId, !friend.muted)}
                        accessibilityLabel={
                          friend.muted
                            ? `Unmute challenges from ${displayName(friend.username)}`
                            : `Mute challenges from ${displayName(friend.username)}`
                        }
                      >
                        <BellOff color={friend.muted ? TEXT : TEXT_MUTED} size={15} strokeWidth={2} />
                      </PressableScale>
                      <PressableScale
                        scaleTo={0.9}
                        style={styles.ghostButton}
                        onPress={() => dropFriend(friend.friendshipId)}
                        accessibilityLabel={`Remove ${displayName(friend.username)}`}
                      >
                        <UserMinus color={TEXT_MUTED} size={15} strokeWidth={2} />
                      </PressableScale>
                      <PressableScale
                        scaleTo={0.9}
                        style={styles.challengeButton}
                        onPress={() =>
                          navigation.navigate('ChallengeCompose', { opponentId: friend.userId })
                        }
                        accessibilityLabel={`Challenge ${displayName(friend.username)}`}
                      >
                        <Swords color="#0B0B0C" size={15} strokeWidth={2.2} />
                      </PressableScale>
                    </View>
                  </PressableScale>
                ))}
              </View>
            )}
          </Animated.View>

          {/* Outgoing */}
          {outgoing.length > 0 ? (
            <Animated.View entering={enter(4)} style={{ marginBottom: SECTION_GAP }}>
              <SectionHeader title="Sent" meta={`${outgoing.length} pending`} />
              <View style={{ gap: 10 }}>
                {outgoing.map((friend) => (
                  <View key={friend.friendshipId} style={styles.row}>
                    <Avatar username={friend.username} size={40} quiet />
                    <View style={styles.rowText}>
                      <Text style={styles.rowName} numberOfLines={1}>
                        {displayName(friend.username)}
                      </Text>
                      <Text style={styles.rowMeta}>waiting on them</Text>
                    </View>
                    <PressableScale
                      scaleTo={0.9}
                      style={styles.ghostButton}
                      onPress={() => dropFriend(friend.friendshipId)}
                      accessibilityLabel="Cancel request"
                    >
                      <X color={TEXT_MUTED} size={16} strokeWidth={2.2} />
                    </PressableScale>
                  </View>
                ))}
              </View>
            </Animated.View>
          ) : null}

          {/* Add */}
          <Animated.View entering={enter(5)}>
            <SectionHeader title="Add a friend" />

            <View style={styles.searchBox}>
              <Search color={TEXT_FAINT} size={17} strokeWidth={2} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Search by username"
                placeholderTextColor={TEXT_FAINT}
                autoCapitalize="none"
                autoCorrect={false}
                style={styles.searchInput}
              />
              {searching ? <ActivityIndicator color={TEXT_FAINT} size="small" /> : null}
            </View>

            {query.trim().length >= 2 && !searching && results.length === 0 ? (
              <Animated.Text entering={FadeIn.duration(180)} style={styles.searchNote}>
                No handle matches "{query.trim()}".
              </Animated.Text>
            ) : null}

            <View style={{ gap: 10, marginTop: 12 }}>
              {results.map((profile) => {
                const known = knownIds.has(profile.userId);
                return (
                  <View key={profile.userId} style={styles.row}>
                    <Avatar username={profile.username} size={40} />
                    <View style={styles.rowText}>
                      <Text style={styles.rowName} numberOfLines={1}>
                        {displayName(profile.username)}
                      </Text>
                      <Text style={styles.rowMeta}>Level {profile.level}</Text>
                    </View>

                    {known ? (
                      <Text style={styles.knownTag}>ON YOUR LIST</Text>
                    ) : busyId === profile.userId ? (
                      <ActivityIndicator color={TEXT_MUTED} size="small" />
                    ) : (
                      <PressableScale
                        scaleTo={0.9}
                        style={styles.acceptButton}
                        onPress={() => onAdd(profile)}
                        accessibilityLabel={`Send a request to ${displayName(profile.username)}`}
                      >
                        <UserPlus color="#0B0B0C" size={16} strokeWidth={2.2} />
                      </PressableScale>
                    )}
                  </View>
                );
              })}
            </View>
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.hudjeeBgBase },
  safeArea: { flex: 1 },
  content: { paddingHorizontal: GUTTER, paddingTop: 8, paddingBottom: 48 },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 14,
  },
  sectionTitle: { color: TEXT, fontSize: 17, fontFamily: typography.semiBold, letterSpacing: -0.2 },
  sectionMeta: { color: TEXT_FAINT, fontSize: 12, fontFamily: typography.regular },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: SURFACE,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: SURFACE_BORDER,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  rowText: { flex: 1 },
  rowName: { color: TEXT, fontSize: 15, fontFamily: typography.semiBold, letterSpacing: -0.2 },
  rowMeta: { color: TEXT_FAINT, fontSize: 11, fontFamily: typography.regular, marginTop: 3 },
  rowActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },

  ghostButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: SURFACE_BORDER,
    backgroundColor: 'rgba(255,255,255,0.04)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ghostButtonActive: {
    backgroundColor: withAlpha(CHALLENGE_TINT, 0.24),
    borderColor: withAlpha(CHALLENGE_TINT, 0.5),
  },
  acceptButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F5F5F7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  challengeButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F5F5F7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  knownTag: { color: TEXT_FAINT, fontSize: 9, fontFamily: typography.bold, letterSpacing: 0.8 },

  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: SURFACE,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: SURFACE_BORDER,
    paddingHorizontal: 14,
    height: 50,
  },
  searchInput: {
    flex: 1,
    color: TEXT,
    fontSize: 15,
    fontFamily: typography.regular,
    // Android gives the input its own vertical padding, which pushes the text
    // off-centre inside a fixed-height row.
    paddingVertical: 0,
  },
  searchNote: { color: TEXT_FAINT, fontSize: 12, fontFamily: typography.regular, marginTop: 12 },

  emptyCard: {
    backgroundColor: SURFACE,
    borderRadius: RADIUS,
    borderWidth: 1,
    borderColor: SURFACE_BORDER,
    padding: 20,
  },
  emptyText: { color: TEXT_MUTED, fontSize: 13, fontFamily: typography.regular, lineHeight: 20 },
});
