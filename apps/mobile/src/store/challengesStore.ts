import { create } from 'zustand';
import {
  ChallengeV2,
  ChallengeScope,
  FriendV2,
  StreakData,
  LeaderboardEntry,
  ChallengeAnswer,
  ChallengeSubmitResult,
} from '../services/api.mock';
import { MockEngineApi } from '../services/api.mock';

interface ChallengesState {
  // Data
  challenges: ChallengeV2[];
  streak: StreakData | null;
  friends: FriendV2[];
  leaderboard: LeaderboardEntry[];
  myInviteCode: string;
  friendRequestsIncoming: FriendV2[];
  friendRequestsOutgoing: FriendV2[];

  // UI state
  isLoading: boolean;
  leaderboardSort: 'rating' | 'streak';
  leaderboardPeriod: 'today' | 'all_time';

  // Actions
  fetchAll: () => Promise<void>;
  fetchChallenges: (filter?: 'active' | 'completed' | 'all') => Promise<void>;
  fetchStreak: () => Promise<void>;
  fetchFriends: () => Promise<void>;
  fetchLeaderboard: () => Promise<void>;
  fetchFriendRequests: () => Promise<void>;
  setLeaderboardSort: (sort: 'rating' | 'streak') => void;
  setLeaderboardPeriod: (period: 'today' | 'all_time') => void;

  // Challenge actions
  createChallenge: (
    friendId: string,
    scope: ChallengeScope,
    chapterId: string | null,
    questionCount: number,
    windowHours: number
  ) => Promise<ChallengeV2>;
  acceptChallenge: (challengeId: string) => Promise<void>;
  declineChallenge: (challengeId: string) => Promise<void>;
  submitChallengeAnswers: (
    challengeId: string,
    answers: ChallengeAnswer[]
  ) => Promise<ChallengeSubmitResult>;
  reactToChallenge: (challengeId: string, emoji: string) => Promise<void>;

  // Friend actions
  addFriendByCode: (code: string) => Promise<FriendV2 | null>;
  removeFriend: (friendId: string) => Promise<void>;
  blockFriend: (friendId: string) => Promise<void>;
  respondFriendRequest: (friendId: string, accept: boolean) => Promise<void>;
}

export const useChallengesStore = create<ChallengesState>((set, get) => ({
  // Initial state
  challenges: [],
  streak: null,
  friends: [],
  leaderboard: [],
  myInviteCode: '',
  friendRequestsIncoming: [],
  friendRequestsOutgoing: [],
  isLoading: false,
  leaderboardSort: 'rating',
  leaderboardPeriod: 'today',

  // Fetch everything at once (for initial load / pull-to-refresh)
  fetchAll: async () => {
    set({ isLoading: true });
    try {
      const [challenges, streak, friends, code, friendReqs] = await Promise.all([
        MockEngineApi.getChallengesV2('all'),
        MockEngineApi.getStreakData(),
        MockEngineApi.getFriendsV2(),
        MockEngineApi.getMyInviteCode(),
        MockEngineApi.getFriendRequestsV2(),
      ]);
      
      const { leaderboardSort, leaderboardPeriod } = get();
      const leaderboard = await MockEngineApi.getLeaderboard(leaderboardSort, leaderboardPeriod);

      set({
        challenges,
        streak,
        friends,
        leaderboard,
        myInviteCode: code,
        friendRequestsIncoming: friendReqs.incoming,
        friendRequestsOutgoing: friendReqs.outgoing,
        isLoading: false,
      });
    } catch (error) {
      console.error('Failed to fetch challenges data:', error);
      set({ isLoading: false });
    }
  },

  fetchChallenges: async (filter = 'all') => {
    const challenges = await MockEngineApi.getChallengesV2(filter);
    set({ challenges });
  },

  fetchStreak: async () => {
    const streak = await MockEngineApi.getStreakData();
    set({ streak });
  },

  fetchFriends: async () => {
    const friends = await MockEngineApi.getFriendsV2();
    set({ friends });
  },

  fetchLeaderboard: async () => {
    const { leaderboardSort, leaderboardPeriod } = get();
    const leaderboard = await MockEngineApi.getLeaderboard(leaderboardSort, leaderboardPeriod);
    set({ leaderboard });
  },

  fetchFriendRequests: async () => {
    const data = await MockEngineApi.getFriendRequestsV2();
    set({ friendRequestsIncoming: data.incoming, friendRequestsOutgoing: data.outgoing });
  },

  setLeaderboardSort: (sort) => {
    set({ leaderboardSort: sort });
    get().fetchLeaderboard();
  },

  setLeaderboardPeriod: (period) => {
    set({ leaderboardPeriod: period });
    get().fetchLeaderboard();
  },

  // Challenge actions
  createChallenge: async (friendId, scope, chapterId, questionCount, windowHours) => {
    const challenge = await MockEngineApi.createChallengeV2(friendId, scope, chapterId, questionCount, windowHours);
    set((state) => ({ challenges: [challenge, ...state.challenges] }));
    return challenge;
  },

  acceptChallenge: async (challengeId) => {
    await MockEngineApi.acceptChallengeV2(challengeId);
    set((state) => ({
      challenges: state.challenges.map((c) =>
        c.challenge_id === challengeId ? { ...c, status: 'accepted' as const } : c
      ),
    }));
  },

  declineChallenge: async (challengeId) => {
    await MockEngineApi.declineChallengeV2(challengeId);
    set((state) => ({
      challenges: state.challenges.filter((c) => c.challenge_id !== challengeId),
    }));
  },

  submitChallengeAnswers: async (challengeId, answers) => {
    const result = await MockEngineApi.submitChallengeAnswersV2(challengeId, answers);
    set((state) => ({
      challenges: state.challenges.map((c) =>
        c.challenge_id === challengeId
          ? {
              ...c,
              status: 'completed' as const,
              recipient_score: result.score,
              recipient_time_ms: result.total_time_ms,
              recipient_completed: true,
              result: result.result,
            }
          : c
      ),
    }));
    return result;
  },

  reactToChallenge: async (challengeId, emoji) => {
    await MockEngineApi.reactToChallenge(challengeId, emoji);
    set((state) => ({
      challenges: state.challenges.map((c) =>
        c.challenge_id === challengeId
          ? { ...c, recipient_reaction: emoji }
          : c
      ),
    }));
  },

  // Friend actions
  addFriendByCode: async (code) => {
    const friend = await MockEngineApi.addFriendByCode(code);
    if (friend) {
      set((state) => ({ friends: [...state.friends, friend] }));
    }
    return friend;
  },

  removeFriend: async (friendId) => {
    await MockEngineApi.removeFriend(friendId);
    set((state) => ({
      friends: state.friends.filter((f) => f.friend_id !== friendId),
      // Also remove any challenges with this friend
      challenges: state.challenges.filter(
        (c) => c.sender.friend_id !== friendId && c.recipient.friend_id !== friendId
      ),
    }));
  },

  blockFriend: async (friendId) => {
    await MockEngineApi.blockFriend(friendId);
    set((state) => ({
      friends: state.friends.filter((f) => f.friend_id !== friendId),
      challenges: state.challenges.filter(
        (c) => c.sender.friend_id !== friendId && c.recipient.friend_id !== friendId
      ),
    }));
  },

  respondFriendRequest: async (friendId, accept) => {
    await MockEngineApi.respondFriendRequestV2(friendId, accept);
    set((state) => ({
      friendRequestsIncoming: state.friendRequestsIncoming.filter((f) => f.friend_id !== friendId),
    }));
    if (accept) {
      get().fetchFriends();
    }
  },
}));
