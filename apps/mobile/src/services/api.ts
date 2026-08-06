import axios from 'axios';
import { supabase } from '../lib/supabase';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://api.hudjee.com';

export const engineApi = axios.create({
  baseURL: API_URL,
  timeout: 10000,
});

// Add a request interceptor to inject the Supabase Auth token
engineApi.interceptors.request.use(
  async (config) => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session?.access_token) {
      config.headers.Authorization = `Bearer ${session.access_token}`;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Example Service Methods
export const EngineService = {
  getNextQuestion: async (subjectId: string, currentTheta: number) => {
    const response = await engineApi.post('/irt/next-question', {
      subject_id: subjectId,
      current_theta: currentTheta,
    });
    return response.data;
  },
  
  submitAnswer: async (questionId: string, isCorrect: boolean, currentTheta: number) => {
    const response = await engineApi.post('/irt/submit-answer', {
      question_id: questionId,
      is_correct: isCorrect,
      current_theta: currentTheta,
    });
    return response.data;
  }
};

import {
  Chapter, Question, AnswerResponse, SkipResponse, SessionSummary,
  ArenaChapter, ArenaRating, ArenaSessionStartResponse, ArenaAnswerResponse,
  ArenaSkipResponse, ArenaSessionSummary, Challenge
} from "./api.mock";
import { AnswerDraft, NormalizedQuestion, gradeDraft } from "../lib/questionFormat";

export class EngineApi {
  
  static async getChapters(subject: string): Promise<Chapter[]> {
    const { data, error } = await supabase
      .from("chapters")
      .select("*")
      .ilike("subject", subject)
      .order("sort_order", { ascending: true });

    if (error) {
      console.error("Error fetching chapters:", error);
      return [];
    }

    return (data || []).map((c: any) => ({
      chapter_id: c.id,
      name: c.name,
      mastery_pct: 0,
      status: "in_progress",
      subject: c.subject,
      total_questions: c.total_questions || 0,
    }));
  }

  static async getConcepts(chapterId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from("topics")
      .select("*")
      .eq("chapter_id", chapterId)
      .order("sort_order", { ascending: true });
      
    if (error) {
      console.error("Error fetching concepts:", error);
      return [];
    }
    
    return (data || []).map((t: any) => ({
      id: t.id,
      title: t.name,
      progress: 0,
    }));
  }

  static async startSession(chapterId: string, conceptId?: string): Promise<{ session_id: string, first_question: Question | null, exhausted?: boolean }> {
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id || 'anonymous';

    const response = await engineApi.post('/irt/session/start', {
      user_id: userId,
      chapter_id: chapterId,
      ...(conceptId && { concept_id: conceptId })
    });
    return response.data;
  }

  /**
   * The engine is told whether the answer was right; it does not work that out
   * itself. So the key is read here — RLS already exposes every column of a
   * published question — and graded by `gradeDraft`, which knows what a correct
   * answer looks like for each of the seven formats. Comparing the raw response
   * to the raw key only ever worked for single-choice questions, and even then
   * only by luck: the CMS writes the key 1-based.
   */
  static async submitAnswer(
    sessionId: string,
    question: NormalizedQuestion,
    draft: AnswerDraft,
    timeTakenMs: number,
    seenQuestionIds: string[] = []
  ): Promise<AnswerResponse> {
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id || 'anonymous';

    const { data: qData } = await supabase
      .from('questions')
      .select('correct_answer')
      .eq('id', question.id)
      .single();

    const correctAnswer = qData?.correct_answer ?? '';
    const isCorrect = gradeDraft(question, draft, correctAnswer);

    const res = await engineApi.post('/irt/session/answer', {
      user_id: userId,
      session_id: sessionId,
      question_id: question.id,
      is_correct: isCorrect,
      time_taken_ms: timeTakenMs,
      seen_question_ids: seenQuestionIds
    });
    return { ...res.data, correct_answer: correctAnswer };
  }

  static async skipQuestion(sessionId: string, questionId: string, seenQuestionIds: string[] = []): Promise<SkipResponse> {
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id || 'anonymous';
    
    const res = await engineApi.post('/irt/session/skip', {
      user_id: userId,
      session_id: sessionId,
      question_id: questionId,
      seen_question_ids: seenQuestionIds
    });
    return res.data;
  }

  static async endSession(sessionId: string): Promise<SessionSummary> {
    // We could call a backend endpoint to summarize, but for MVP we mock it.
    return { questions_answered: 1, accuracy: 100, concepts_mastered: [], concepts_needing_revisit: [] };
  }

  static async reportQuestion(questionId: string, reason: string, details?: string): Promise<void> {
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id || 'anonymous';
    
    await engineApi.post('/irt/session/report', {
      user_id: userId,
      question_id: questionId,
      reason,
      details
    });
  }

  static async getDashboardSummary(): Promise<any> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id || 'anonymous';
      const res = await engineApi.get(`/dashboard/summary?user_id=${userId}`);
      return res.data;
    } catch (e: any) {
      console.warn("Backend unavailable, using mock dashboard summary. Error:", e.message);
      return {
        // Callers that derive their own insights from Supabase (see homeApi)
        // use this flag to ignore the placeholder copy below.
        __mock: true,
        time_invested_insight: "Not enough data yet. Start practicing to see your insights!",
        streak_insight: "Set your goal and make some progress!",
        strongest_subject_insight: "Complete more questions to discover your strengths.",
        needs_attention_insight: null,
        arena_movement_insight: null,
        social_rank_insight: null
      };
    }
  }

  static getArenaChapters = async (): Promise<ArenaChapter[]> => [];
  static getArenaRating = async (): Promise<ArenaRating> => ({ rating: 1000, tier_label: "Beginner" });
  static startArenaSession = async (): Promise<any> => ({});
  static submitArenaAnswer = async (): Promise<any> => ({});
  static skipArenaQuestion = async (): Promise<any> => ({});
  static endArenaSession = async (): Promise<any> => ({});

  static getFriends = async (): Promise<any[]> => [];
  static getFriendRequests = async (): Promise<any> => ({ incoming: [], outgoing: [] });
  static addFriend = async (): Promise<void> => {};
  static respondFriendRequest = async (): Promise<void> => {};
  static sendChallenge = async (): Promise<any> => ({});
  static getIncomingChallenges = async (): Promise<any[]> => [];
  static getSentChallenges = async (): Promise<any[]> => [];
  static getChallengeQuestion = async (): Promise<any> => ({});
  static submitChallengeAnswer = async (): Promise<any> => ({});
}
