import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { fetchHomeSnapshot, HomeSnapshot } from '../services/homeApi';

/** Skip a refetch on focus if the snapshot is fresher than this. */
const STALE_AFTER_MS = 60 * 1000;

interface HomeState {
  snapshot: HomeSnapshot | null;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  lastFetchedAt: number | null;
  /** Fetches unless a fresh snapshot is already in memory. */
  load: () => Promise<void>;
  /** Always refetches; drives pull-to-refresh. */
  refresh: () => Promise<void>;
  /**
   * Drops the freshness stamp without clearing the snapshot, so the next `load`
   * refetches while the current numbers stay on screen. Called before leaving
   * Home for anything that can change them — a session, a chapter, the arena —
   * since otherwise the staleness window hides the result of a short session.
   */
  invalidate: () => void;
}

async function run(
  set: (partial: Partial<HomeState>) => void,
  get: () => HomeState,
  mode: 'load' | 'refresh'
) {
  if (get().loading || get().refreshing) return;

  set(mode === 'refresh' ? { refreshing: true } : { loading: true });

  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const userId = session?.user?.id;

    if (!userId) {
      set({ snapshot: null, error: 'You are signed out.', loading: false, refreshing: false });
      return;
    }

    const snapshot = await fetchHomeSnapshot(userId, session?.user);
    set({ snapshot, error: null, lastFetchedAt: Date.now(), loading: false, refreshing: false });
  } catch (e: any) {
    console.error('Failed to load home snapshot:', e);
    set({
      error: e?.message || 'Could not load your dashboard.',
      loading: false,
      refreshing: false,
    });
  }
}

export const useHomeStore = create<HomeState>((set, get) => ({
  snapshot: null,
  loading: false,
  refreshing: false,
  error: null,
  lastFetchedAt: null,
  load: async () => {
    const { snapshot, lastFetchedAt } = get();
    if (snapshot && lastFetchedAt && Date.now() - lastFetchedAt < STALE_AFTER_MS) return;
    await run(set, get, 'load');
  },
  refresh: () => run(set, get, 'refresh'),
  invalidate: () => set({ lastFetchedAt: null }),
}));
