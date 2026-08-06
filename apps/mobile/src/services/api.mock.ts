// Mock API Service for Adaptive Practice Engine

export type ChapterStatus = 'not_started' | 'in_progress' | 'needs_revisit' | 'mastered';
/** The seven formats the CMS can author — see `lib/questionFormat.ts`. */
export type QuestionType =
  | 'mcq_single'
  | 'mcq_multi'
  | 'integer'
  | 'numerical'
  | 'assertion_reason'
  | 'passage'
  | 'matrix';

export interface Chapter {
  chapter_id: string;
  name: string;
  mastery_pct: number;
  status: ChapterStatus;
  subject?: string;
  total_questions?: number;
}

export interface Question {
  question_id: string;
  concept_id: string;
  type: QuestionType;
  prompt: string;
  /**
   * Whatever `questions.options` holds for this format: `[{id, text, image_url}]`
   * for the choice formats, `{type:'matrix', left, right}` for matrix match, and
   * nothing at all for the numeric ones. Older callers stored plain strings, so
   * `normalizeQuestion` reads every shape.
   */
  options?: any;
}

export interface AnswerResponse {
  correct: boolean;
  solution: {
    steps: string[];
    misconception_tag: string | null;
  };
  next_question: Question | null;
  chapter_exhausted: boolean;
  /** The stored key, so the screen can show what the answer was. */
  correct_answer?: string;
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
