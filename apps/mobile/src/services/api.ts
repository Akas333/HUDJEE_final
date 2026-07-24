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
