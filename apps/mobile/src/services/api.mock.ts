// Mock API Service for Adaptive Practice Engine

export type ChapterStatus = 'not_started' | 'in_progress' | 'needs_revisit' | 'mastered';
export type QuestionType = 'mcq_single' | 'mcq_multi' | 'numerical';

export interface Chapter {
  chapter_id: string;
  name: string;
  mastery_pct: number;
  status: ChapterStatus;
  subject?: string;
}

export interface Question {
  question_id: string;
  concept_id: string;
  type: QuestionType;
  prompt: string;
  options?: string[]; // for MCQs
}

export interface AnswerResponse {
  correct: boolean;
  solution: {
    steps: string[];
    misconception_tag: string | null;
  };
  next_question: Question | null;
  chapter_exhausted: boolean;
}

export interface SkipResponse {
  next_question: Question | null;
  concept_deferred: boolean;
  chapter_exhausted: boolean;
}

export interface SessionSummary {
  questions_answered: number;
  accuracy: number;
  concepts_mastered: any[];
  concepts_needing_revisit: any[];
}

// --- Arena Types ---
export interface ArenaChapter {
  chapter_id: string;
  name: string;
  subject: string;
  eligible: boolean;
  mastery_pct: number;
  eligibility_threshold: number;
}

export interface ArenaRating {
  rating: number;
  tier_label: string;
}

export interface ArenaSessionStartResponse {
  session_id: string;
  first_question: Question;
}

export interface ArenaAnswerResponse {
  correct: boolean;
  rating_delta: number;
  new_rating: number;
  short_explanation: string;
  weak_concept_nudge: { concept_id: string; concept_name: string } | null;
  next_question: Question | null;
}

export interface ArenaSkipResponse {
  next_question: Question | null;
}

export interface ArenaSessionSummary {
  rating_start: number;
  rating_end: number;
  questions_answered: number;
  accuracy: number;
  weakest_concepts: { concept_id: string; concept_name: string }[];
  tier_changed: boolean;
}

// --- Social / Challenges Types (V1 – kept for backward compat) ---
export interface Friend {
  friend_id: string;
  name: string;
  avatar_url: string;
  xp_this_week: number;
}

export interface FriendRequest {
  request_id: string;
  user: Friend;
}

export interface FriendRequests {
  incoming: FriendRequest[];
  outgoing: FriendRequest[];
}

export interface Challenge {
  challenge_id: string;
  from_friend?: Friend;
  to_friend?: Friend;
  subject: string;
  chapter: string;
  status: 'waiting' | 'solved_first_try' | 'solved' | 'declined';
  sent_at: string;
}

// ============================================================================
// CHALLENGES V2 — Full Social Layer Types
// ============================================================================

export type ChallengeScope = 'chapter' | 'mixed';
export type ChallengeStatus = 'pending' | 'accepted' | 'in_progress' | 'completed' | 'expired' | 'cancelled';
export type ChallengeResult = 'sender_win' | 'recipient_win' | 'tie' | 'expired' | null;

export interface FriendV2 {
  friend_id: string;
  name: string;
  avatar_url: string;
  arena_rating: number;
  streak_length: number;
  daily_xp: number;
  last_active: string;
  invite_code: string;
}

export interface ChallengeV2 {
  challenge_id: string;
  sender: FriendV2;
  recipient: FriendV2;
  scope: ChallengeScope;
  chapter_name: string | null;  // null if mixed
  question_count: number;       // 5, 10, or 15
  window_hours: number;         // 24, 48, or 72
  status: ChallengeStatus;
  result: ChallengeResult;
  sender_score: number | null;      // X out of question_count
  recipient_score: number | null;
  sender_time_ms: number | null;
  recipient_time_ms: number | null;
  sender_completed: boolean;
  recipient_completed: boolean;
  sender_reaction: string | null;   // emoji
  recipient_reaction: string | null;
  questions: Question[];
  created_at: string;
  expires_at: string;
}

export interface ChallengeAnswer {
  question_id: string;
  selected_answer: number;
  is_correct: boolean;
  time_taken_ms: number;
}

export interface ChallengeSubmitResult {
  score: number;
  total: number;
  total_time_ms: number;
  result: ChallengeResult;
  opponent_score: number | null;
  opponent_time_ms: number | null;
}

export interface StreakData {
  current_streak: number;
  longest_streak: number;
  freezes_available: number;
  is_at_risk: boolean;
  is_frozen_today: boolean;
  last_activity_date: string | null;
  milestones_reached: number[];
  // Calendar data for last 30 days
  calendar: StreakDay[];
}

export interface StreakDay {
  date: string;       // YYYY-MM-DD
  had_activity: boolean;
  freeze_used: boolean;
}

export interface LeaderboardEntry {
  user_id: string;
  name: string;
  avatar_url: string;
  arena_rating: number;
  streak_length: number;
  daily_xp: number;
  rank: number;
  rank_delta: number;  // positive = moved up, negative = moved down
  is_self: boolean;
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

// --- MOCK DATABASE ---
const DB = {
  chapters: [
    { chapter_id: 'c1', name: "Newton's Laws of Motion", subject: 'Physics', mastery_pct: 32, status: 'in_progress' as ChapterStatus },
    { chapter_id: 'c2', name: "Work, Power & Energy", subject: 'Physics', mastery_pct: 0, status: 'not_started' as ChapterStatus },
    { chapter_id: 'c3', name: "Rotational Dynamics", subject: 'Physics', mastery_pct: 85, status: 'needs_revisit' as ChapterStatus },
    { chapter_id: 'c4', name: "Chemical Bonding", subject: 'Chemistry', mastery_pct: 100, status: 'mastered' as ChapterStatus },
  ],
  questions: {
    'q1': { question_id: 'q1', concept_id: 'concept1', type: 'mcq_single' as QuestionType, prompt: 'A ballet dancer spins with her arms outstretched. When she pulls her arms in, her angular velocity increases because:', options: ['Her moment of inertia decreases', 'Her angular momentum increases', 'Her moment of inertia increases', 'Torque is applied by her arms'], correctIndex: 0, solutionSteps: ['By the law of conservation of angular momentum (L = Iω), if no external torque acts on the system, L remains constant.', 'Pulling arms in decreases the moment of inertia (I), so angular velocity (ω) must increase to keep L constant.'], misconceptionMap: { 1: 'Angular momentum is conserved, it does not increase.', 3: 'No external torque is applied; it is an internal force.' } },
    'q2': { question_id: 'q2', concept_id: 'concept1', type: 'mcq_single' as QuestionType, prompt: 'A solid disk of mass $M$ and radius $R$ is spinning with angular velocity $\\omega$. A piece of clay of mass $m$ is dropped on the edge. What is the new angular velocity?', options: ['$\\omega \\frac{M}{M + 2m}$', '$\\omega \\frac{M}{M + m}$', '$\\omega \\frac{M + 2m}{M}$', '$\\omega$'], correctIndex: 0, solutionSteps: ['Initial L = I_disk * ω = (1/2 M R^2) * ω.', 'Final I = I_disk + I_clay = (1/2 M R^2) + (m R^2).', 'Final L = Final I * ω_new.', 'Equating them gives ω_new = ω * (M / (M + 2m)).'], misconceptionMap: {} },
    'q3': { question_id: 'q3', concept_id: 'concept2', type: 'mcq_single' as QuestionType, prompt: 'A star of radius $R$ collapses to radius $R/2$ while conserving mass. The ratio of its new rotational kinetic energy to its initial rotational kinetic energy is:', options: ['4', '2', '1', '1/4'], correctIndex: 0, solutionSteps: ['L is conserved.', 'I_initial = 2/5 M R^2.', 'I_final = 2/5 M (R/2)^2 = I_initial / 4.', 'Rotational KE = L^2 / 2I.', 'Since I becomes 1/4th, KE becomes 4 times the initial.'], misconceptionMap: {} },
    'q4': { question_id: 'q4', concept_id: 'concept1', type: 'mcq_single' as QuestionType, prompt: 'A uniform rod of length L is free to rotate about one end. If released from horizontal position, the angular velocity at the lowest point is:', options: ['$\\sqrt{3g/L}$', '$\\sqrt{2g/L}$', '$\\sqrt{g/L}$', '$\\sqrt{6g/L}$'], correctIndex: 0, solutionSteps: ['Using energy conservation, mgh = ½Iω².', 'For rod about end, I = mL²/3, h = L/2.', 'mg(L/2) = ½(mL²/3)ω².', 'ω = √(3g/L).'], misconceptionMap: {} },
    'q5': { question_id: 'q5', concept_id: 'concept2', type: 'mcq_single' as QuestionType, prompt: 'Two identical spheres are connected by a massless rod. The moment of inertia about the center of the rod is:', options: ['2mr²', 'mr²', '4mr²', 'mr²/2'], correctIndex: 0, solutionSteps: ['Each sphere treated as point mass at distance r from center.', 'I_total = mr² + mr² = 2mr².'], misconceptionMap: {} },
  } as Record<string, any>
};

// State per session for mocking adaptive behaviour
const sessions: Record<string, { currentQIndex: number, qIds: string[], stats: { correct: number, total: number, skipped: number }, skipCounts: Record<string, number>, deferredConcepts: string[], masteredConcepts: string[] }> = {};

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));
const MOCK_QUESTIONS = Object.values(DB.questions) as Question[];

// ── Mock Friends V2 ──
const MOCK_FRIENDS_V2: FriendV2[] = [
  { friend_id: 'f1', name: 'Rahul S.', avatar_url: 'https://i.pravatar.cc/150?u=f1', arena_rating: 1520, streak_length: 14, daily_xp: 340, last_active: new Date(Date.now() - 3600000).toISOString(), invite_code: 'RSH42K' },
  { friend_id: 'f2', name: 'Priya M.', avatar_url: 'https://i.pravatar.cc/150?u=f2', arena_rating: 1380, streak_length: 7, daily_xp: 220, last_active: new Date(Date.now() - 7200000).toISOString(), invite_code: 'PRM91X' },
  { friend_id: 'f3', name: 'Amit K.', avatar_url: 'https://i.pravatar.cc/150?u=f3', arena_rating: 1650, streak_length: 31, daily_xp: 510, last_active: new Date(Date.now() - 1800000).toISOString(), invite_code: 'AMK77Q' },
  { friend_id: 'f4', name: 'Sneha P.', avatar_url: 'https://i.pravatar.cc/150?u=f4', arena_rating: 1200, streak_length: 3, daily_xp: 150, last_active: new Date(Date.now() - 86400000).toISOString(), invite_code: 'SNP33W' },
  { friend_id: 'f5', name: 'Vikram R.', avatar_url: 'https://i.pravatar.cc/150?u=f5', arena_rating: 1480, streak_length: 22, daily_xp: 410, last_active: new Date(Date.now() - 600000).toISOString(), invite_code: 'VKR08L' },
];

const MOCK_SELF: FriendV2 = {
  friend_id: 'self', name: 'You', avatar_url: '', arena_rating: 1420, streak_length: 12, daily_xp: 280, last_active: new Date().toISOString(), invite_code: 'JEE24A',
};

// ── Build mock challenges ──
const buildMockChallenges = (): ChallengeV2[] => {
  const now = Date.now();
  return [
    // Incoming pending
    {
      challenge_id: 'chal_1',
      sender: MOCK_FRIENDS_V2[2], // Amit
      recipient: MOCK_SELF,
      scope: 'chapter',
      chapter_name: 'Rotational Dynamics',
      question_count: 10,
      window_hours: 48,
      status: 'pending',
      result: null,
      sender_score: null,
      recipient_score: null,
      sender_time_ms: null,
      recipient_time_ms: null,
      sender_completed: false,
      recipient_completed: false,
      sender_reaction: null,
      recipient_reaction: null,
      questions: MOCK_QUESTIONS.slice(0, 3),
      created_at: new Date(now - 7200000).toISOString(),  // 2h ago
      expires_at: new Date(now + 48 * 3600000).toISOString(),
    },
    // Accepted, awaiting your move
    {
      challenge_id: 'chal_2',
      sender: MOCK_FRIENDS_V2[0], // Rahul
      recipient: MOCK_SELF,
      scope: 'chapter',
      chapter_name: "Newton's Laws of Motion",
      question_count: 5,
      window_hours: 24,
      status: 'in_progress',
      result: null,
      sender_score: 4,
      recipient_score: null,
      sender_time_ms: 245000,
      recipient_time_ms: null,
      sender_completed: true,
      recipient_completed: false,
      sender_reaction: null,
      recipient_reaction: null,
      questions: MOCK_QUESTIONS.slice(0, 5),
      created_at: new Date(now - 18 * 3600000).toISOString(),
      expires_at: new Date(now + 6 * 3600000).toISOString(),
    },
    // Sent by you, awaiting opponent
    {
      challenge_id: 'chal_3',
      sender: MOCK_SELF,
      recipient: MOCK_FRIENDS_V2[1], // Priya
      scope: 'mixed',
      chapter_name: null,
      question_count: 10,
      window_hours: 48,
      status: 'pending',
      result: null,
      sender_score: null,
      recipient_score: null,
      sender_time_ms: null,
      recipient_time_ms: null,
      sender_completed: false,
      recipient_completed: false,
      sender_reaction: null,
      recipient_reaction: null,
      questions: MOCK_QUESTIONS.slice(0, 3),
      created_at: new Date(now - 3600000).toISOString(),
      expires_at: new Date(now + 47 * 3600000).toISOString(),
    },
    // Completed — you won
    {
      challenge_id: 'chal_4',
      sender: MOCK_SELF,
      recipient: MOCK_FRIENDS_V2[0], // Rahul
      scope: 'chapter',
      chapter_name: 'Chemical Bonding',
      question_count: 10,
      window_hours: 48,
      status: 'completed',
      result: 'sender_win',
      sender_score: 9,
      recipient_score: 7,
      sender_time_ms: 252000,
      recipient_time_ms: 303000,
      sender_completed: true,
      recipient_completed: true,
      sender_reaction: '🔥',
      recipient_reaction: '👏',
      questions: MOCK_QUESTIONS.slice(0, 3),
      created_at: new Date(now - 3 * 86400000).toISOString(),
      expires_at: new Date(now - 1 * 86400000).toISOString(),
    },
    // Completed — you lost
    {
      challenge_id: 'chal_5',
      sender: MOCK_FRIENDS_V2[2], // Amit
      recipient: MOCK_SELF,
      scope: 'chapter',
      chapter_name: 'Rotational Dynamics',
      question_count: 5,
      window_hours: 24,
      status: 'completed',
      result: 'sender_win',
      sender_score: 5,
      recipient_score: 3,
      sender_time_ms: 180000,
      recipient_time_ms: 210000,
      sender_completed: true,
      recipient_completed: true,
      sender_reaction: '💪',
      recipient_reaction: null,
      questions: MOCK_QUESTIONS.slice(0, 5),
      created_at: new Date(now - 5 * 86400000).toISOString(),
      expires_at: new Date(now - 4 * 86400000).toISOString(),
    },
  ];
};

// ── Streak calendar generation ──
const buildStreakCalendar = (): StreakDay[] => {
  const days: StreakDay[] = [];
  const now = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    if (i === 0) {
      // today — no activity yet (at-risk simulation)
      days.push({ date: dateStr, had_activity: false, freeze_used: false });
    } else if (i === 15) {
      // freeze day
      days.push({ date: dateStr, had_activity: false, freeze_used: true });
    } else if (i > 12) {
      // no streak
      days.push({ date: dateStr, had_activity: i % 2 === 0, freeze_used: false });
    } else {
      // current streak run
      days.push({ date: dateStr, had_activity: true, freeze_used: false });
    }
  }
  return days;
};

export class MockEngineApi {
  
  static async getChapters(subject: string): Promise<Chapter[]> {
    await new Promise(r => setTimeout(r, 300));
    return DB.chapters.filter(c => (c as any).subject.toLowerCase() === subject.toLowerCase());
  }

  static async startSession(chapterId: string): Promise<{ session_id: string, first_question: Question }> {
    await new Promise(r => setTimeout(r, 400));
    const sessionId = `sess_${Date.now()}`;
    const qIds = ['q1', 'q2', 'q3']; // simple mock pool
    sessions[sessionId] = { 
      currentQIndex: 0, 
      qIds, 
      stats: { correct: 0, total: 0, skipped: 0 },
      skipCounts: {},
      deferredConcepts: [],
      masteredConcepts: []
    };
    
    return {
      session_id: sessionId,
      first_question: DB.questions[qIds[0]]
    };
  }

  static async getCurrentQuestion(sessionId: string): Promise<Question> {
    await new Promise(r => setTimeout(r, 200));
    const session = sessions[sessionId];
    const qId = session.qIds[session.currentQIndex];
    return DB.questions[qId];
  }

  static async submitAnswer(sessionId: string, questionId: string, response: any, timeTakenMs: number): Promise<AnswerResponse> {
    await new Promise(r => setTimeout(r, 400));
    const session = sessions[sessionId];
    const q = DB.questions[questionId];
    
    const isCorrect = typeof response === 'number' ? response === q.correctIndex : false;
    
    session.stats.total += 1;
    if (isCorrect) session.stats.correct += 1;

    // advance to next eligible question (mock: just increment index if not deferred)
    let nextQ: Question | null = null;
    let exhausted = false;
    
    let nextIndex = session.currentQIndex + 1;
    while (nextIndex < session.qIds.length) {
      const candidateQ = DB.questions[session.qIds[nextIndex]];
      if (!session.deferredConcepts.includes(candidateQ.concept_id)) {
        session.currentQIndex = nextIndex;
        nextQ = candidateQ;
        break;
      }
      nextIndex++;
    }

    if (!nextQ) {
      exhausted = true;
    }

    return {
      correct: isCorrect,
      solution: {
        steps: q.solutionSteps,
        misconception_tag: !isCorrect && typeof response === 'number' ? (q.misconceptionMap[response] || null) : null
      },
      next_question: nextQ,
      chapter_exhausted: exhausted
    };
  }

  static async skipQuestion(sessionId: string, questionId: string): Promise<SkipResponse> {
    await new Promise(r => setTimeout(r, 200));
    const session = sessions[sessionId];
    const q = DB.questions[questionId];
    
    session.stats.skipped += 1;
    const conceptId = q.concept_id;
    session.skipCounts[conceptId] = (session.skipCounts[conceptId] || 0) + 1;
    
    let deferred = false;
    if (session.skipCounts[conceptId] >= 3) {
      deferred = true;
      if (!session.deferredConcepts.includes(conceptId)) {
        session.deferredConcepts.push(conceptId);
      }
    }

    // find next question
    let nextQ: Question | null = null;
    let exhausted = false;
    
    let nextIndex = session.currentQIndex + 1;
    while (nextIndex < session.qIds.length) {
      const candidateQ = DB.questions[session.qIds[nextIndex]];
      if (!session.deferredConcepts.includes(candidateQ.concept_id)) {
        session.currentQIndex = nextIndex;
        nextQ = candidateQ;
        break;
      }
      nextIndex++;
    }

    if (!nextQ) {
      // Loop back or exhaust
      if (session.qIds.length > 0 && !session.deferredConcepts.includes(DB.questions[session.qIds[0]].concept_id)) {
         session.currentQIndex = 0;
         nextQ = DB.questions[session.qIds[0]];
      } else {
         exhausted = true;
      }
    }

    return {
      next_question: nextQ,
      concept_deferred: deferred,
      chapter_exhausted: exhausted
    };
  }

  static async endSession(sessionId: string): Promise<SessionSummary> {
    await new Promise(r => setTimeout(r, 200));
    const session = sessions[sessionId];
    
    const accuracy = session.stats.total > 0 
      ? Math.round((session.stats.correct / session.stats.total) * 100) 
      : 0;

    return {
      questions_answered: session.stats.total,
      accuracy,
      concepts_mastered: session.masteredConcepts,
      concepts_needing_revisit: session.deferredConcepts
    };
  }
  
  // ============================================================================
  // ARENA ENDPOINTS
  // ============================================================================
  
  static getArenaChapters = async (): Promise<ArenaChapter[]> => {
    await delay(600);
    return [
      { chapter_id: 'c1', name: 'Kinematics', subject: 'Physics', eligible: true, mastery_pct: 85, eligibility_threshold: 70 },
      { chapter_id: 'c2', name: 'Newton\'s Laws', subject: 'Physics', eligible: false, mastery_pct: 45, eligibility_threshold: 70 },
      { chapter_id: 'c3', name: 'Chemical Bonding', subject: 'Chemistry', eligible: true, mastery_pct: 92, eligibility_threshold: 70 },
      { chapter_id: 'c4', name: 'Calculus', subject: 'Maths', eligible: true, mastery_pct: 75, eligibility_threshold: 70 },
      { chapter_id: 'c5', name: 'Algebra', subject: 'Maths', eligible: false, mastery_pct: 60, eligibility_threshold: 70 },
    ];
  };

  static getArenaRating = async (): Promise<ArenaRating> => {
    await delay(300);
    return { rating: 1420, tier_label: 'Advancing' };
  };

  static startArenaSession = async (chapterIds: string[], timedMode: boolean): Promise<ArenaSessionStartResponse> => {
    await delay(800);
    return {
      session_id: 'arena-session-123',
      first_question: MOCK_QUESTIONS[0]
    };
  };

  static submitArenaAnswer = async (sessionId: string, questionId: string, selectedIndex: number, timeTakenMs: number): Promise<ArenaAnswerResponse> => {
    await delay(500);
    const q = MOCK_QUESTIONS.find(q => q.question_id === questionId) || MOCK_QUESTIONS[0];
    const isCorrect = selectedIndex === (q as any).correctIndex;
    
    // Pick the next question randomly
    const currentIndex = MOCK_QUESTIONS.findIndex(q => q.question_id === questionId);
    const nextQ = MOCK_QUESTIONS[(currentIndex + 1) % MOCK_QUESTIONS.length];

    if (isCorrect) {
      return {
        correct: true,
        rating_delta: 14,
        new_rating: 1434,
        short_explanation: '',
        weak_concept_nudge: null,
        next_question: nextQ
      };
    } else {
      return {
        correct: false,
        rating_delta: -9,
        new_rating: 1411,
        short_explanation: "You missed the velocity component factor.",
        weak_concept_nudge: { concept_id: 'concept1', concept_name: 'Vector Decomposition' },
        next_question: nextQ
      };
    }
  };

  static skipArenaQuestion = async (sessionId: string, questionId: string): Promise<ArenaSkipResponse> => {
    await delay(300);
    const currentIndex = MOCK_QUESTIONS.findIndex(q => q.question_id === questionId);
    const nextQ = MOCK_QUESTIONS[(currentIndex + 1) % MOCK_QUESTIONS.length];
    return { next_question: nextQ };
  };

  static endArenaSession = async (sessionId: string): Promise<ArenaSessionSummary> => {
    await delay(600);
    return {
      rating_start: 1420,
      rating_end: 1434,
      questions_answered: 12,
      accuracy: 65,
      weakest_concepts: [{ concept_id: 'concept1', concept_name: 'Vector Decomposition' }],
      tier_changed: false
    };
  };

  // ============================================================================
  // SOCIAL / CHALLENGES V1 ENDPOINTS (kept for compat)
  // ============================================================================

  static getFriends = async (): Promise<any[]> => {
    await delay(400);
    return [
      { friend_id: 'f1', name: 'Rahul S.', avatar_url: 'https://i.pravatar.cc/150?u=f1', xp_this_week: 1240 },
      { friend_id: 'f2', name: 'Priya M.', avatar_url: 'https://i.pravatar.cc/150?u=f2', xp_this_week: 980 },
      { friend_id: 'f3', name: 'Amit K.', avatar_url: 'https://i.pravatar.cc/150?u=f3', xp_this_week: 1450 }
    ];
  };

  static getFriendRequests = async (): Promise<any> => {
    await delay(300);
    return {
      incoming: [{ request_id: 'req1', user: { friend_id: 'u1', name: 'Sneha P.', avatar_url: 'https://i.pravatar.cc/150?u=u1' } }],
      outgoing: []
    };
  };

  static addFriend = async (username: string): Promise<void> => {
    await delay(500);
  };

  static respondFriendRequest = async (requestId: string, accept: boolean): Promise<void> => {
    await delay(400);
  };

  static sendChallenge = async (friendId: string, mode: 'auto' | 'manual', chapterId?: string, questionId?: string): Promise<{ challenge_id: string, status: string }> => {
    await delay(800);
    return { challenge_id: 'chal_' + Date.now(), status: 'sent' };
  };

  static getIncomingChallenges = async (): Promise<any[]> => {
    await delay(500);
    return [
      { challenge_id: 'chal_in_1', from_friend: { friend_id: 'f3', name: 'Amit K.', avatar_url: 'https://i.pravatar.cc/150?u=f3' }, subject: 'Physics', chapter: 'Rotational Dynamics', sent_at: new Date().toISOString() }
    ];
  };

  static getSentChallenges = async (): Promise<any[]> => {
    await delay(500);
    return [
      { challenge_id: 'chal_out_1', to_friend: { friend_id: 'f1', name: 'Rahul S.', avatar_url: 'https://i.pravatar.cc/150?u=f1' }, status: 'waiting', sent_at: new Date().toISOString() },
      { challenge_id: 'chal_out_2', to_friend: { friend_id: 'f2', name: 'Priya M.', avatar_url: 'https://i.pravatar.cc/150?u=f2' }, status: 'solved_first_try', sent_at: new Date(Date.now() - 86400000).toISOString() }
    ];
  };

  static getChallengeQuestion = async (challengeId: string): Promise<Question> => {
    await delay(400);
    return MOCK_QUESTIONS[2];
  };

  static submitChallengeAnswer = async (challengeId: string, selectedIndex: number, firstTry: boolean): Promise<{ correct: boolean, short_explanation: string }> => {
    await delay(500);
    const q = MOCK_QUESTIONS[2];
    const isCorrect = selectedIndex === (q as any).correctIndex;
    return {
      correct: isCorrect,
      short_explanation: isCorrect ? 'Great job! You solved it.' : 'The moment of inertia decreases, so rotational KE must increase.'
    };
  };

  // ============================================================================
  // CHALLENGES V2 ENDPOINTS
  // ============================================================================

  static getFriendsV2 = async (): Promise<FriendV2[]> => {
    await delay(400);
    return MOCK_FRIENDS_V2;
  };

  static getStreakData = async (): Promise<StreakData> => {
    await delay(300);
    const hour = new Date().getHours();
    return {
      current_streak: 12,
      longest_streak: 23,
      freezes_available: 1,
      is_at_risk: hour >= 20, // at-risk after 8 PM
      is_frozen_today: false,
      last_activity_date: new Date(Date.now() - 86400000).toISOString().split('T')[0],
      milestones_reached: [7],
      calendar: buildStreakCalendar(),
    };
  };

  static getLeaderboard = async (sort: 'rating' | 'streak', period: 'today' | 'all_time'): Promise<LeaderboardEntry[]> => {
    await delay(500);
    const entries: LeaderboardEntry[] = MOCK_FRIENDS_V2.map((f, i) => ({
      user_id: f.friend_id,
      name: f.name,
      avatar_url: f.avatar_url,
      arena_rating: f.arena_rating,
      streak_length: f.streak_length,
      daily_xp: f.daily_xp,
      rank: 0,
      rank_delta: 0,
      is_self: false,
    }));
    // Add self
    entries.push({
      user_id: 'self',
      name: 'You',
      avatar_url: '',
      arena_rating: 1420,
      streak_length: 12,
      daily_xp: 280,
      rank: 0,
      rank_delta: 0,
      is_self: true,
    });
    // Sort
    if (sort === 'rating') {
      entries.sort((a, b) => b.arena_rating - a.arena_rating);
    } else {
      entries.sort((a, b) => b.streak_length - a.streak_length);
    }
    // Assign ranks and deltas
    entries.forEach((e, i) => {
      e.rank = i + 1;
      e.rank_delta = e.is_self ? 2 : (i % 3 === 0 ? 1 : i % 3 === 1 ? -1 : 0);
    });
    return entries;
  };

  static getChallengesV2 = async (filter: 'active' | 'completed' | 'all'): Promise<ChallengeV2[]> => {
    await delay(500);
    const all = buildMockChallenges();
    if (filter === 'active') return all.filter(c => c.status !== 'completed' && c.status !== 'expired');
    if (filter === 'completed') return all.filter(c => c.status === 'completed' || c.status === 'expired');
    return all;
  };

  static getChallengeDetail = async (challengeId: string): Promise<ChallengeV2 | null> => {
    await delay(400);
    const all = buildMockChallenges();
    return all.find(c => c.challenge_id === challengeId) || null;
  };

  static createChallengeV2 = async (
    friendId: string,
    scope: ChallengeScope,
    chapterId: string | null,
    questionCount: number,
    windowHours: number
  ): Promise<ChallengeV2> => {
    await delay(800);
    const friend = MOCK_FRIENDS_V2.find(f => f.friend_id === friendId) || MOCK_FRIENDS_V2[0];
    return {
      challenge_id: 'chal_new_' + Date.now(),
      sender: MOCK_SELF,
      recipient: friend,
      scope,
      chapter_name: scope === 'chapter' ? "Newton's Laws of Motion" : null,
      question_count: questionCount,
      window_hours: windowHours,
      status: 'pending',
      result: null,
      sender_score: null,
      recipient_score: null,
      sender_time_ms: null,
      recipient_time_ms: null,
      sender_completed: false,
      recipient_completed: false,
      sender_reaction: null,
      recipient_reaction: null,
      questions: MOCK_QUESTIONS.slice(0, Math.min(questionCount, MOCK_QUESTIONS.length)),
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + windowHours * 3600000).toISOString(),
    };
  };

  static acceptChallengeV2 = async (challengeId: string): Promise<void> => {
    await delay(400);
  };

  static declineChallengeV2 = async (challengeId: string): Promise<void> => {
    await delay(400);
  };

  static submitChallengeAnswersV2 = async (
    challengeId: string,
    answers: ChallengeAnswer[]
  ): Promise<ChallengeSubmitResult> => {
    await delay(600);
    const correct = answers.filter(a => a.is_correct).length;
    const totalTime = answers.reduce((sum, a) => sum + a.time_taken_ms, 0);
    return {
      score: correct,
      total: answers.length,
      total_time_ms: totalTime,
      result: correct >= 3 ? 'sender_win' : 'recipient_win',
      opponent_score: Math.floor(Math.random() * answers.length),
      opponent_time_ms: Math.floor(Math.random() * 300000) + 120000,
    };
  };

  static reactToChallenge = async (challengeId: string, emoji: string): Promise<void> => {
    await delay(200);
  };

  static getMyInviteCode = async (): Promise<string> => {
    await delay(200);
    return 'JEE24A';
  };

  static addFriendByCode = async (code: string): Promise<FriendV2 | null> => {
    await delay(600);
    const match = MOCK_FRIENDS_V2.find(f => f.invite_code.toUpperCase() === code.toUpperCase());
    return match || null;
  };

  static blockFriend = async (friendId: string): Promise<void> => {
    await delay(300);
  };

  static removeFriend = async (friendId: string): Promise<void> => {
    await delay(300);
  };

  static getFriendRequestsV2 = async (): Promise<{ incoming: FriendV2[]; outgoing: FriendV2[] }> => {
    await delay(400);
    return {
      incoming: [MOCK_FRIENDS_V2[3]], // Sneha
      outgoing: [],
    };
  };

  static respondFriendRequestV2 = async (friendId: string, accept: boolean): Promise<void> => {
    await delay(400);
  };

  static getAllChaptersFlat = async (): Promise<Chapter[]> => {
    await delay(300);
    return [
      { chapter_id: 'c1', name: "Newton's Laws of Motion", mastery_pct: 32, status: 'in_progress', subject: 'Physics' },
      { chapter_id: 'c2', name: "Work, Power & Energy", mastery_pct: 0, status: 'not_started', subject: 'Physics' },
      { chapter_id: 'c3', name: "Rotational Dynamics", mastery_pct: 85, status: 'needs_revisit', subject: 'Physics' },
      { chapter_id: 'c4', name: "Chemical Bonding", mastery_pct: 100, status: 'mastered', subject: 'Chemistry' },
      { chapter_id: 'c5', name: "Thermodynamics", mastery_pct: 60, status: 'in_progress', subject: 'Chemistry' },
      { chapter_id: 'c6', name: "Calculus", mastery_pct: 75, status: 'in_progress', subject: 'Maths' },
      { chapter_id: 'c7', name: "Algebra", mastery_pct: 45, status: 'in_progress', subject: 'Maths' },
    ];
  };
}
