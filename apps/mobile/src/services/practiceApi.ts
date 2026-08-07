import { supabase } from '../lib/supabase';

// Progress for the Practice tab. `EngineApi.getChapters` / `getConcepts` only
// know the taxonomy, so mastery/solved/time are derived here from
// `answer_events` and `user_concept_state` — the same sources the Home tab rolls
// up, scoped to whatever is currently on screen.

const LOOKBACK_DAYS = 180;
const MAX_EVENTS = 3000;

export interface ProgressStats {
  masteryPct: number;
  questionsSolved: number;
  minutesSpent: number;
  lastPracticedAt: string | null;
}

export type ChapterProgress = ProgressStats;
export type TopicProgress = ProgressStats;

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

/** IRT theta lives roughly in [-3, 3]; map it onto a 0–100 mastery scale. */
function thetaToMastery(theta: number): number {
  return clamp(Math.round(((theta + 3) / 6) * 100), 0, 100);
}

function pct(part: number, whole: number): number {
  if (!whole) return 0;
  return clamp(Math.round((part / whole) * 100), 0, 100);
}

interface Agg {
  solved: number;
  correct: number;
  ms: number;
  last: string | null;
}

function statsFrom(agg: Agg | undefined, masteryPct: number): ProgressStats {
  return {
    masteryPct,
    questionsSolved: agg?.solved || 0,
    minutesSpent: Math.round((agg?.ms || 0) / 60000),
    lastPracticedAt: agg?.last || null,
  };
}

async function currentUserId(): Promise<string | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.user?.id ?? null;
}

/**
 * Answer counts grouped by the question's chapter or topic. `!inner` is what
 * makes the embedded filter apply to the top-level rows instead of just nulling
 * the embed out.
 */
async function aggregateEvents(
  userId: string,
  column: 'chapter_id' | 'concept_id',
  ids: string[]
): Promise<Map<string, Agg>> {
  const out = new Map<string, Agg>();
  const since = new Date(Date.now() - LOOKBACK_DAYS * 86400000).toISOString();

  const { data, error } = await supabase
    .from('answer_events')
    .select(`is_correct, time_taken_ms, answered_at, questions!inner(${column})`)
    .eq('user_id', userId)
    .in(`questions.${column}`, ids)
    .gte('answered_at', since)
    .limit(MAX_EVENTS);

  if (error) {
    console.warn('Could not load answer events:', error.message);
    return out;
  }

  for (const row of (data || []) as any[]) {
    // PostgREST returns the to-one embed as an object; the generated types widen
    // it to an array, so accept either shape.
    const embedded = Array.isArray(row.questions) ? row.questions[0] : row.questions;
    const key = embedded?.[column];
    if (!key) continue;

    const a = out.get(key) || { solved: 0, correct: 0, ms: 0, last: null };
    a.solved += 1;
    if (row.is_correct) a.correct += 1;
    a.ms += row.time_taken_ms || 0;
    if (!a.last || row.answered_at > a.last) a.last = row.answered_at;
    out.set(key, a);
  }

  return out;
}

/** Per-topic IRT mastery, for the topics we asked about. */
async function masteryByTopic(userId: string, topicIds: string[]): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  const { data, error } = await supabase
    .from('user_concept_state')
    .select('concept_id, theta')
    .eq('user_id', userId)
    .in('concept_id', topicIds);

  if (error) {
    console.warn('Could not load concept state:', error.message);
    return out;
  }

  for (const row of (data || []) as any[]) {
    if (row.concept_id != null) out.set(row.concept_id, thetaToMastery(row.theta ?? 0));
  }
  return out;
}

/**
 * Never throws: the taxonomy renders on its own and progress is merged in when
 * (and if) it arrives, so a failure here leaves the cards at zero rather than
 * taking the screen down. The same contract holds for `fetchTopicProgress`.
 */
export async function fetchChapterProgress(
  chapterIds: string[]
): Promise<Map<string, ChapterProgress>> {
  const out = new Map<string, ChapterProgress>();
  if (chapterIds.length === 0) return out;

  try {
    const userId = await currentUserId();
    if (!userId) return out;

    const [agg, topicsRes] = await Promise.all([
      aggregateEvents(userId, 'chapter_id', chapterIds),
      supabase.from('topics').select('id, chapter_id').in('chapter_id', chapterIds),
    ]);

    const topicsByChapter = new Map<string, string[]>();
    for (const t of ((topicsRes.data || []) as any[])) {
      const list = topicsByChapter.get(t.chapter_id) || [];
      list.push(t.id);
      topicsByChapter.set(t.chapter_id, list);
    }

    const allTopicIds = [...topicsByChapter.values()].flat();
    const mastery = allTopicIds.length ? await masteryByTopic(userId, allTopicIds) : new Map();

    for (const chapterId of chapterIds) {
      const a = agg.get(chapterId);
      const topicIds = topicsByChapter.get(chapterId) || [];

      // Untouched topics count as zero, so the bar reads as chapter coverage
      // rather than "accuracy on the two topics you happened to open".
      const scored = topicIds.filter((id) => mastery.has(id));
      const masteryPct =
        topicIds.length > 0 && scored.length > 0
          ? clamp(
              Math.round(
                scored.reduce((acc, id) => acc + (mastery.get(id) || 0), 0) / topicIds.length
              ),
              0,
              100
            )
          : a
            ? pct(a.correct, a.solved)
            : 0;

      out.set(chapterId, statsFrom(a, masteryPct));
    }
  } catch (e) {
    console.warn('Could not load chapter progress:', e);
  }

  return out;
}

export async function fetchTopicProgress(topicIds: string[]): Promise<Map<string, TopicProgress>> {
  const out = new Map<string, TopicProgress>();
  if (topicIds.length === 0) return out;

  try {
    const userId = await currentUserId();
    if (!userId) return out;

    const [agg, mastery] = await Promise.all([
      aggregateEvents(userId, 'concept_id', topicIds),
      masteryByTopic(userId, topicIds),
    ]);

    for (const topicId of topicIds) {
      const a = agg.get(topicId);
      // A topic the engine has scored uses its theta; one that has only been
      // answered falls back to plain accuracy so the bar still moves.
      const masteryPct = mastery.has(topicId)
        ? mastery.get(topicId)!
        : a
          ? pct(a.correct, a.solved)
          : 0;

      out.set(topicId, statsFrom(a, masteryPct));
    }
  } catch (e) {
    console.warn('Could not load topic progress:', e);
  }

  return out;
}
