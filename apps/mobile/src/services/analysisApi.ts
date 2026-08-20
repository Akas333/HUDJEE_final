import { supabase } from '../lib/supabase';

/**
 * Everything the post-session analysis shows, derived in the app from the two
 * rows the engine already writes: `answer_events` for the run and `questions`
 * for what was asked.
 *
 * Nothing here calls the engine. The engine decides which question to serve
 * next; it does not keep a report of a finished run, and `EngineApi.endSession`
 * is still a stub that returns invented numbers. Deriving from Supabase is the
 * same shape `practiceApi` and `homeApi` already use, and it means the analysis
 * works on a session finished a week ago, not just the one that ends in front
 * of us.
 *
 * Two things a student would expect are deliberately absent, because the data
 * cannot support them honestly:
 *
 * - **Rank and percentile.** They need every other student's attempt at the
 *   same paper. A practice run is adaptive, so no two students see the same
 *   questions, and there is nothing to rank against.
 * - **Skips, for a run we did not just watch.** `POST /irt/session/skip` picks
 *   the next question without writing a row, so a skip leaves no trace. The
 *   live session hands its own skips in via `prime()`; an analysis opened from
 *   history counts only what was answered, and says so.
 */

// ── Marking ──────────────────────────────────────────────────────────────────
// JEE Main. Kept as constants rather than sprinkled through the maths, because
// Advanced marks partial credit differently and this is the one place that
// would have to change.

export const MARKS_CORRECT = 4;
export const MARKS_WRONG = -1;

/**
 * What "solved in time" means, per band.
 *
 * JEE Main gives 180 minutes for 75 questions — 2.4 minutes each, averaged over
 * a paper where the easy ones are meant to buy time for the hard ones. These
 * split that average the way the paper intends it to be spent, and they are the
 * line between a perfect attempt and an overtime one.
 */
export const IDEAL_MS: Record<Band, number> = {
  easy: 60_000,
  moderate: 120_000,
  tough: 180_000,
};

// ── Shapes ───────────────────────────────────────────────────────────────────

/** The three difficulty lanes, as a student reads them. */
export type Band = 'easy' | 'moderate' | 'tough';

export type Verdict = 'correct' | 'wrong' | 'skipped';

/**
 * Not just right or wrong, but whether the time spent was worth what it bought.
 * A correct answer that ate four minutes and a wrong one guessed in ten seconds
 * are both worth flagging, and neither shows up in an accuracy figure.
 */
export type Quality =
  /** Correct, inside the time the band deserves. */
  | 'perfect'
  /** Wrong, and quick — the shape of a guess. */
  | 'wasted'
  /** Attempted, and over time. Right or wrong, it cost another question. */
  | 'overtime'
  /** Skipped, but only after sinking time into it. The worst trade on the paper. */
  | 'confused'
  /** Skipped early, which is the correct way to skip. */
  | 'left';

export const BAND_LABEL: Record<Band, string> = {
  easy: 'Easy',
  moderate: 'Moderate',
  tough: 'Tough',
};

/** Lane order, bottom to top — the y-axis of the journey chart. */
export const BAND_ORDER: Band[] = ['easy', 'moderate', 'tough'];

export const QUALITY_LABEL: Record<Quality, string> = {
  perfect: 'Perfect',
  wasted: 'Wasted',
  overtime: 'Overtime',
  confused: 'Confused',
  left: 'Left early',
};

export interface AnalysedQuestion {
  /** 1-based, in the order the student actually met them. */
  position: number;
  questionId: string;
  subject: string;
  chapter: string;
  topic: string;
  /** Kept so "practise this again" can open a session on the right concept. */
  chapterId: string | null;
  conceptId: string | null;
  format: string;
  band: Band;
  verdict: Verdict;
  timeMs: number;
  idealMs: number;
  quality: Quality;
  marks: number;
  /** The engine's estimate of the student when it served this, if it logged one. */
  theta: number | null;
  /** The item's calibrated difficulty at that moment. */
  liveB: number | null;
  at: string;
}

export interface Totals {
  asked: number;
  attempted: number;
  correct: number;
  wrong: number;
  skipped: number;
  /** Of what was attempted — the figure a student means by "accuracy". */
  accuracyPct: number;
  score: number;
  maxScore: number;
  /** Marks earned, before the negatives come off. */
  positive: number;
  /** Marks handed back to the negative marking. Always reported positive. */
  lost: number;
  timeMs: number;
  avgMs: number;
}

export interface BandRow {
  band: Band;
  asked: number;
  correct: number;
  wrong: number;
  skipped: number;
  accuracyPct: number;
  avgMs: number;
}

export interface TopicRow {
  key: string;
  chapter: string;
  topic: string;
  asked: number;
  correct: number;
  accuracyPct: number;
  timeMs: number;
}

export interface QualityCounts {
  perfect: number;
  wasted: number;
  overtime: number;
  confused: number;
  left: number;
}

export interface TimeSplit {
  correctMs: number;
  wrongMs: number;
  skippedMs: number;
}

/**
 * What the run looked like as a climb, rather than as a total. `swings` is how
 * often the engine changed lane, which is the difference between a session that
 * found its level and one that never settled.
 */
export interface JourneyShape {
  peak: Band;
  opened: Band;
  closed: Band;
  swings: number;
  /** Longest run of correct answers, and the band it happened in. */
  bestRun: number;
  /** Whether the student ended above, at, or below the lane they opened on. */
  direction: 'up' | 'flat' | 'down';
}

export interface SessionAnalysis {
  sessionId: string;
  startedAt: string | null;
  endedAt: string | null;
  /** Wall-clock, when the session row knows it; otherwise summed question time. */
  durationMs: number;
  chapterTitle: string | null;
  questions: AnalysedQuestion[];
  totals: Totals;
  bands: BandRow[];
  topics: TopicRow[];
  quality: QualityCounts;
  timeSplit: TimeSplit;
  potential: { actual: number; halfError: number; noError: number; max: number };
  shape: JourneyShape | null;
  /** Plain sentences, worst first. Rule-derived — nothing here is a model call. */
  insights: string[];
  /** True when skips were handed in live, so "not attempted" can be trusted. */
  skipsKnown: boolean;
}

/** A skip, as the live session saw it. See the note on `prime()`. */
export interface SkipRecord {
  questionId: string;
  timeTakenMs: number;
  at: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function bandOf(difficulty: string | null | undefined): Band {
  if (difficulty === 'easy') return 'easy';
  if (difficulty === 'hard') return 'tough';
  return 'moderate';
}

function pct(part: number, whole: number): number {
  if (!whole) return 0;
  return Math.round((part / whole) * 100);
}

function num(v: any): number | null {
  const n = typeof v === 'string' ? parseFloat(v) : v;
  return typeof n === 'number' && Number.isFinite(n) ? n : null;
}

function qualityOf(verdict: Verdict, timeMs: number, idealMs: number): Quality {
  const overtime = timeMs > idealMs;
  if (verdict === 'skipped') return overtime ? 'confused' : 'left';
  if (overtime) return 'overtime';
  return verdict === 'correct' ? 'perfect' : 'wasted';
}

/** PostgREST returns a to-one embed as an object; the generated types widen it
 *  to an array. Accept either rather than trusting one. */
function embedded(row: any): any {
  return Array.isArray(row.questions) ? row.questions[0] : row.questions;
}

// ── Fetch ────────────────────────────────────────────────────────────────────

/**
 * `questions` holds ids, not names: `20260728000000_add_chapters.sql` dropped
 * the old `chapter` and `topic` text columns in favour of foreign keys. The
 * names are resolved separately by `resolveNames` rather than through a nested
 * embed, so the query cannot break on relationship inference.
 */
const QUESTION_FIELDS = 'id, subject, chapter_id, concept_id, format, difficulty';

/** Chapter and topic names for a set of ids, as two lookup maps. */
async function resolveNames(
  chapterIds: string[],
  conceptIds: string[]
): Promise<{ chapters: Map<string, string>; topics: Map<string, string> }> {
  const [chapterRes, topicRes] = await Promise.all([
    chapterIds.length
      ? supabase.from('chapters').select('id, name').in('id', chapterIds)
      : Promise.resolve({ data: [] as any[] }),
    conceptIds.length
      ? supabase.from('topics').select('id, name').in('id', conceptIds)
      : Promise.resolve({ data: [] as any[] }),
  ]);

  return {
    chapters: new Map(((chapterRes as any).data || []).map((c: any) => [c.id, c.name])),
    topics: new Map(((topicRes as any).data || []).map((t: any) => [t.id, t.name])),
  };
}

/**
 * Reads one finished session and works out everything the analysis screens
 * show.
 *
 * Throws only when the session has no answers at all — every screen downstream
 * assumes at least one question, and a zero-question analysis is a different
 * screen (an empty state), not a degenerate chart.
 */
export async function fetchSessionAnalysis(
  sessionId: string,
  skips: SkipRecord[] = []
): Promise<SessionAnalysis> {
  const [eventsRes, sessionRes] = await Promise.all([
    supabase
      .from('answer_events')
      .select(
        `question_id, is_correct, time_taken_ms, answered_at, theta_at_time, live_b_at_time, questions!inner(${QUESTION_FIELDS})`
      )
      .eq('session_id', sessionId)
      .order('answered_at', { ascending: true }),
    supabase
      .from('sessions')
      .select('started_at, ended_at, duration_seconds, config')
      .eq('id', sessionId)
      .maybeSingle(),
  ]);

  if (eventsRes.error) throw new Error(eventsRes.error.message);

  const events = (eventsRes.data || []) as any[];

  // Skipped questions carry no answer row, so their bodies have to be fetched
  // by id and slotted back into the sequence by timestamp.
  let skipRows: any[] = [];
  if (skips.length > 0) {
    const { data } = await supabase
      .from('questions')
      .select(QUESTION_FIELDS)
      .in(
        'id',
        skips.map((s) => s.questionId)
      );
    skipRows = data || [];
  }
  const skipById = new Map(skipRows.map((q) => [q.id, q]));

  type Raw = {
    q: any;
    verdict: Verdict;
    timeMs: number;
    at: string;
    theta: number | null;
    liveB: number | null;
  };

  const raw: Raw[] = [];

  for (const e of events) {
    const q = embedded(e);
    if (!q) continue;
    raw.push({
      q,
      verdict: e.is_correct ? 'correct' : 'wrong',
      timeMs: e.time_taken_ms || 0,
      at: e.answered_at,
      theta: num(e.theta_at_time),
      liveB: num(e.live_b_at_time),
    });
  }

  for (const s of skips) {
    const q = skipById.get(s.questionId);
    if (!q) continue;
    raw.push({ q, verdict: 'skipped', timeMs: s.timeTakenMs || 0, at: s.at, theta: null, liveB: null });
  }

  raw.sort((a, b) => (a.at < b.at ? -1 : a.at > b.at ? 1 : 0));

  const session = (sessionRes as any)?.data || null;

  if (raw.length === 0) {
    // Nothing came back — and which of the two reasons it is matters, because
    // they need opposite fixes. If the `sessions` row is invisible too, the
    // client is being denied the rows rather than looking at an empty session:
    // `sessions` and `answer_events` carry RLS on the deployed database that
    // the migrations in this repo do not describe, so a missing per-user SELECT
    // policy reads exactly like a session where nobody answered anything.
    if (!session) {
      throw new Error(
        'Could not read this session. It exists, but this account is not being shown its own rows — check the SELECT policies on sessions and answer_events.'
      );
    }
    throw new Error('This session has no answered questions.');
  }

  const names = await resolveNames(
    [...new Set(raw.map((r) => r.q.chapter_id).filter(Boolean))] as string[],
    [...new Set(raw.map((r) => r.q.concept_id).filter(Boolean))] as string[]
  );

  const questions: AnalysedQuestion[] = raw.map((r, i) => {
    const band = bandOf(r.q.difficulty);
    const idealMs = IDEAL_MS[band];
    const marks =
      r.verdict === 'correct' ? MARKS_CORRECT : r.verdict === 'wrong' ? MARKS_WRONG : 0;

    return {
      position: i + 1,
      questionId: r.q.id,
      subject: r.q.subject || '',
      chapter: names.chapters.get(r.q.chapter_id) || '',
      topic: names.topics.get(r.q.concept_id) || '',
      chapterId: r.q.chapter_id || null,
      conceptId: r.q.concept_id || null,
      format: r.q.format || '',
      band,
      verdict: r.verdict,
      timeMs: r.timeMs,
      idealMs,
      quality: qualityOf(r.verdict, r.timeMs, idealMs),
      marks,
      theta: r.theta,
      liveB: r.liveB,
      at: r.at,
    };
  });

  const config = typeof session?.config === 'string' ? safeParse(session.config) : session?.config;

  return build(sessionId, questions, {
    startedAt: session?.started_at ?? questions[0].at,
    endedAt: session?.ended_at ?? null,
    durationSeconds: session?.duration_seconds ?? null,
    chapterTitle:
      names.chapters.get(config?.chapter_id) ?? config?.chapter_title ?? null,
    skipsKnown: skips.length > 0,
  });
}

function safeParse(s: string): any {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

// ── Derivation ───────────────────────────────────────────────────────────────

function build(
  sessionId: string,
  questions: AnalysedQuestion[],
  meta: {
    startedAt: string | null;
    endedAt: string | null;
    durationSeconds: number | null;
    chapterTitle: string | null;
    skipsKnown: boolean;
  }
): SessionAnalysis {
  const correct = questions.filter((q) => q.verdict === 'correct');
  const wrong = questions.filter((q) => q.verdict === 'wrong');
  const skipped = questions.filter((q) => q.verdict === 'skipped');
  const attempted = correct.length + wrong.length;

  const sum = (list: AnalysedQuestion[]) => list.reduce((acc, q) => acc + q.timeMs, 0);
  const timeMs = sum(questions);

  const positive = correct.length * MARKS_CORRECT;
  const lost = Math.abs(wrong.length * MARKS_WRONG);

  const totals: Totals = {
    asked: questions.length,
    attempted,
    correct: correct.length,
    wrong: wrong.length,
    skipped: skipped.length,
    accuracyPct: pct(correct.length, attempted),
    score: positive - lost,
    maxScore: questions.length * MARKS_CORRECT,
    positive,
    lost,
    timeMs,
    avgMs: questions.length ? Math.round(timeMs / questions.length) : 0,
  };

  const bands: BandRow[] = BAND_ORDER.map((band) => {
    const inBand = questions.filter((q) => q.band === band);
    const c = inBand.filter((q) => q.verdict === 'correct').length;
    const w = inBand.filter((q) => q.verdict === 'wrong').length;
    const s = inBand.filter((q) => q.verdict === 'skipped').length;
    return {
      band,
      asked: inBand.length,
      correct: c,
      wrong: w,
      skipped: s,
      accuracyPct: pct(c, c + w),
      avgMs: inBand.length ? Math.round(sum(inBand) / inBand.length) : 0,
    };
  }).filter((row) => row.asked > 0);

  const topicMap = new Map<string, TopicRow>();
  for (const q of questions) {
    const key = `${q.chapter}||${q.topic}`;
    const row =
      topicMap.get(key) ||
      ({ key, chapter: q.chapter, topic: q.topic, asked: 0, correct: 0, accuracyPct: 0, timeMs: 0 } as TopicRow);
    row.asked += 1;
    if (q.verdict === 'correct') row.correct += 1;
    row.timeMs += q.timeMs;
    topicMap.set(key, row);
  }
  const topics = [...topicMap.values()].map((row) => {
    const attemptedHere = questions.filter(
      (q) => `${q.chapter}||${q.topic}` === row.key && q.verdict !== 'skipped'
    ).length;
    return { ...row, accuracyPct: pct(row.correct, attemptedHere) };
  });
  topics.sort((a, b) => a.accuracyPct - b.accuracyPct || b.asked - a.asked);

  const quality: QualityCounts = {
    perfect: questions.filter((q) => q.quality === 'perfect').length,
    wasted: questions.filter((q) => q.quality === 'wasted').length,
    overtime: questions.filter((q) => q.quality === 'overtime').length,
    confused: questions.filter((q) => q.quality === 'confused').length,
    left: questions.filter((q) => q.quality === 'left').length,
  };

  const timeSplit: TimeSplit = {
    correctMs: sum(correct),
    wrongMs: sum(wrong),
    skippedMs: sum(skipped),
  };

  // Every wrong answer is worth five marks: the four it did not earn and the one
  // it gave back. Skips are left out — "if you had not erred" is a claim about
  // errors, and counting untouched questions as free marks flatters the number
  // into meaninglessness.
  const swing = MARKS_CORRECT - MARKS_WRONG;
  const potential = {
    actual: totals.score,
    halfError: totals.score + Math.floor(wrong.length / 2) * swing,
    noError: totals.score + wrong.length * swing,
    max: totals.maxScore,
  };

  const durationMs =
    meta.durationSeconds != null
      ? meta.durationSeconds * 1000
      : meta.startedAt && meta.endedAt
        ? Math.max(0, new Date(meta.endedAt).getTime() - new Date(meta.startedAt).getTime())
        : timeMs;

  return {
    sessionId,
    startedAt: meta.startedAt,
    endedAt: meta.endedAt,
    durationMs,
    chapterTitle: meta.chapterTitle,
    questions,
    totals,
    bands,
    topics,
    quality,
    timeSplit,
    potential,
    shape: shapeOf(questions),
    insights: insightsFrom(questions, totals, bands, topics, quality, timeSplit, meta.skipsKnown),
    skipsKnown: meta.skipsKnown,
  };
}

/** The run read as a climb: where it opened, how high it got, how often it moved. */
function shapeOf(questions: AnalysedQuestion[]): JourneyShape | null {
  if (questions.length === 0) return null;

  const rank = (b: Band) => BAND_ORDER.indexOf(b);
  const opened = questions[0].band;
  const closed = questions[questions.length - 1].band;

  let peak = opened;
  let swings = 0;
  let bestRun = 0;
  let run = 0;

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    if (rank(q.band) > rank(peak)) peak = q.band;
    if (i > 0 && q.band !== questions[i - 1].band) swings += 1;
    if (q.verdict === 'correct') {
      run += 1;
      if (run > bestRun) bestRun = run;
    } else {
      run = 0;
    }
  }

  const delta = rank(closed) - rank(opened);
  return {
    peak,
    opened,
    closed,
    swings,
    bestRun,
    direction: delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat',
  };
}

function minutes(ms: number): string {
  const m = Math.round(ms / 60000);
  return m <= 0 ? 'under a minute' : `${m} min`;
}

/**
 * The sentences the summary screen reads out, worst first.
 *
 * Each one is a rule over the run, not a model call. They are written to say
 * what happened and what it cost, because "your accuracy was 62%" is a number
 * the student can already see at the top of the screen.
 */
function insightsFrom(
  questions: AnalysedQuestion[],
  totals: Totals,
  bands: BandRow[],
  topics: TopicRow[],
  quality: QualityCounts,
  timeSplit: TimeSplit,
  skipsKnown: boolean
): string[] {
  const out: string[] = [];

  if (quality.wasted >= 2) {
    out.push(
      `${quality.wasted} answers were wrong inside half the time they deserved. Fast and wrong is a guess, and each one cost ${Math.abs(MARKS_WRONG)} mark.`
    );
  }

  if (quality.overtime >= 2) {
    out.push(
      `${quality.overtime} questions ran over their time. That is ${minutes(
        questions.filter((q) => q.quality === 'overtime').reduce((a, q) => a + (q.timeMs - q.idealMs), 0)
      )} spent past the point where moving on was the better trade.`
    );
  }

  if (quality.confused >= 1 && skipsKnown) {
    out.push(
      `${quality.confused} question${quality.confused === 1 ? ' was' : 's were'} left after going over time — read, worked, and abandoned. Leaving those early is worth ${minutes(
        timeSplit.skippedMs
      )}.`
    );
  }

  const weakest = bands.filter((b) => b.asked >= 2).sort((a, b) => a.accuracyPct - b.accuracyPct)[0];
  const strongest = bands
    .filter((b) => b.asked >= 2)
    .sort((a, b) => b.accuracyPct - a.accuracyPct)[0];

  if (weakest && strongest && weakest.band !== strongest.band && weakest.accuracyPct < strongest.accuracyPct) {
    out.push(
      `${BAND_LABEL[weakest.band]} questions came out at ${weakest.accuracyPct}% against ${strongest.accuracyPct}% on ${BAND_LABEL[
        strongest.band
      ].toLowerCase()} ones. That gap is where the next session belongs.`
    );
  }

  const worstTopic = topics.filter((t) => t.asked >= 2)[0];
  if (worstTopic && worstTopic.accuracyPct < 60) {
    out.push(
      `${worstTopic.topic} is the weakest thing you touched — ${worstTopic.correct} of ${worstTopic.asked}, at ${minutes(
        worstTopic.timeMs
      )}.`
    );
  }

  if (totals.lost > 0) {
    out.push(
      `Negative marking took ${totals.lost} of your ${totals.positive}. Your net was ${totals.score} out of ${totals.maxScore}.`
    );
  }

  if (quality.perfect === totals.asked && totals.asked > 0) {
    out.push('Every question was correct and inside its time. Nothing to fix — take a harder set.');
  }

  return out;
}

// ── Writing the session back ─────────────────────────────────────────────────

/**
 * Closes the `sessions` row when a run finishes.
 *
 * The engine opens the row and never returns to it, so `ended_at`,
 * `questions_answered`, `correct_count` and `duration_seconds` have been NULL on
 * every session ever recorded. Nothing read them before, which is why it went
 * unnoticed; the analysis reads `duration_seconds` for wall-clock time, and
 * without this it would have to fall back to summed question time and quietly
 * under-report every run by however long the student sat thinking between them.
 *
 * Never throws: a session that fails to close still has all its answer events,
 * so the analysis is complete either way.
 */
export async function completeSession(
  sessionId: string,
  stats: { questionsAnswered: number; correctCount: number; durationSeconds: number }
): Promise<void> {
  try {
    await supabase
      .from('sessions')
      .update({
        status: 'completed',
        ended_at: new Date().toISOString(),
        questions_answered: stats.questionsAnswered,
        correct_count: stats.correctCount,
        duration_seconds: stats.durationSeconds,
      })
      .eq('id', sessionId);
  } catch (e) {
    console.warn('Could not close session:', e);
  }
}

/** Recent finished sessions, for opening an old analysis from history. */
export async function fetchRecentSessions(limit = 20) {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const userId = session?.user?.id;
  if (!userId) return [];

  const { data, error } = await supabase
    .from('sessions')
    .select('id, started_at, ended_at, questions_answered, correct_count, duration_seconds, config')
    .eq('user_id', userId)
    .order('started_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.warn('Could not load sessions:', error.message);
    return [];
  }
  return data || [];
}
