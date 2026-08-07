import { supabase } from '../lib/supabase';
import { EngineApi } from './api';
import { fetchChallengeActivityDays } from './challengesApi';

// Everything the Home tab shows is derived from `answer_events` + the taxonomy
// tables, so the screen stays live even when the FastAPI engine is not running
// (the engine only ever *overrides* the insight strings — see mergeEngineInsights).

const LOOKBACK_DAYS = 90;
const MAX_EVENTS = 3000;
const SCORE_WINDOW_DAYS = 30;
const CONTINUE_LIMIT = 3;

/**
 * The daily goal the week strip marks against. Questions decide whether a day
 * counts as done; the minute target is a second counter shown alongside it.
 * Both are fixed for now — there is no per-user goal anywhere in the schema.
 */
export const DAILY_GOAL_QUESTIONS = 20;
export const DAILY_GOAL_MINUTES = 30;

/** Attempts on a topic before it counts as "covered" for syllabus completion. */
const TOPIC_COVERED_AT = 3;
/** Questions in the scoring window that saturate the volume factor. */
const VOLUME_TARGET = 300;
/** Active days in the scoring window that saturate the consistency factor. */
const CONSISTENCY_TARGET = 21;

export interface ContinueChapter {
  chapterId: string;
  name: string;
  subject: string;
  masteryPct: number;
  questionsSolved: number;
  minutesSpent: number;
  lastPracticedAt: string | null;
}

/**
 * Where a card sends you when it is tapped. Resolved to a navigation call by the
 * Home screen — the service layer names the destination, it does not know the
 * route graph.
 */
export type HomeAction =
  | { kind: 'practice'; subject?: string | null }
  | { kind: 'chapter'; chapterId: string; chapterName: string; subject: string | null }
  | { kind: 'streak' }
  | { kind: 'arena' }
  | { kind: 'leaderboard' };

export interface HomeInsight {
  id: string;
  title: string;
  text: string;
  /** Every insight is tappable; this says where it goes. */
  action: HomeAction;
}

/**
 * `met` hit the goal, `partial` practised but fell short, `missed` did nothing,
 * `today` is still in play, `future` has not happened yet.
 */
export type DayStatus = 'met' | 'partial' | 'missed' | 'today' | 'future';

export interface DayProgress {
  key: string;
  /** 'Sun'…'Sat'. */
  label: string;
  /** Day of the month. */
  dateNum: number;
  questions: number;
  minutes: number;
  status: DayStatus;
  /** Fraction of the question goal, 0–1. */
  progress: number;
  /** Separate from `status`, which flips to `met` the moment the goal is hit. */
  isToday: boolean;
}

export interface HomeSnapshot {
  /** First name where we have one. Never a generated `user_xxxx` handle. */
  displayName: string | null;
  readinessScore: number;
  readinessBand: string;
  readinessDelta: number | null;
  consistencyScore: number;
  consistencyCaption: string;
  coverageScore: number;
  coverageCaption: string;
  streakDays: number;
  questionsToday: number;
  minutesToday: number;
  /** Recent accuracy, or null when there is nothing to average yet. */
  accuracyPct: number | null;
  /** The current week, Sunday first, for the daily-goal strip. */
  week: DayProgress[];
  insights: HomeInsight[];
  continueChapters: ContinueChapter[];
  hasActivity: boolean;
}

interface QuestionRef {
  chapter_id: string | null;
  concept_id: string | null;
  subject: string | null;
}

interface EventRow {
  is_correct: boolean;
  time_taken_ms: number | null;
  answered_at: string;
  question_id: string;
  questions: QuestionRef | null;
}

// ─── date helpers (device-local, so "today" matches the student's day) ────────

const DAY_MS = 24 * 60 * 60 * 1000;

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function addDays(d: Date, days: number): Date {
  return new Date(d.getTime() + days * DAY_MS);
}

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

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

function formatDuration(ms: number): string {
  const hrs = Math.floor(ms / 3600000);
  const mins = Math.floor(ms / 60000) % 60;
  if (hrs === 0) return `${mins}min${mins === 1 ? '' : 's'}`;
  return `${hrs}hr${hrs === 1 ? '' : 's'} ${mins}min${mins === 1 ? '' : 's'}`;
}

function titleCase(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Profiles created by the auth trigger get an auto-generated handle like
 * `user_7421c8f0`. Greeting someone by a system ID reads as unfinished, so a
 * generated handle is treated as "no name" and the greeting drops the name line.
 */
function presentableName(username: string | null | undefined, authUser?: any): string | null {
  // A Google sign-in carries a real name; prefer the first name over any handle.
  const meta = authUser?.user_metadata ?? {};
  const given = meta.given_name || meta.name || meta.full_name;
  if (typeof given === 'string' && given.trim()) return given.trim().split(/\s+/)[0];

  if (!username) return null;
  if (/^user[_-]?[0-9a-f]{6,}$/i.test(username.trim())) return null;
  return username;
}

// ─── scoring ─────────────────────────────────────────────────────────────────

interface WindowStats {
  answered: number;
  correct: number;
  ms: number;
  activeDays: number;
}

function statsForWindow(events: EventRow[], from: Date, to: Date): WindowStats {
  const days = new Set<string>();
  let answered = 0;
  let correct = 0;
  let ms = 0;

  for (const e of events) {
    const at = new Date(e.answered_at);
    if (at < from || at >= to) continue;
    answered += 1;
    if (e.is_correct) correct += 1;
    ms += e.time_taken_ms || 0;
    days.add(dayKey(at));
  }

  return { answered, correct, ms, activeDays: days.size };
}

/**
 * HudJee Performance Score, 0–100. A weighted blend of how well (accuracy), how
 * much (volume), how regularly (consistency) and how deeply (mastery) the
 * student has practised in the 30 days before `asOf`.
 */
function computeScore(events: EventRow[], asOf: Date, masteryAvg: number): number {
  const to = addDays(startOfDay(asOf), 1);
  const from = addDays(to, -SCORE_WINDOW_DAYS);
  const w = statsForWindow(events, from, to);

  if (w.answered === 0) return 0;

  const accuracy = w.correct / w.answered;
  const volume = clamp(w.answered / VOLUME_TARGET, 0, 1);
  const consistency = clamp(w.activeDays / CONSISTENCY_TARGET, 0, 1);
  const mastery = clamp(masteryAvg / 100, 0, 1);

  return Math.round(
    100 * (accuracy * 0.4 + volume * 0.25 + consistency * 0.2 + mastery * 0.15)
  );
}

function bandFor(score: number): string {
  if (score >= 85) return 'Exam ready';
  if (score >= 70) return 'Strong';
  if (score >= 50) return 'On track';
  if (score >= 25) return 'Building momentum';
  if (score > 0) return 'Getting started';
  return 'No data yet';
}

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/**
 * The calendar week containing `now`, Sunday first, with each day marked against
 * the question goal. Future days are reported as such rather than as misses —
 * a Wednesday cannot be failed on Monday.
 */
function buildWeek(events: EventRow[], now: Date): DayProgress[] {
  const today = startOfDay(now);
  const weekStart = addDays(today, -now.getDay());
  const todayKey = dayKey(today);

  return WEEKDAY_LABELS.map((label, i) => {
    const date = addDays(weekStart, i);
    const stats = statsForWindow(events, date, addDays(date, 1));
    const key = dayKey(date);
    const isToday = key === todayKey;
    const isFuture = date.getTime() > today.getTime();

    let status: DayStatus;
    if (stats.answered >= DAILY_GOAL_QUESTIONS) status = 'met';
    else if (isToday) status = 'today';
    else if (isFuture) status = 'future';
    else if (stats.answered > 0) status = 'partial';
    else status = 'missed';

    return {
      key,
      label,
      dateNum: date.getDate(),
      questions: stats.answered,
      minutes: Math.round(stats.ms / 60000),
      status,
      progress: clamp(stats.answered / DAILY_GOAL_QUESTIONS, 0, 1),
      isToday,
    };
  });
}

/** Consecutive practice days ending today (or yesterday, if today is still empty). */
function computeStreak(dayKeys: Set<string>, now: Date): number {
  if (dayKeys.size === 0) return 0;

  let cursor = startOfDay(now);
  if (!dayKeys.has(dayKey(cursor))) {
    cursor = addDays(cursor, -1);
    if (!dayKeys.has(dayKey(cursor))) return 0;
  }

  let streak = 0;
  while (dayKeys.has(dayKey(cursor))) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

// ─── insights ────────────────────────────────────────────────────────────────

/** The weakest topic, with enough of its parent chapter to navigate there. */
interface WeakTopic {
  name: string;
  chapterId: string | null;
  chapterName: string | null;
  subject: string | null;
}

interface InsightInput {
  events: EventRow[];
  now: Date;
  streak: number;
  weakestTopic: WeakTopic | null;
}

function buildInsights({ events, now, streak, weakestTopic }: InsightInput): HomeInsight[] {
  const today = startOfDay(now);
  const yesterday = addDays(today, -1);
  const week = statsForWindow(events, addDays(today, -7), addDays(today, 1));
  const prevWeek = statsForWindow(events, addDays(today, -14), addDays(today, -7));
  const month = statsForWindow(events, addDays(today, -30), addDays(today, 1));
  const yday = statsForWindow(events, yesterday, today);

  const out: HomeInsight[] = [];

  // 1. Time invested
  const avgMs = month.activeDays ? month.ms / month.activeDays : 0;
  if (yday.ms === 0) {
    out.push({
      id: 'time',
      title: 'Time Invested',
      text: "No practice yesterday — let's bounce back today",
      action: { kind: 'practice' },
    });
  } else {
    let tail = ' — right on track with your average';
    if (yday.ms > avgMs * 1.1) tail = ' — above your usual day';
    else if (yday.ms < avgMs * 0.9) tail = ' — a little under your usual day';
    out.push({
      id: 'time',
      title: 'Time Invested',
      text: `${formatDuration(yday.ms)} yesterday${tail}`,
      action: { kind: 'streak' },
    });
  }

  // 2. Streak
  out.push({
    id: 'streak',
    title: 'Streak',
    text: streak > 0 ? `${streak}-day streak — keep it going` : 'No streak yet — one session starts it',
    action: { kind: 'streak' },
  });

  // 3. Strongest subject (last 7 days, then last 30 as a fallback)
  const subjectSource = week.answered >= 5 ? addDays(today, -7) : addDays(today, -30);
  const subjectStats = new Map<string, { correct: number; total: number }>();
  for (const e of events) {
    const at = new Date(e.answered_at);
    if (at < subjectSource) continue;
    const subject = e.questions?.subject;
    if (!subject) continue;
    const s = subjectStats.get(subject) || { correct: 0, total: 0 };
    s.total += 1;
    if (e.is_correct) s.correct += 1;
    subjectStats.set(subject, s);
  }
  const ranked = [...subjectStats.entries()]
    .filter(([, s]) => s.total >= 3)
    .sort((a, b) => b[1].correct / b[1].total - a[1].correct / a[1].total);
  if (ranked.length > 0) {
    const [name, s] = ranked[0];
    out.push({
      id: 'subject',
      title: 'Leading Subject',
      text: `${titleCase(name)} is leading at ${pct(s.correct, s.total)}% accuracy`,
      // Opens the chapter list already switched to that subject.
      action: { kind: 'practice', subject: name },
    });
  } else {
    out.push({
      id: 'subject',
      title: 'Leading Subject',
      text: 'Practise a few more questions to reveal your leading subject',
      action: { kind: 'practice' },
    });
  }

  // 4. Needs attention
  if (weakestTopic) {
    out.push({
      id: 'attention',
      title: 'Needs Attention',
      text: `${weakestTopic.name} could use another pass`,
      // Lands on the chapter that holds the topic, so the fix is one tap away.
      action:
        weakestTopic.chapterId && weakestTopic.chapterName
          ? {
              kind: 'chapter',
              chapterId: weakestTopic.chapterId,
              chapterName: weakestTopic.chapterName,
              subject: weakestTopic.subject,
            }
          : { kind: 'practice', subject: weakestTopic.subject },
    });
  }

  // 5. Accuracy trend
  if (week.answered >= 5 && prevWeek.answered >= 5) {
    const delta = pct(week.correct, week.answered) - pct(prevWeek.correct, prevWeek.answered);
    let text = `Accuracy held steady at ${pct(week.correct, week.answered)}% this week`;
    if (delta > 0) text = `Accuracy up ${delta} points this week`;
    else if (delta < 0) text = `Accuracy down ${Math.abs(delta)} points this week`;
    out.push({ id: 'trend', title: 'Accuracy Trend', text, action: { kind: 'practice' } });
  }

  // 6. Volume
  if (week.answered > 0) {
    out.push({
      id: 'volume',
      title: 'This Week',
      text: `${week.answered} question${week.answered === 1 ? '' : 's'} across ${week.activeDays} day${
        week.activeDays === 1 ? '' : 's'
      }`,
      action: { kind: 'streak' },
    });
  }

  return out;
}

/**
 * The engine computes richer versions of some insights (arena movement, social
 * rank) that need data we cannot reach from the client. When it answers, its
 * strings win; when it does not, the locally derived ones stand on their own.
 */
function mergeEngineInsights(local: HomeInsight[], engine: any): HomeInsight[] {
  if (!engine) return local;

  const overrides: Record<string, string | null | undefined> = {
    time: engine.time_invested_insight,
    streak: engine.streak_insight,
    subject: engine.strongest_subject_insight,
    attention: engine.needs_attention_insight,
  };

  const merged = local.map((card) => {
    const override = overrides[card.id];
    return override ? { ...card, text: override } : card;
  });

  if (engine.arena_movement_insight) {
    merged.push({
      id: 'arena',
      title: 'Arena Movement',
      text: engine.arena_movement_insight,
      action: { kind: 'arena' },
    });
  }
  if (engine.social_rank_insight) {
    merged.push({
      id: 'social',
      title: 'Social',
      text: engine.social_rank_insight,
      action: { kind: 'leaderboard' },
    });
  }

  return merged;
}

// ─── main fetch ──────────────────────────────────────────────────────────────

export async function fetchHomeSnapshot(userId: string, authUser?: any): Promise<HomeSnapshot> {
  const now = new Date();
  const since = addDays(startOfDay(now), -LOOKBACK_DAYS).toISOString();

  const [profileRes, eventsRes, sessionsRes, conceptStateRes, cpsRes, topicCountRes] = await Promise.all([
    supabase.from('profiles').select('username').eq('id', userId).maybeSingle(),
    supabase
      .from('answer_events')
      .select('is_correct, time_taken_ms, answered_at, question_id, questions(chapter_id, concept_id, subject)')
      .eq('user_id', userId)
      .gte('answered_at', since)
      .order('answered_at', { ascending: false })
      .limit(MAX_EVENTS),
    supabase
      .from('sessions')
      .select('config, started_at')
      .eq('user_id', userId)
      .order('started_at', { ascending: false })
      .limit(50),
    supabase.from('user_concept_state').select('concept_id, theta').eq('user_id', userId),
    supabase
      .from('cps_scores')
      .select('score, valid_for_date')
      .eq('user_id', userId)
      .order('valid_for_date', { ascending: false })
      .limit(14),
    supabase.from('topics').select('id', { count: 'exact', head: true }),
  ]);

  if (eventsRes.error) throw eventsRes.error;

  // PostgREST returns the embedded to-one row as an object; the generated types
  // widen it to an array, hence the cast.
  const events = ((eventsRes.data || []) as unknown as EventRow[]).filter((e) => e.answered_at);

  // ── per-chapter rollup ──
  interface ChapterAgg {
    solved: number;
    correct: number;
    ms: number;
    last: string;
  }
  const chapterAgg = new Map<string, ChapterAgg>();
  const conceptAgg = new Map<string, { correct: number; total: number }>();
  const dayKeys = new Set<string>();

  for (const e of events) {
    dayKeys.add(dayKey(new Date(e.answered_at)));

    const chapterId = e.questions?.chapter_id;
    if (chapterId) {
      const agg = chapterAgg.get(chapterId) || { solved: 0, correct: 0, ms: 0, last: e.answered_at };
      agg.solved += 1;
      if (e.is_correct) agg.correct += 1;
      agg.ms += e.time_taken_ms || 0;
      if (e.answered_at > agg.last) agg.last = e.answered_at;
      chapterAgg.set(chapterId, agg);
    }

    const conceptId = e.questions?.concept_id;
    if (conceptId) {
      const c = conceptAgg.get(conceptId) || { correct: 0, total: 0 };
      c.total += 1;
      if (e.is_correct) c.correct += 1;
      conceptAgg.set(conceptId, c);
    }
  }

  // Most recently practised chapters, topped up with chapters that were started
  // but have no answers yet (or whose questions have since been unpublished).
  const recentChapterIds = [...chapterAgg.entries()]
    .sort((a, b) => (a[1].last < b[1].last ? 1 : -1))
    .slice(0, CONTINUE_LIMIT)
    .map(([id]) => id);

  for (const row of (sessionsRes.data || []) as any[]) {
    if (recentChapterIds.length >= CONTINUE_LIMIT) break;
    let config = row.config;
    if (typeof config === 'string') {
      try {
        config = JSON.parse(config);
      } catch {
        config = null;
      }
    }
    const chapterId = config?.chapter_id;
    if (chapterId && !recentChapterIds.includes(chapterId)) recentChapterIds.push(chapterId);
  }

  // ── mastery state ──
  const masteryByConcept = new Map<string, number>();
  for (const row of (conceptStateRes.data || []) as any[]) {
    if (row.concept_id != null) masteryByConcept.set(row.concept_id, thetaToMastery(row.theta ?? 0));
  }
  const masteryValues = [...masteryByConcept.values()];
  const masteryAvg = masteryValues.length
    ? masteryValues.reduce((a, b) => a + b, 0) / masteryValues.length
    : 0;

  // ── chapter metadata ──
  const continueChapters: ContinueChapter[] = [];
  if (recentChapterIds.length > 0) {
    const [chaptersRes, topicsRes] = await Promise.all([
      supabase.from('chapters').select('id, name, subject').in('id', recentChapterIds),
      supabase.from('topics').select('id, chapter_id').in('chapter_id', recentChapterIds),
    ]);

    const chapterMeta = new Map<string, { name: string; subject: string }>();
    for (const c of (chaptersRes.data || []) as any[]) {
      chapterMeta.set(c.id, { name: c.name, subject: c.subject });
    }

    const topicsByChapter = new Map<string, string[]>();
    for (const t of (topicsRes.data || []) as any[]) {
      const list = topicsByChapter.get(t.chapter_id) || [];
      list.push(t.id);
      topicsByChapter.set(t.chapter_id, list);
    }

    for (const chapterId of recentChapterIds) {
      const meta = chapterMeta.get(chapterId);
      if (!meta) continue; // chapter deleted since the session ran
      const agg = chapterAgg.get(chapterId);
      const topicIds = topicsByChapter.get(chapterId) || [];

      // Mastery counts untouched topics as zero, so it reads as chapter coverage
      // rather than "accuracy on the handful of topics you happened to open".
      let masteryPct: number;
      const scored = topicIds.filter((id) => masteryByConcept.has(id));
      if (topicIds.length > 0 && scored.length > 0) {
        const sum = scored.reduce((acc, id) => acc + (masteryByConcept.get(id) || 0), 0);
        masteryPct = clamp(Math.round(sum / topicIds.length), 0, 100);
      } else {
        masteryPct = agg ? pct(agg.correct, agg.solved) : 0;
      }

      continueChapters.push({
        chapterId,
        name: meta.name,
        subject: meta.subject,
        masteryPct,
        questionsSolved: agg?.solved || 0,
        minutesSpent: Math.round((agg?.ms || 0) / 60000),
        lastPracticedAt: agg?.last || null,
      });
    }
  }

  // ── weakest topic, for the "Needs Attention" card ──
  // The parent chapter comes along so the card can navigate there rather than
  // naming a topic the student then has to go and find.
  let weakestTopic: WeakTopic | null = null;
  const weakCandidates = [...conceptAgg.entries()]
    .filter(([, s]) => s.total >= 3 && s.correct / s.total < 0.6)
    .sort((a, b) => a[1].correct / a[1].total - b[1].correct / b[1].total);
  if (weakCandidates.length > 0) {
    const { data } = await supabase
      .from('topics')
      .select('name, chapter_id, chapters(name, subject)')
      .eq('id', weakCandidates[0][0])
      .maybeSingle();
    const row = data as any;
    if (row?.name) {
      // PostgREST returns the embedded to-one row as an object; older generated
      // types widen it to an array, so handle both shapes.
      const chapter = Array.isArray(row.chapters) ? row.chapters[0] : row.chapters;
      weakestTopic = {
        name: row.name,
        chapterId: row.chapter_id ?? null,
        chapterName: chapter?.name ?? null,
        subject: chapter?.subject ?? null,
      };
    }
  }

  // ── headline numbers ──
  const today = startOfDay(now);
  const todayStats = statsForWindow(events, today, addDays(today, 1));
  const weekStats = statsForWindow(events, addDays(today, -7), addDays(today, 1));
  const monthStats = statsForWindow(events, addDays(today, -30), addDays(today, 1));

  // A handful of answers is too thin to call an accuracy, so a quiet week falls
  // back to the month rather than reporting 0% or 100% off two questions.
  const accuracySource = weekStats.answered >= 5 ? weekStats : monthStats;
  const accuracyPct =
    accuracySource.answered > 0 ? pct(accuracySource.correct, accuracySource.answered) : null;

  // Finishing a challenge set counts as a day the student showed up, even though
  // challenges deliberately write no `answer_event` — their shared fixed pool
  // must not move mastery, coverage or readiness. So the streak, and only the
  // streak, folds those days in; the goal strip above stays practice volume.
  try {
    for (const at of await fetchChallengeActivityDays(userId, since)) {
      dayKeys.add(dayKey(new Date(at)));
    }
  } catch {
    // Streak falls back to practice activity alone rather than taking Home down.
  }

  const streakDays = computeStreak(dayKeys, now);

  const cpsRows = (cpsRes.data || []) as any[];
  let readinessScore: number;
  let readinessDelta: number | null = null;

  if (cpsRows.length > 0) {
    // cps_scores is 0–1000; the card speaks in 0–100.
    readinessScore = clamp(Math.round((cpsRows[0].score ?? 0) / 10), 0, 100);
    const weekAgo = cpsRows.find(
      (r) => new Date(r.valid_for_date).getTime() <= addDays(today, -7).getTime()
    );
    if (weekAgo) readinessDelta = readinessScore - clamp(Math.round((weekAgo.score ?? 0) / 10), 0, 100);
  } else {
    readinessScore = computeScore(events, now, masteryAvg);
    const lastWeekScore = computeScore(events, addDays(now, -7), masteryAvg);
    if (monthStats.answered > 0) readinessDelta = readinessScore - lastWeekScore;
  }

  const totalTopics = topicCountRes.count || 0;
  const coveredTopics = [...conceptAgg.values()].filter((s) => s.total >= TOPIC_COVERED_AT).length;

  // ── insights ──
  let engineSummary: any = null;
  try {
    engineSummary = await EngineApi.getDashboardSummary();
  } catch {
    engineSummary = null;
  }
  const insights = mergeEngineInsights(
    buildInsights({ events, now, streak: streakDays, weakestTopic }),
    // The mock fallback inside getDashboardSummary returns placeholder copy, so
    // only trust the engine when it really answered with computed values.
    engineSummary && engineSummary.__mock ? null : engineSummary
  );

  return {
    displayName: presentableName((profileRes.data as any)?.username, authUser),
    readinessScore,
    readinessBand: bandFor(readinessScore),
    readinessDelta,
    // Consistency measures how regularly you show up, not how often you are
    // right — accuracy already drives the readiness score and the trend insight.
    consistencyScore: pct(monthStats.activeDays, SCORE_WINDOW_DAYS),
    // Captions sit in a narrow half-width card — keep them short enough to fit
    // two lines without clipping.
    consistencyCaption: monthStats.activeDays
      ? `${monthStats.activeDays} of last 30 days`
      : 'No practice yet',
    coverageScore: pct(coveredTopics, totalTopics),
    coverageCaption: totalTopics
      ? `${coveredTopics}/${totalTopics} topics covered`
      : 'Syllabus empty',
    streakDays,
    questionsToday: todayStats.answered,
    minutesToday: Math.round(todayStats.ms / 60000),
    accuracyPct,
    week: buildWeek(events, now),
    insights,
    continueChapters,
    hasActivity: events.length > 0,
  };
}
