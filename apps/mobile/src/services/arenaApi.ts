import { engineApi } from './api';
import { supabase } from '../lib/supabase';
import { Question } from './api.mock';
import { ArenaModeId } from '../theme/arena';
import { SubjectKey } from '../theme/subjects';

// The client half of Arena's multi-context engine. Every call is addressed to
// one subject, because that is the unit the engine adapts on — there is no
// endpoint here that could move two subjects at once, by design.

export interface ArenaChapterOption {
  chapterId: string;
  name: string;
  subject: SubjectKey;
  totalQuestions: number;
}

export interface ArenaContext {
  subject: SubjectKey;
  theta: number;
  mastery_pct: number;
  starting_theta: number;
  starting_mastery_pct: number;
  questions_answered: number;
  correct_count: number;
  skipped_count: number;
  target_count: number | null;
  locked: boolean;
  questions_available: number;
}

export interface ArenaSubjectSelection {
  subject: SubjectKey;
  chapter_ids: string[];
  target_count?: number | null;
  start_mastery_pct?: number | null;
}

export interface ArenaSessionConfig {
  mode: ArenaModeId;
  subjects: ArenaSubjectSelection[];
  activeSubject: SubjectKey;
  durationSeconds?: number | null;
  totalTarget?: number | null;
}

export interface ArenaStartResponse {
  session_id: string;
  contexts: ArenaContext[];
  first_question: Question | null;
  exhausted: boolean;
}

export interface ArenaNextResponse {
  next_question: Question | null;
  context: ArenaContext;
  exhausted: boolean;
}

export interface ArenaAnswerResponse {
  correct: boolean;
  solution: { steps: string[]; misconception_tag: string | null };
  context: ArenaContext;
  mastery_delta: number;
  next_question: Question | null;
  exhausted: boolean;
}

export interface ArenaSkipResponse {
  context: ArenaContext;
  mastery_delta: number;
  next_question: Question | null;
  exhausted: boolean;
}

export interface ArenaMissedQuestion {
  question_id: string;
  subject: SubjectKey;
  concept_id: string | null;
  concept_name: string | null;
  prompt: string;
}

export interface ArenaSubjectSummary {
  subject: SubjectKey;
  starting_mastery_pct: number;
  ending_mastery_pct: number;
  mastery_delta: number;
  questions_answered: number;
  correct_count: number;
  skipped_count: number;
  accuracy: number;
  target_count: number | null;
  elapsed_ms: number;
}

export interface ArenaSummary {
  session_id: string;
  mode: ArenaModeId;
  ended_reason: 'manual' | 'time' | 'target' | null;
  duration_seconds: number;
  questions_answered: number;
  correct_count: number;
  skipped_count: number;
  accuracy: number;
  subjects: ArenaSubjectSummary[];
  missed_questions: ArenaMissedQuestion[];
}

async function currentUserId(): Promise<string> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const userId = session?.user?.id;
  if (!userId) {
    // Arena keeps three ability estimates per session; there is nowhere to hang
    // them without an account, so this is a hard stop rather than a guest path.
    throw new Error('Sign in to enter the Arena.');
  }
  return userId;
}

/** Every published chapter, grouped by the subject it belongs to. */
export async function fetchArenaChapters(): Promise<Record<SubjectKey, ArenaChapterOption[]>> {
  const grouped: Record<SubjectKey, ArenaChapterOption[]> = {
    physics: [],
    chemistry: [],
    maths: [],
  };

  const { data, error } = await supabase
    .from('chapters')
    .select('id, name, subject, total_questions')
    .order('sort_order', { ascending: true });

  if (error) {
    console.warn('Could not load Arena chapters:', error.message);
    return grouped;
  }

  for (const row of (data || []) as any[]) {
    const subject = (row.subject || '').toLowerCase() as SubjectKey;
    if (!grouped[subject]) continue;
    grouped[subject].push({
      chapterId: row.id,
      name: row.name,
      subject,
      totalQuestions: row.total_questions || 0,
    });
  }

  return grouped;
}

/**
 * Where each selected subject stands right now. The setup screen shows this
 * before the first question loads — Arena's whole point is that the instrument
 * is visible, including before you start.
 */
export async function previewContexts(
  subjects: ArenaSubjectSelection[]
): Promise<ArenaContext[]> {
  const userId = await currentUserId();
  const res = await engineApi.post('/arena/preview', { user_id: userId, subjects });
  return res.data.contexts || [];
}

export async function startArenaSession(config: ArenaSessionConfig): Promise<ArenaStartResponse> {
  const userId = await currentUserId();
  const res = await engineApi.post('/arena/session/start', {
    user_id: userId,
    mode: config.mode,
    subjects: config.subjects,
    active_subject: config.activeSubject,
    duration_seconds: config.durationSeconds ?? null,
    total_target: config.totalTarget ?? null,
  });
  return res.data;
}

/** The question a subject serves when the student switches into it. */
export async function nextArenaQuestion(
  sessionId: string,
  subject: SubjectKey,
  seenQuestionIds: string[]
): Promise<ArenaNextResponse> {
  const userId = await currentUserId();
  const res = await engineApi.post('/arena/session/next', {
    user_id: userId,
    session_id: sessionId,
    subject,
    seen_question_ids: seenQuestionIds,
  });
  return res.data;
}

export async function submitArenaAnswer(
  sessionId: string,
  subject: SubjectKey,
  questionId: string,
  selectedIndex: number,
  timeTakenMs: number,
  seenQuestionIds: string[]
): Promise<ArenaAnswerResponse> {
  const userId = await currentUserId();

  // Correctness is resolved here, the same way Practice does it, because the
  // answer key is not shipped with the question.
  const { data } = await supabase
    .from('questions')
    .select('correct_answer, options')
    .eq('id', questionId)
    .single();

  const isCorrect = matchesAnswer(data, selectedIndex);

  const res = await engineApi.post('/arena/session/answer', {
    user_id: userId,
    session_id: sessionId,
    subject,
    question_id: questionId,
    is_correct: isCorrect,
    time_taken_ms: timeTakenMs,
    seen_question_ids: seenQuestionIds,
  });
  return res.data;
}

/**
 * An answer key can be stored either as the option's id or as its index, so
 * check the selected option's own id before falling back to the index.
 */
function matchesAnswer(question: any, selectedIndex: number): boolean {
  const key = question?.correct_answer;
  if (key == null) return false;

  const options = question?.options;
  if (Array.isArray(options)) {
    const option = options[selectedIndex];
    const optionId = typeof option === 'object' && option !== null ? option.id : null;
    if (optionId != null && String(optionId) === String(key)) return true;
    if (typeof option === 'object' && option !== null && option.is_correct === true) return true;
  }

  return String(key) === String(selectedIndex);
}

export async function skipArenaQuestion(
  sessionId: string,
  subject: SubjectKey,
  questionId: string,
  seenQuestionIds: string[]
): Promise<ArenaSkipResponse> {
  const userId = await currentUserId();
  const res = await engineApi.post('/arena/session/skip', {
    user_id: userId,
    session_id: sessionId,
    subject,
    question_id: questionId,
    seen_question_ids: seenQuestionIds,
  });
  return res.data;
}

export async function endArenaSession(
  sessionId: string,
  durationSeconds: number,
  elapsedMsBySubject: Record<string, number>,
  endedReason: 'manual' | 'time' | 'target'
): Promise<ArenaSummary> {
  const userId = await currentUserId();
  const res = await engineApi.post('/arena/session/end', {
    user_id: userId,
    session_id: sessionId,
    duration_seconds: durationSeconds,
    elapsed_ms_by_subject: elapsedMsBySubject,
    ended_reason: endedReason,
  });
  return res.data;
}
