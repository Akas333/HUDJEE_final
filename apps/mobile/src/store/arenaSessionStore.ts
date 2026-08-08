import { create } from 'zustand';

import { Question } from '../services/api.mock';
import {
  ArenaContext,
  ArenaSessionConfig,
  ArenaSummary,
  endArenaSession,
  nextArenaQuestion,
  skipArenaQuestion,
  startArenaSession,
  submitArenaAnswer,
} from '../services/arenaApi';
import { ArenaModeId, MODE_BY_ID } from '../theme/arena';
import { SubjectKey } from '../theme/subjects';

/**
 * The live state of an Arena session: one runtime per active subject, and the
 * rules that decide when the session is over.
 *
 * The isolation the engine guarantees server-side is mirrored here — nothing in
 * this store reads one subject's runtime while writing another's. Switching
 * subjects never touches the runtime being left behind: its question, its
 * selected option, its clock and its ability estimate all freeze exactly where
 * they were, and come back untouched when the student returns.
 */

export type SubjectStatus = 'idle' | 'loading' | 'answering' | 'answered' | 'exhausted';
export type SessionStatus = 'idle' | 'starting' | 'active' | 'ending' | 'ended' | 'error';
export type EndReason = 'manual' | 'time' | 'target';

export interface SubjectRuntime {
  subject: SubjectKey;
  context: ArenaContext;
  status: SubjectStatus;
  question: Question | null;
  selectedOption: number | null;
  correct: boolean | null;
  solution: { steps: string[]; misconception_tag: string | null } | null;
  /** Held back until the student moves on, so the next card is instant. */
  pendingNext: Question | null;
  /** The subject's own clock. Runs only while this subject is active. */
  elapsedMs: number;
  /** Time on the question currently on screen — also frozen on switch. */
  questionElapsedMs: number;
  seen: string[];
  masteryDelta: number | null;
}

interface ArenaSessionState {
  status: SessionStatus;
  error: string | null;

  sessionId: string | null;
  mode: ArenaModeId | null;
  subjects: SubjectKey[];
  activeSubject: SubjectKey | null;
  runtime: Record<string, SubjectRuntime>;

  durationSeconds: number | null;
  remainingSeconds: number | null;
  totalTarget: number | null;
  elapsedSeconds: number;

  endedReason: EndReason | null;
  summary: ArenaSummary | null;

  start: (config: ArenaSessionConfig) => Promise<void>;
  switchSubject: (subject: SubjectKey) => Promise<void>;
  select: (index: number) => void;
  submit: () => Promise<void>;
  skip: () => Promise<void>;
  advance: () => Promise<void>;
  tick: () => void;
  end: (reason: EndReason) => Promise<void>;
  reset: () => void;
}

function blankRuntime(context: ArenaContext): SubjectRuntime {
  return {
    subject: context.subject,
    context,
    status: 'idle',
    question: null,
    selectedOption: null,
    correct: null,
    solution: null,
    pendingNext: null,
    elapsedMs: 0,
    questionElapsedMs: 0,
    seen: [],
    masteryDelta: null,
  };
}

const initialState = {
  status: 'idle' as SessionStatus,
  error: null,
  sessionId: null,
  mode: null,
  subjects: [] as SubjectKey[],
  activeSubject: null,
  runtime: {} as Record<string, SubjectRuntime>,
  durationSeconds: null,
  remainingSeconds: null,
  totalTarget: null,
  elapsedSeconds: 0,
  endedReason: null,
  summary: null,
};

export const useArenaSessionStore = create<ArenaSessionState>((set, get) => {
  /** Patch one subject's runtime, leaving every other subject untouched. */
  const patch = (subject: SubjectKey, updates: Partial<SubjectRuntime>) => {
    set((state) => ({
      runtime: {
        ...state.runtime,
        [subject]: { ...state.runtime[subject], ...updates },
      },
    }));
  };

  const totalAnswered = () =>
    Object.values(get().runtime).reduce((sum, r) => sum + r.context.questions_answered, 0);

  /** The next subject still open for answers, if there is one. */
  const firstUnlocked = (except?: SubjectKey): SubjectKey | null => {
    const state = get();
    const found = state.subjects.find(
      (subject) => subject !== except && !state.runtime[subject]?.context.locked
    );
    return found ?? null;
  };

  /**
   * The mode's stopping rule, checked after every answer. Full Simulation ends on
   * whichever limit lands first, so the count check here and the clock check in
   * `tick` are deliberately the same rule read from two directions.
   */
  const checkTargets = async () => {
    const state = get();
    if (state.status !== 'active') return;

    const mode = state.mode ? MODE_BY_ID[state.mode] : null;
    if (!mode?.counted) return;

    const runtimes = Object.values(state.runtime);
    const perSubjectTargets = runtimes.filter((r) => r.context.target_count);

    if (perSubjectTargets.length > 0) {
      // Individual targets: the session ends only once every subject has met its
      // own, which is the same instant the pooled sum is reached.
      const allMet = perSubjectTargets.every(
        (r) => r.context.questions_answered >= (r.context.target_count || 0)
      );
      if (allMet && perSubjectTargets.length === runtimes.length) {
        await get().end('target');
      }
      return;
    }

    if (state.totalTarget && totalAnswered() >= state.totalTarget) {
      await get().end('target');
    }
  };

  return {
    ...initialState,

    async start(config) {
      set({ ...initialState, status: 'starting' });

      try {
        const res = await startArenaSession(config);

        const runtime: Record<string, SubjectRuntime> = {};
        for (const context of res.contexts) {
          runtime[context.subject] = blankRuntime(context);
        }

        const active = config.activeSubject;
        if (runtime[active]) {
          runtime[active] = {
            ...runtime[active],
            question: res.first_question,
            status: res.first_question ? 'answering' : 'exhausted',
            seen: res.first_question ? [res.first_question.question_id] : [],
          };
        }

        set({
          status: 'active',
          sessionId: res.session_id,
          mode: config.mode,
          subjects: res.contexts.map((c) => c.subject),
          activeSubject: active,
          runtime,
          durationSeconds: config.durationSeconds ?? null,
          remainingSeconds: config.durationSeconds ?? null,
          totalTarget: config.totalTarget ?? null,
        });
      } catch (e: any) {
        set({
          status: 'error',
          error:
            e?.response?.data?.detail ||
            e?.message ||
            'Could not start the session. Check your connection and try again.',
        });
      }
    },

    async switchSubject(subject) {
      const state = get();
      if (state.status !== 'active' || subject === state.activeSubject) return;

      const target = state.runtime[subject];
      if (!target || target.context.locked) return;

      // The switch itself is instant: the outgoing subject simply stops being
      // active, which is all it takes for its clock and its question to freeze.
      set({ activeSubject: subject });

      // A subject that still has a question waiting resumes it as it was —
      // same question, same selection, same elapsed time. Only a subject that
      // has never been opened has to ask the engine for anything.
      if (target.question || target.status === 'exhausted') return;

      patch(subject, { status: 'loading' });
      try {
        const res = await nextArenaQuestion(state.sessionId!, subject, target.seen);
        patch(subject, {
          context: res.context,
          question: res.next_question,
          status: res.next_question ? 'answering' : 'exhausted',
          seen: res.next_question ? [...target.seen, res.next_question.question_id] : target.seen,
        });
      } catch (e: any) {
        patch(subject, { status: 'idle' });
        set({ error: e?.response?.data?.detail || 'Could not load that subject.' });
      }
    },

    select(index) {
      const { activeSubject, runtime } = get();
      if (!activeSubject) return;
      if (runtime[activeSubject]?.status !== 'answering') return;
      patch(activeSubject, { selectedOption: index });
    },

    async submit() {
      const state = get();
      const subject = state.activeSubject;
      if (!subject || !state.sessionId) return;

      const current = state.runtime[subject];
      if (current.status !== 'answering' || current.selectedOption === null || !current.question) return;

      patch(subject, { status: 'loading' });

      try {
        const res = await submitArenaAnswer(
          state.sessionId,
          subject,
          current.question.question_id,
          current.selectedOption,
          current.questionElapsedMs,
          current.seen
        );

        patch(subject, {
          status: 'answered',
          correct: res.correct,
          solution: res.solution,
          context: res.context,
          masteryDelta: res.mastery_delta,
          pendingNext: res.next_question,
          seen: res.next_question ? [...current.seen, res.next_question.question_id] : current.seen,
        });

        await checkTargets();
      } catch (e: any) {
        patch(subject, { status: 'answering' });
        set({ error: e?.response?.data?.detail || 'Could not submit that answer.' });
      }
    },

    async skip() {
      const state = get();
      const subject = state.activeSubject;
      if (!subject || !state.sessionId) return;

      const current = state.runtime[subject];
      if (current.status !== 'answering' || !current.question) return;

      patch(subject, { status: 'loading' });

      try {
        const res = await skipArenaQuestion(
          state.sessionId,
          subject,
          current.question.question_id,
          current.seen
        );

        patch(subject, {
          status: res.next_question ? 'answering' : 'exhausted',
          question: res.next_question,
          selectedOption: null,
          correct: null,
          solution: null,
          pendingNext: null,
          questionElapsedMs: 0,
          context: res.context,
          masteryDelta: res.mastery_delta,
          seen: res.next_question ? [...current.seen, res.next_question.question_id] : current.seen,
        });
      } catch (e: any) {
        patch(subject, { status: 'answering' });
        set({ error: e?.response?.data?.detail || 'Could not skip that question.' });
      }
    },

    async advance() {
      const state = get();
      const subject = state.activeSubject;
      if (!subject) return;

      const current = state.runtime[subject];
      if (current.status !== 'answered') return;

      // A subject that just met its own target is done taking answers: its
      // queued next question is dropped and the student is moved on to whichever
      // subject is still open. If none are, `checkTargets` has already ended it.
      if (current.context.locked) {
        patch(subject, {
          question: null,
          pendingNext: null,
          status: 'exhausted',
          selectedOption: null,
          correct: null,
          solution: null,
          questionElapsedMs: 0,
          masteryDelta: null,
        });

        const next = firstUnlocked(subject);
        if (next) await get().switchSubject(next);
        return;
      }

      patch(subject, {
        question: current.pendingNext,
        status: current.pendingNext ? 'answering' : 'exhausted',
        selectedOption: null,
        correct: null,
        solution: null,
        pendingNext: null,
        questionElapsedMs: 0,
        masteryDelta: null,
      });
    },

    tick() {
      const state = get();
      if (state.status !== 'active') return;

      const subject = state.activeSubject;
      const active = subject ? state.runtime[subject] : null;

      set({ elapsedSeconds: state.elapsedSeconds + 1 });

      if (active) {
        // Only the active subject's clocks move. This is the whole of the
        // pause-on-switch behaviour — there is nothing to explicitly pause.
        patch(active.subject, {
          elapsedMs: active.elapsedMs + 1000,
          questionElapsedMs:
            active.status === 'answering' ? active.questionElapsedMs + 1000 : active.questionElapsedMs,
        });
      }

      if (state.remainingSeconds !== null) {
        const remaining = state.remainingSeconds - 1;
        set({ remainingSeconds: Math.max(0, remaining) });
        if (remaining <= 0) {
          // A question in flight when the clock hits zero is left unattempted.
          get().end('time');
        }
      }
    },

    async end(reason) {
      const state = get();
      if (!state.sessionId || state.status === 'ending' || state.status === 'ended') return;

      set({ status: 'ending', endedReason: reason });

      const elapsedBySubject: Record<string, number> = {};
      for (const runtime of Object.values(state.runtime)) {
        elapsedBySubject[runtime.subject] = runtime.elapsedMs;
      }

      try {
        const summary = await endArenaSession(
          state.sessionId,
          state.elapsedSeconds,
          elapsedBySubject,
          reason
        );
        set({ status: 'ended', summary });
      } catch (e: any) {
        // The session is over either way; the student should not be trapped in
        // it because the summary call failed.
        set({
          status: 'ended',
          error: e?.response?.data?.detail || 'Session saved, but the summary could not be loaded.',
        });
      }
    },

    reset() {
      set({ ...initialState });
    },
  };
});

/** Total questions answered across every context. */
export function totalAnsweredOf(runtime: Record<string, SubjectRuntime>): number {
  return Object.values(runtime).reduce((sum, r) => sum + r.context.questions_answered, 0);
}
