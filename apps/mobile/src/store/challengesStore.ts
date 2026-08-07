import { create } from 'zustand';

import {
  ChallengeAnswer,
  ChallengeDraft,
  ChallengeMatch,
  ChallengePreview,
  Friend,
  HeadToHead,
  LeaderboardRow,
  PublicProfile,
  StreakState,
  createChallenge,
  completeAttempt,
  fetchFriends,
  fetchHeadToHead,
  fetchLeaderboard,
  fetchMatch,
  fetchMatches,
  fetchMyProfile,
  fetchStreak,
  removeFriend,
  respondToChallenge,
  respondToFriendRequest,
  sendFriendRequest,
  setChallengeMute,
  stateOf,
} from '../services/challengesApi';

// One store for the whole tab. The Challenges home screen shows the streak, the
// active challenges and a leaderboard preview at once, and every one of the
// screens below it is a detail view of something already loaded here — so they
// read from this store and never re-fetch on their own.

type LeaderboardScope = 'friends' | 'global';

interface ChallengesState {
  me: PublicProfile | null;
  matches: ChallengeMatch[];
  friends: Friend[];
  streak: StreakState | null;
  leaderboard: LeaderboardRow[];
  leaderboardScope: LeaderboardScope;
  headToHead: Record<string, HeadToHead>;

  loading: boolean;
  /** Set only when the first load fails; a refresh failure keeps the last data. */
  error: string | null;

  load: () => Promise<void>;
  refreshMatches: () => Promise<void>;
  refreshMatch: (matchId: string) => Promise<ChallengeMatch | null>;
  setLeaderboardScope: (scope: LeaderboardScope) => Promise<void>;
  loadHeadToHead: (friendId: string) => Promise<void>;

  send: (draft: ChallengeDraft, preview: ChallengePreview) => Promise<ChallengeMatch>;
  respond: (matchId: string, accept: boolean) => Promise<void>;
  submitAttempt: (matchId: string, answers: ChallengeAnswer[]) => Promise<void>;

  addFriend: (friendId: string) => Promise<void>;
  answerRequest: (friendshipId: string, accept: boolean) => Promise<void>;
  dropFriend: (friendshipId: string) => Promise<void>;
  toggleMute: (friendId: string, muted: boolean) => Promise<void>;

  // ── selectors ──
  acceptedFriends: () => Friend[];
  incomingRequests: () => Friend[];
  outgoingRequests: () => Friend[];
  activeMatches: () => ChallengeMatch[];
  historyMatches: () => ChallengeMatch[];
  /** Challenges the student has to do something about — drives the tab badge. */
  yourTurnCount: () => number;
  matchById: (matchId: string) => ChallengeMatch | undefined;
}

/** Active means the challenge is still live for one of the two participants. */
function isActive(match: ChallengeMatch): boolean {
  const state = stateOf(match).key;
  return state === 'awaiting_response' || state === 'your_turn' || state === 'waiting_on_them';
}

export const useChallengesStore = create<ChallengesState>((set, get) => ({
  me: null,
  matches: [],
  friends: [],
  streak: null,
  leaderboard: [],
  leaderboardScope: 'friends',
  headToHead: {},
  loading: false,
  error: null,

  load: async () => {
    const first = get().matches.length === 0 && !get().streak;
    set({ loading: true, ...(first ? { error: null } : {}) });

    try {
      const scope = get().leaderboardScope;
      const [me, matches, friends, streak, leaderboard] = await Promise.all([
        fetchMyProfile(),
        fetchMatches(),
        fetchFriends(),
        fetchStreak(),
        fetchLeaderboard(scope),
      ]);
      set({ me, matches, friends, streak, leaderboard, loading: false, error: null });
    } catch (e: any) {
      // A refresh that fails leaves whatever was on screen alone; only a cold
      // load has nothing better to show than the message.
      set({
        loading: false,
        error: first ? e?.message || 'Could not load Challenges' : get().error,
      });
    }
  },

  refreshMatches: async () => {
    try {
      set({ matches: await fetchMatches() });
    } catch (e) {
      console.warn('Could not refresh challenges:', e);
    }
  },

  refreshMatch: async (matchId) => {
    try {
      const match = await fetchMatch(matchId);
      if (!match) return null;
      set((s) => ({
        matches: s.matches.some((m) => m.id === matchId)
          ? s.matches.map((m) => (m.id === matchId ? match : m))
          : [match, ...s.matches],
      }));
      return match;
    } catch (e) {
      console.warn('Could not refresh challenge:', e);
      return null;
    }
  },

  setLeaderboardScope: async (scope) => {
    set({ leaderboardScope: scope, leaderboard: [] });
    set({ leaderboard: await fetchLeaderboard(scope) });
  },

  loadHeadToHead: async (friendId) => {
    const record = await fetchHeadToHead(friendId);
    set((s) => ({ headToHead: { ...s.headToHead, [friendId]: record } }));
  },

  send: async (draft, preview) => {
    const match = await createChallenge(draft, preview);
    set((s) => ({ matches: [match, ...s.matches] }));
    return match;
  },

  respond: async (matchId, accept) => {
    await respondToChallenge(matchId, accept);
    // Re-read rather than patching locally: accepting also moves the attempt
    // rows, and the detail screen renders off both.
    await get().refreshMatch(matchId);
  },

  submitAttempt: async (matchId, answers) => {
    await completeAttempt(matchId, answers);
    await get().refreshMatch(matchId);
    // Finishing an attempt is a qualifying activity for the day's streak.
    try {
      set({ streak: await fetchStreak() });
    } catch {
      // The streak gauge keeps its last value; the attempt itself is already in.
    }
  },

  addFriend: async (friendId) => {
    await sendFriendRequest(friendId);
    set({ friends: await fetchFriends() });
  },

  answerRequest: async (friendshipId, accept) => {
    await respondToFriendRequest(friendshipId, accept);
    set({ friends: await fetchFriends() });
  },

  dropFriend: async (friendshipId) => {
    await removeFriend(friendshipId);
    set((s) => ({ friends: s.friends.filter((f) => f.friendshipId !== friendshipId) }));
  },

  toggleMute: async (friendId, muted) => {
    await setChallengeMute(friendId, muted);
    set((s) => ({
      friends: s.friends.map((f) => (f.userId === friendId ? { ...f, muted } : f)),
    }));
  },

  acceptedFriends: () => get().friends.filter((f) => f.status === 'accepted'),
  incomingRequests: () => get().friends.filter((f) => f.status === 'pending' && f.incoming),
  outgoingRequests: () => get().friends.filter((f) => f.status === 'pending' && !f.incoming),

  activeMatches: () => {
    const order: Record<string, number> = { your_turn: 0, waiting_on_them: 1, awaiting_response: 2 };
    return get()
      .matches.filter(isActive)
      .sort((a, b) => {
        const rank = order[stateOf(a).key] - order[stateOf(b).key];
        if (rank !== 0) return rank;
        // Within a state, whatever is closest to closing comes first.
        return new Date(a.expiresAt).getTime() - new Date(b.expiresAt).getTime();
      });
  },

  historyMatches: () =>
    get()
      .matches.filter((m) => !isActive(m))
      .sort(
        (a, b) =>
          new Date(b.completedAt || b.expiresAt).getTime() -
          new Date(a.completedAt || a.expiresAt).getTime()
      ),

  yourTurnCount: () => get().matches.filter((m) => stateOf(m).key === 'your_turn').length,

  matchById: (matchId) => get().matches.find((m) => m.id === matchId),
}));
