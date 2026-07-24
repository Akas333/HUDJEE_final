import { create } from 'zustand';

interface ProgressState {
  activeStreak: number;
  retentionRate: number;
  masteryLevel: string;
  setProgress: (data: Partial<ProgressState>) => void;
}

export const useProgressStore = create<ProgressState>((set) => ({
  activeStreak: 0,
  retentionRate: 0,
  masteryLevel: 'NOVICE',
  setProgress: (data) => set((state) => ({ ...state, ...data })),
}));
