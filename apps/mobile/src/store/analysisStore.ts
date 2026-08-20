import { create } from 'zustand';

import {
  SessionAnalysis,
  SkipRecord,
  fetchSessionAnalysis,
} from '../services/analysisApi';

/**
 * One loaded analysis, shared by the whole Analysis stack.
 *
 * The analysis is eight screens deep and every one of them wants the same
 * derived object. Passing it through route params would serialise a few hundred
 * question rows into the navigation state on every push; refetching per screen
 * would hit Supabase eight times for one session. It is loaded once, here, and
 * read by whichever screen is on top.
 *
 * `prime` is how the live session hands over its skips before navigating. The
 * skip endpoint writes no row (see `analysisApi`), so a skip is knowable only
 * while the session that made it is still on screen — after that the analysis
 * degrades to answered questions only, which it says out loud rather than
 * quietly counting a skipped question as never asked.
 */

interface AnalysisState {
  sessionId: string | null;
  analysis: SessionAnalysis | null;
  loading: boolean;
  error: string | null;
  /** Skips handed over by the live session, keyed by the session they belong to. */
  pendingSkips: Record<string, SkipRecord[]>;

  prime: (sessionId: string, skips: SkipRecord[]) => void;
  load: (sessionId: string) => Promise<void>;
  clear: () => void;
}

export const useAnalysisStore = create<AnalysisState>((set, get) => ({
  sessionId: null,
  analysis: null,
  loading: false,
  error: null,
  pendingSkips: {},

  prime: (sessionId, skips) =>
    set((state) => ({ pendingSkips: { ...state.pendingSkips, [sessionId]: skips } })),

  load: async (sessionId) => {
    if (!sessionId) {
      set({ sessionId: null, analysis: null, loading: false, error: 'No session to analyse.' });
      return;
    }

    const state = get();
    // Already on screen, and for the session being asked about.
    if (state.sessionId === sessionId && state.analysis && !state.error) return;

    set({ sessionId, loading: true, error: null, analysis: null });
    try {
      const analysis = await fetchSessionAnalysis(sessionId, state.pendingSkips[sessionId] || []);
      // A second session may have been opened while this was in flight.
      if (get().sessionId !== sessionId) return;
      set({ analysis, loading: false });
    } catch (e: any) {
      if (get().sessionId !== sessionId) return;
      set({ error: e?.message || 'Could not load this analysis.', loading: false });
    }
  },

  clear: () => set({ sessionId: null, analysis: null, loading: false, error: null }),
}));
