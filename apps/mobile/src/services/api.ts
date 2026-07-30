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
      mastery_pct: Math.floor(Math.random() * 100),
      status: "in_progress",
      subject: c.subject,
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
      progress: Math.floor(Math.random() * 100),
    }));
  }

  static async startSession(chapterId: string): Promise<{ session_id: string, first_question: Question }> {
    const { data: questions, error: qError } = await supabase
      .from("questions")
      .select("*")
      .eq("chapter_id", chapterId);
      
    if (qError || !questions || questions.length === 0) {
      throw new Error("No questions found for this chapter");
    }

    const sessionId = `sess_${Date.now()}`;
    
    const firstQ = questions[0];
    return {
      session_id: sessionId,
      first_question: {
        question_id: firstQ.id,
        concept_id: firstQ.concept_id,
        type: firstQ.format,
        prompt: firstQ.question_body,
        options: firstQ.options ? firstQ.options.map((o: any) => o.text) : undefined,
      } as Question
    };
  }

  static async submitAnswer(sessionId: string, questionId: string, response: any, timeTakenMs: number): Promise<AnswerResponse> {
    return {
      correct: true,
      solution: { steps: ["Solution step 1"], misconception_tag: null },
      next_question: null,
      chapter_exhausted: true
    };
  }

  static async skipQuestion(sessionId: string, questionId: string): Promise<SkipResponse> {
    return { next_question: null, concept_deferred: false, chapter_exhausted: true };
  }

  static async endSession(sessionId: string): Promise<SessionSummary> {
    return { questions_answered: 1, accuracy: 100, concepts_mastered: [], concepts_needing_revisit: [] };
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
