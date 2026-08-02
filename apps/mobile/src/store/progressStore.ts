import { create } from 'zustand';
import { EngineApi } from '../services/api';

interface DashboardSummary {
  time_spent_yesterday_ms: number;
  questions_solved_yesterday: number;
  total_topics_covered: number;
}

interface ProgressState {
  activeStreak: number;
  retentionRate: number;
  masteryLevel: string;
  dashboardSummary: DashboardSummary | null;
  setProgress: (data: Partial<ProgressState>) => void;
  fetchDashboardSummary: () => Promise<void>;
}

export const useProgressStore = create<ProgressState>((set) => ({
  activeStreak: 0,
  retentionRate: 0,
  masteryLevel: 'NOVICE',
  dashboardSummary: null,
  setProgress: (data) => set((state) => ({ ...state, ...data })),
  fetchDashboardSummary: async () => {
    try {
      const summary = await EngineApi.getDashboardSummary();
      set({ dashboardSummary: summary });
    } catch (error) {
      console.error("Failed to fetch dashboard summary:", error);
    }
  }
}));
