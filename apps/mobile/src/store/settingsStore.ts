import { create } from 'zustand';

interface NotificationsPrefs {
  streak: boolean;
  challenge: boolean;
  practice: boolean;
  arena: boolean;
}

interface PracticePrefs {
  sound: boolean;
  haptics: boolean;
  defaultSessionLength: number;
  reduceMotion: boolean;
}

interface SettingsState {
  notifications: NotificationsPrefs;
  practicePrefs: PracticePrefs;
  
  toggleNotification: (key: keyof NotificationsPrefs) => void;
  updateNotification: (key: keyof NotificationsPrefs, value: boolean) => void;
  
  togglePracticePref: (key: keyof Pick<PracticePrefs, 'sound' | 'haptics' | 'reduceMotion'>) => void;
  updatePracticePref: <K extends keyof PracticePrefs>(key: K, value: PracticePrefs[K]) => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  notifications: {
    streak: true,
    challenge: true,
    practice: false,
    arena: true,
  },
  practicePrefs: {
    sound: true,
    haptics: true,
    defaultSessionLength: 10,
    reduceMotion: false,
  },
  
  toggleNotification: (key) =>
    set((state) => ({
      notifications: {
        ...state.notifications,
        [key]: !state.notifications[key],
      },
    })),
    
  updateNotification: (key, value) =>
    set((state) => ({
      notifications: {
        ...state.notifications,
        [key]: value,
      },
    })),
    
  togglePracticePref: (key) =>
    set((state) => ({
      practicePrefs: {
        ...state.practicePrefs,
        [key]: !state.practicePrefs[key],
      },
    })),
    
  updatePracticePref: (key, value) =>
    set((state) => ({
      practicePrefs: {
        ...state.practicePrefs,
        [key]: value,
      },
    })),
}));
