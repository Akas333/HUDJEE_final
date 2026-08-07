import { supabase } from '../lib/supabase';
import { DifficultyTier } from '../theme/challenges';
import { SubjectKey } from '../theme/subjects';

// The client half of the Challenges tab. Everything here talks to Supabase
// directly and nothing talks to the FastAPI engine — by design. A challenge set
// is a frozen, shared question pool that bypasses the personal never-repeat rule
// and can re-serve a question the student has already mastered, so letting it
// touch theta or `answer_events` would quietly corrupt the adaptive layer. The
// only thing challenges write is their own record.

const STREAK_LOOKBACK_DAYS = 120;
const CALENDAR_DAYS = 35;

// ─── types ───────────────────────────────────────────────────────────────────

export type ChallengeSource = 'single_question' | 'question_set';
export type MatchStatus =
  | 'pending'
  | 'accepted'
  | 'in_progress'
  | 'completed'
  | 'declined'
  | 'expired'
  | 'void';
export type AttemptStatus = 'not_started' | 'in_progress' | 'completed' | 'dnf';
export type ChallengeOutcome = 'won' | 'lost' | 'draw';

export interface PublicProfile {
  userId: string;
  username: string;
  level: number;
  totalXp: number;
  currentStreak: number;
}

export interface Friend extends PublicProfile {
  /** The friendship row, so accept/remove does not have to look it up again. */
  friendshipId: string;
  status: 'pending' | 'accepted' | 'blocked';
  /** Who sent the request — an incoming pending row is the one you can accept. */
  incoming: boolean;
  muted: boolean;
}

export interface ChallengeAnswer {
  question_id: string;
  correct: boolean;
  time_ms: number;
}

export interface ChallengeAttempt {
  userId: string;
  status: AttemptStatus;
  answers: ChallengeAnswer[];
  correctCount: number;
  totalTimeMs: number;
  longestStreak: number;
  completedAt: string | null;
}

export interface ChallengeMatch {
  id: string;
  senderId: string;
  opponentId: string;
  source: ChallengeSource;
  chapterId: string | null;
  chapterName: string | null;
  subject: SubjectKey | null;
  questionIds: string[];
  tier: DifficultyTier;
  timerType: 'per_question' | 'total_budget';
  timerSeconds: number;
  status: MatchStatus;
  expiresAt: string;
  createdAt: string;
  completedAt: string | null;

  // ── resolved for the current user ──
  /** True when the signed-in user created this challenge. */
  isSender: boolean;
  opponent: PublicProfile | null;
  myAttempt: ChallengeAttempt | null;
  theirAttempt: ChallengeAttempt | null;
  /** Past its window, whatever the stored status says. */
  windowClosed: boolean;
}

export interface StreakDay {
  key: string;
  date: string;
  active: boolean;
  isToday: boolean;
  isFuture: boolean;
}

export interface StreakState {
  current: number;
  longest: number;
  /** Nothing logged today, and the day is not over yet. */
  atRisk: boolean;
  activeToday: boolean;
  calendar: StreakDay[];
}

export interface LeaderboardRow {
  userId: string;
  username: string;
  questions: number;
  accuracyPct: number;
  activeDays: number;
  isSelf: boolean;
  rank: number;
}

export interface HeadToHead {
  wins: number;
  losses: number;
  draws: number;
}

export interface ChallengeQuestion {
  id: string;
  prompt: string;
  options: string[];
  /** Resolved client-side, the same way Practice and Arena resolve it. */
  correctIndex: number;
}

// ─── helpers ─────────────────────────────────────────────────────────────────

const DAY_MS = 86400000;

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function addDays(d: Date, days: number): Date {
  return new Date(d.getTime() + days * DAY_MS);
}

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

export async function currentUserId(): Promise<string> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const userId = session?.user?.id;
  if (!userId) {
    // Every challenge is addressed between two real accounts; there is no
    // anonymous seat at this table.
    throw new Error('Sign in to use Challenges.');
  }
  return userId;
}

/** Handles the auth trigger generated (`user_7421c8f0`) read as no name at all. */
export function displayName(username: string | null | undefined): string {
  if (!username) return 'Someone';
  if (/^user[_-]?[0-9a-f]{6,}$/i.test(username.trim())) return 'HudJee student';
  return username;
}

/** The two initials the avatar disc shows. */
export function initialsOf(username: string | null | undefined): string {
  const name = displayName(username);
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function toProfile(row: any): PublicProfile {
  return {
    userId: row.id,
    username: row.username || '',
    level: row.level ?? 1,
    totalXp: row.total_xp ?? 0,
    currentStreak: row.current_streak ?? 0,
  };
}

function toAttempt(row: any): ChallengeAttempt {
  return {
    userId: row.user_id,
    status: row.status,
    answers: Array.isArray(row.answers) ? row.answers : [],
    correctCount: row.correct_count ?? 0,
    totalTimeMs: Number(row.total_time_ms ?? 0),
    longestStreak: row.longest_streak ?? 0,
    completedAt: row.completed_at ?? null,
  };
}

/**
 * Who won, decided identically everywhere it is asked: more correct, then less
 * time, else a draw. Someone who never finished cannot win a challenge the other
 * side completed.
 */
export function outcomeOf(match: ChallengeMatch): ChallengeOutcome | null {
  const mine = match.myAttempt;
  const theirs = match.theirAttempt;

  const iFinished = !!mine?.completedAt;
  const theyFinished = !!theirs?.completedAt;

  if (!iFinished && !theyFinished) return null;
  if (iFinished && !theyFinished) return match.windowClosed ? 'won' : null;
  if (!iFinished && theyFinished) return match.windowClosed ? 'lost' : null;

  if (mine!.correctCount > theirs!.correctCount) return 'won';
  if (mine!.correctCount < theirs!.correctCount) return 'lost';
  if (mine!.totalTimeMs < theirs!.totalTimeMs) return 'won';
  if (mine!.totalTimeMs > theirs!.totalTimeMs) return 'lost';
  return 'draw';
}

/** Whether the head-to-head comparison may be shown yet. */
export function resultsUnlocked(match: ChallengeMatch): boolean {
  const bothIn = !!match.myAttempt?.completedAt && !!match.theirAttempt?.completedAt;
  return bothIn || (match.windowClosed && !!(match.myAttempt?.completedAt || match.theirAttempt?.completedAt));
}

/** The one-line state a card leads with, from the current user's side. */
export function stateOf(match: ChallengeMatch): {
  key: 'awaiting_response' | 'your_turn' | 'waiting_on_them' | 'resolved' | 'declined' | 'expired' | 'void';
  label: string;
} {
  if (match.status === 'declined') return { key: 'declined', label: 'Passed on' };
  if (match.status === 'void') return { key: 'void', label: 'Void — nobody finished' };

  if (resultsUnlocked(match)) {
    const outcome = outcomeOf(match);
    if (outcome === 'won') return { key: 'resolved', label: 'You won' };
    if (outcome === 'lost') return { key: 'resolved', label: 'You lost' };
    return { key: 'resolved', label: 'Draw' };
  }

  if (match.windowClosed) return { key: 'expired', label: 'Window closed' };

  const iFinished = !!match.myAttempt?.completedAt;
  if (iFinished) {
    return { key: 'waiting_on_them', label: 'Waiting on them' };
  }

  // The sender can start their own half straight away; the opponent has to
  // accept first, which is what makes "awaiting response" the sender's state.
  if (match.status === 'pending') {
    return match.isSender
      ? { key: 'awaiting_response', label: 'Awaiting response' }
      : { key: 'your_turn', label: 'New challenge' };
  }

  return { key: 'your_turn', label: 'Your turn' };
}

// ─── profiles & friends ──────────────────────────────────────────────────────

async function profilesByIds(ids: string[]): Promise<Map<string, PublicProfile>> {
  const out = new Map<string, PublicProfile>();
  const unique = [...new Set(ids)].filter(Boolean);
  if (unique.length === 0) return out;

  const { data, error } = await supabase
    .from('public_profiles')
    .select('id, username, level, total_xp, current_streak')
    .in('id', unique);

  if (error) {
    console.warn('Could not load profiles:', error.message);
    return out;
  }
  for (const row of (data || []) as any[]) out.set(row.id, toProfile(row));
  return out;
}

export async function fetchMyProfile(): Promise<PublicProfile | null> {
  const userId = await currentUserId();
  const map = await profilesByIds([userId]);
  return map.get(userId) ?? null;
}

/**
 * The whole friend graph in one pass: accepted friends, incoming requests and
 * outgoing ones, each carrying its friendship row id and mute state.
 */
export async function fetchFriends(): Promise<Friend[]> {
  const userId = await currentUserId();

  const [{ data, error }, mutesRes] = await Promise.all([
    supabase
      .from('friendships')
      .select('id, requester_id, recipient_id, status')
      .or(`requester_id.eq.${userId},recipient_id.eq.${userId}`),
    supabase.from('challenge_mutes').select('muted_user_id').eq('user_id', userId),
  ]);

  if (error) {
    console.warn('Could not load friendships:', error.message);
    return [];
  }

  const rows = (data || []) as any[];
  const muted = new Set(((mutesRes.data || []) as any[]).map((r) => r.muted_user_id));
  const otherIds = rows.map((r) => (r.requester_id === userId ? r.recipient_id : r.requester_id));
  const profiles = await profilesByIds(otherIds);

  const friends: Friend[] = [];
  for (const row of rows) {
    const otherId = row.requester_id === userId ? row.recipient_id : row.requester_id;
    const profile = profiles.get(otherId);
    // A friendship whose other half has been deleted has nothing to render.
    if (!profile) continue;

    friends.push({
      ...profile,
      friendshipId: row.id,
      status: row.status,
      incoming: row.recipient_id === userId,
      muted: muted.has(otherId),
    });
  }

  return friends.sort((a, b) => a.username.localeCompare(b.username));
}

/** Username search for the Add Friend screen. Excludes the caller. */
export async function searchProfiles(query: string): Promise<PublicProfile[]> {
  const term = query.trim();
  if (term.length < 2) return [];

  const userId = await currentUserId();
  const { data, error } = await supabase
    .from('public_profiles')
    .select('id, username, level, total_xp, current_streak')
    .ilike('username', `%${term}%`)
    .neq('id', userId)
    .limit(20);

  if (error) {
    console.warn('Could not search profiles:', error.message);
    return [];
  }
  return ((data || []) as any[]).map(toProfile);
}

export async function sendFriendRequest(friendId: string): Promise<void> {
  const userId = await currentUserId();
  const { error } = await supabase.from('friendships').insert({
    requester_id: userId,
    recipient_id: friendId,
    status: 'pending',
  });
  // The unique pair constraint is the "already asked" case, which is not an error
  // worth surfacing — the roster already shows the pending row.
  if (error && error.code !== '23505') throw new Error(error.message);
}

export async function respondToFriendRequest(friendshipId: string, accept: boolean): Promise<void> {
  if (accept) {
    const { error } = await supabase
      .from('friendships')
      .update({ status: 'accepted', updated_at: new Date().toISOString() })
      .eq('id', friendshipId);
    if (error) throw new Error(error.message);
    return;
  }

  const { error } = await supabase.from('friendships').delete().eq('id', friendshipId);
  if (error) throw new Error(error.message);
}

export async function removeFriend(friendshipId: string): Promise<void> {
  const { error } = await supabase.from('friendships').delete().eq('id', friendshipId);
  if (error) throw new Error(error.message);
}

export async function setChallengeMute(friendId: string, muted: boolean): Promise<void> {
  const userId = await currentUserId();
  if (muted) {
    const { error } = await supabase
      .from('challenge_mutes')
      .upsert({ user_id: userId, muted_user_id: friendId });
    if (error) throw new Error(error.message);
    return;
  }

  const { error } = await supabase
    .from('challenge_mutes')
    .delete()
    .eq('user_id', userId)
    .eq('muted_user_id', friendId);
  if (error) throw new Error(error.message);
}

// ─── streak ──────────────────────────────────────────────────────────────────

/**
 * Every day the student did something that counts, as device-local day keys.
 * Practice/Arena answers and finished challenge attempts both qualify — §7.7:
 * completing a challenge is a qualifying activity for the streak even though it
 * deliberately leaves no `answer_event` behind.
 */
async function activityDayKeys(userId: string, since: Date): Promise<Set<string>> {
  const sinceIso = since.toISOString();

  const [events, attempts] = await Promise.all([
    supabase
      .from('answer_events')
      .select('answered_at')
      .eq('user_id', userId)
      .gte('answered_at', sinceIso)
      .order('answered_at', { ascending: false })
      .limit(5000),
    supabase
      .from('challenge_attempts')
      .select('completed_at')
      .eq('user_id', userId)
      .not('completed_at', 'is', null)
      .gte('completed_at', sinceIso)
      .limit(500),
  ]);

  const keys = new Set<string>();
  for (const row of ((events.data || []) as any[])) {
    if (row.answered_at) keys.add(dayKey(new Date(row.answered_at)));
  }
  for (const row of ((attempts.data || []) as any[])) {
    if (row.completed_at) keys.add(dayKey(new Date(row.completed_at)));
  }
  return keys;
}

/** Timestamps of finished challenge attempts, for Home's streak to fold in. */
export async function fetchChallengeActivityDays(
  userId: string,
  sinceIso: string
): Promise<string[]> {
  const { data, error } = await supabase
    .from('challenge_attempts')
    .select('completed_at')
    .eq('user_id', userId)
    .not('completed_at', 'is', null)
    .gte('completed_at', sinceIso)
    .limit(500);

  if (error) {
    console.warn('Could not load challenge activity:', error.message);
    return [];
  }
  return ((data || []) as any[]).map((r) => r.completed_at).filter(Boolean);
}

export async function fetchStreak(): Promise<StreakState> {
  const userId = await currentUserId();
  const now = new Date();
  const keys = await activityDayKeys(userId, addDays(startOfDay(now), -STREAK_LOOKBACK_DAYS));

  // Consecutive days ending today, or ending yesterday while today is still
  // young — a streak is not broken until the day it was needed has gone.
  let cursor = startOfDay(now);
  const activeToday = keys.has(dayKey(cursor));
  if (!activeToday) cursor = addDays(cursor, -1);

  let current = 0;
  if (keys.has(dayKey(cursor))) {
    while (keys.has(dayKey(cursor))) {
      current += 1;
      cursor = addDays(cursor, -1);
    }
  }

  // Longest run inside the lookback window. `profiles.longest_streak` would be
  // the better source, but nothing writes it yet.
  let longest = current;
  let run = 0;
  for (let i = STREAK_LOOKBACK_DAYS; i >= 0; i--) {
    if (keys.has(dayKey(addDays(startOfDay(now), -i)))) {
      run += 1;
      longest = Math.max(longest, run);
    } else {
      run = 0;
    }
  }

  // Five weeks, Sunday-aligned, so the detail screen's grid has square columns.
  const today = startOfDay(now);
  const gridEnd = addDays(today, 6 - now.getDay());
  const calendar: StreakDay[] = [];
  for (let i = CALENDAR_DAYS - 1; i >= 0; i--) {
    const date = addDays(gridEnd, -i);
    const key = dayKey(date);
    calendar.push({
      key,
      date: date.toISOString(),
      active: keys.has(key),
      isToday: key === dayKey(today),
      isFuture: date.getTime() > today.getTime(),
    });
  }

  return {
    current,
    longest,
    activeToday,
    atRisk: !activeToday && current > 0,
    calendar,
  };
}

// ─── leaderboard ─────────────────────────────────────────────────────────────

export async function fetchLeaderboard(scope: 'friends' | 'global'): Promise<LeaderboardRow[]> {
  const { data, error } = await supabase.rpc('challenge_leaderboard', {
    p_scope: scope,
    p_limit: 50,
  });

  if (error) {
    console.warn('Could not load leaderboard:', error.message);
    return [];
  }

  return ((data || []) as any[]).map((row, i) => ({
    userId: row.user_id,
    username: row.username || '',
    questions: row.questions_7d ?? 0,
    accuracyPct: row.accuracy_pct ?? 0,
    activeDays: row.active_days ?? 0,
    isSelf: !!row.is_self,
    // The function already orders the rows; rank is their position in it.
    rank: i + 1,
  }));
}

export async function fetchHeadToHead(friendId: string): Promise<HeadToHead> {
  const { data, error } = await supabase.rpc('challenge_head_to_head', { p_friend_id: friendId });
  if (error) {
    console.warn('Could not load head-to-head:', error.message);
    return { wins: 0, losses: 0, draws: 0 };
  }
  const row = (Array.isArray(data) ? data[0] : data) as any;
  return {
    wins: row?.wins ?? 0,
    losses: row?.losses ?? 0,
    draws: row?.draws ?? 0,
  };
}

// ─── matches ─────────────────────────────────────────────────────────────────

function hydrate(
  row: any,
  userId: string,
  attempts: ChallengeAttempt[],
  profiles: Map<string, PublicProfile>
): ChallengeMatch {
  const isSender = row.sender_id === userId;
  const opponentId = isSender ? row.opponent_id : row.sender_id;

  return {
    id: row.id,
    senderId: row.sender_id,
    opponentId: row.opponent_id,
    source: row.source,
    chapterId: row.chapter_id ?? null,
    chapterName: row.chapter_name ?? null,
    subject: (row.subject as SubjectKey) ?? null,
    questionIds: row.question_ids || [],
    tier: (row.difficulty_tier as DifficultyTier) || 'II',
    timerType: row.timer_type,
    timerSeconds: row.timer_seconds,
    status: row.status,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
    completedAt: row.completed_at ?? null,
    isSender,
    opponent: profiles.get(opponentId) ?? null,
    myAttempt: attempts.find((a) => a.userId === userId) ?? null,
    theirAttempt: attempts.find((a) => a.userId === opponentId) ?? null,
    // Expiry is evaluated against the clock, not against the stored status, so
    // the screens are right even on a project where the cron job never ran.
    windowClosed: new Date(row.expires_at).getTime() <= Date.now(),
  };
}

export async function fetchMatches(): Promise<ChallengeMatch[]> {
  const userId = await currentUserId();

  const { data, error } = await supabase
    .from('challenge_matches')
    .select('*')
    .or(`sender_id.eq.${userId},opponent_id.eq.${userId}`)
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) {
    console.warn('Could not load challenges:', error.message);
    return [];
  }

  const rows = (data || []) as any[];
  if (rows.length === 0) return [];

  const matchIds = rows.map((r) => r.id);
  const [attemptsRes, profiles] = await Promise.all([
    supabase
      .from('challenge_attempts')
      .select('match_id, user_id, status, answers, correct_count, total_time_ms, longest_streak, completed_at')
      .in('match_id', matchIds),
    profilesByIds(rows.map((r) => (r.sender_id === userId ? r.opponent_id : r.sender_id))),
  ]);

  const byMatch = new Map<string, ChallengeAttempt[]>();
  for (const row of ((attemptsRes.data || []) as any[])) {
    const list = byMatch.get(row.match_id) || [];
    list.push(toAttempt(row));
    byMatch.set(row.match_id, list);
  }

  return rows.map((row) => hydrate(row, userId, byMatch.get(row.id) || [], profiles));
}

export async function fetchMatch(matchId: string): Promise<ChallengeMatch | null> {
  const userId = await currentUserId();

  const { data, error } = await supabase
    .from('challenge_matches')
    .select('*')
    .eq('id', matchId)
    .maybeSingle();

  if (error || !data) return null;
  const row = data as any;

  const opponentId = row.sender_id === userId ? row.opponent_id : row.sender_id;
  const [attemptsRes, profiles] = await Promise.all([
    supabase
      .from('challenge_attempts')
      .select('match_id, user_id, status, answers, correct_count, total_time_ms, longest_streak, completed_at')
      .eq('match_id', matchId),
    profilesByIds([opponentId]),
  ]);

  const attempts = ((attemptsRes.data || []) as any[]).map(toAttempt);
  return hydrate(row, userId, attempts, profiles);
}

// ─── creating a challenge ────────────────────────────────────────────────────

/**
 * The tier a set lands in. `irt_difficulty` is the calibrated figure and wins
 * when the bank has one; the authored easy/medium/hard band stands in when it
 * does not. Four tiers over a mean, so one hard question in a set of five
 * cannot drag the whole thing into Tier IV.
 */
function tierFor(rows: { difficulty?: string | null; irt_difficulty?: number | null }[]): DifficultyTier {
  if (rows.length === 0) return 'II';

  const calibrated = rows.filter((r) => typeof r.irt_difficulty === 'number');
  if (calibrated.length >= Math.ceil(rows.length / 2)) {
    // IRT difficulty is roughly [-3, 3]. The cuts split that into four bands.
    const mean =
      calibrated.reduce((sum, r) => sum + (r.irt_difficulty as number), 0) / calibrated.length;
    if (mean < -1) return 'I';
    if (mean < 0) return 'II';
    if (mean < 1) return 'III';
    return 'IV';
  }

  const scoreOf = (d?: string | null) => (d === 'hard' ? 3 : d === 'medium' ? 2 : 1);
  const mean = rows.reduce((sum, r) => sum + scoreOf(r.difficulty), 0) / rows.length;
  if (mean < 1.4) return 'I';
  if (mean < 2.0) return 'II';
  if (mean < 2.6) return 'III';
  return 'IV';
}

export interface ChallengeDraft {
  opponentId: string;
  source: ChallengeSource;
  chapterId: string | null;
  chapterName: string | null;
  subject: SubjectKey | null;
  /** Set to a single id for the "challenge on this question" entry point. */
  questionIds?: string[];
  setSize: number;
  timerSeconds: number;
  expiryHours: number;
}

export interface ChallengePreview {
  questionIds: string[];
  tier: DifficultyTier;
}

/**
 * Draws the shared pool and bands it, without writing anything. The confirm step
 * shows this, so the tier on the card is the tier of the actual questions rather
 * than a guess from the chapter.
 */
export async function previewChallengeSet(draft: ChallengeDraft): Promise<ChallengePreview> {
  if (draft.questionIds && draft.questionIds.length > 0) {
    const { data } = await supabase
      .from('questions')
      .select('id, difficulty, irt_difficulty')
      .in('id', draft.questionIds);
    const rows = (data || []) as any[];
    return { questionIds: draft.questionIds, tier: tierFor(rows) };
  }

  if (!draft.chapterId) return { questionIds: [], tier: 'II' };

  const { data, error } = await supabase.rpc('challenge_question_pool', {
    p_chapter_id: draft.chapterId,
    p_count: draft.setSize,
  });

  if (error) {
    console.warn('Could not draw a challenge set:', error.message);
    return { questionIds: [], tier: 'II' };
  }

  const rows = (data || []) as any[];
  return { questionIds: rows.map((r) => r.id), tier: tierFor(rows) };
}

export async function createChallenge(
  draft: ChallengeDraft,
  preview: ChallengePreview
): Promise<ChallengeMatch> {
  const userId = await currentUserId();

  if (preview.questionIds.length === 0) {
    throw new Error('This chapter has no published questions to challenge on yet.');
  }

  const expiresAt = new Date(Date.now() + draft.expiryHours * 3600000).toISOString();

  const { data, error } = await supabase
    .from('challenge_matches')
    .insert({
      sender_id: userId,
      opponent_id: draft.opponentId,
      source: draft.source,
      chapter_id: draft.chapterId,
      chapter_name: draft.chapterName,
      subject: draft.subject,
      question_ids: preview.questionIds,
      difficulty_tier: preview.tier,
      timer_type: 'per_question',
      timer_seconds: draft.timerSeconds,
      status: 'pending',
      expires_at: expiresAt,
    })
    .select('*')
    .single();

  if (error) {
    // The insert guard raises for mutes and for the 3-open-per-pair cap; its
    // message is written to be shown as-is.
    throw new Error(error.message);
  }

  const profiles = await profilesByIds([draft.opponentId]);
  return hydrate(data as any, userId, [], profiles);
}

// ─── responding & attempting ─────────────────────────────────────────────────

export async function respondToChallenge(matchId: string, accept: boolean): Promise<void> {
  const { error } = await supabase
    .from('challenge_matches')
    .update({
      status: accept ? 'accepted' : 'declined',
      responded_at: new Date().toISOString(),
    })
    .eq('id', matchId);
  if (error) throw new Error(error.message);
}

/** The frozen set, in its stored order, with the answer key resolved locally. */
export async function fetchChallengeQuestions(questionIds: string[]): Promise<ChallengeQuestion[]> {
  if (questionIds.length === 0) return [];

  const { data, error } = await supabase
    .from('questions')
    .select('id, question_body, options, correct_answer')
    .in('id', questionIds);

  if (error) throw new Error(error.message);

  const byId = new Map<string, any>();
  for (const row of ((data || []) as any[])) byId.set(row.id, row);

  const out: ChallengeQuestion[] = [];
  for (const id of questionIds) {
    const row = byId.get(id);
    // A question unpublished after the set was frozen simply drops out; both
    // participants lose the same question, so the comparison stays fair.
    if (!row) continue;

    const options = Array.isArray(row.options) ? row.options : [];
    out.push({
      id: row.id,
      prompt: row.question_body || '',
      options: options.map((o: any) => (typeof o === 'string' ? o : o?.text ?? '')),
      correctIndex: resolveCorrectIndex(row.options, row.correct_answer),
    });
  }
  return out;
}

/**
 * An answer key can be stored as the option's own id, as its index, or only as
 * an `is_correct` flag on the option — the same three shapes Arena handles.
 */
function resolveCorrectIndex(options: any, key: any): number {
  if (Array.isArray(options)) {
    const flagged = options.findIndex((o: any) => o && typeof o === 'object' && o.is_correct === true);
    if (flagged >= 0) return flagged;

    if (key != null) {
      const byId = options.findIndex(
        (o: any) => o && typeof o === 'object' && o.id != null && String(o.id) === String(key)
      );
      if (byId >= 0) return byId;
    }
  }

  const asIndex = Number(key);
  return Number.isInteger(asIndex) ? asIndex : -1;
}

/** Marks the attempt started, so an abandoned run reads as DNF and not as unopened. */
export async function beginAttempt(matchId: string): Promise<void> {
  const userId = await currentUserId();

  const { error } = await supabase
    .from('challenge_attempts')
    .upsert(
      {
        match_id: matchId,
        user_id: userId,
        status: 'in_progress',
        started_at: new Date().toISOString(),
      },
      { onConflict: 'match_id,user_id', ignoreDuplicates: true }
    );
  if (error) console.warn('Could not open attempt:', error.message);

  // Only an accepted challenge moves to in_progress. A sender who answers their
  // own half first must leave the match `pending`, or the invitation would lose
  // its accept/decline state before the opponent ever opened it.
  await supabase
    .from('challenge_matches')
    .update({ status: 'in_progress' })
    .eq('id', matchId)
    .eq('status', 'accepted');
}

export interface AttemptResult {
  correctCount: number;
  total: number;
  totalTimeMs: number;
  longestStreak: number;
}

/**
 * Submits the whole attempt at once and locks it. The set is scored on the
 * client because correctness is already resolved there question by question; the
 * row is immutable afterwards (the update policy only matches an open attempt),
 * so there is no review-and-edit pass to be had.
 */
export async function completeAttempt(
  matchId: string,
  answers: ChallengeAnswer[]
): Promise<AttemptResult> {
  const userId = await currentUserId();

  const correctCount = answers.filter((a) => a.correct).length;
  const totalTimeMs = answers.reduce((sum, a) => sum + (a.time_ms || 0), 0);

  let longestStreak = 0;
  let run = 0;
  for (const a of answers) {
    if (a.correct) {
      run += 1;
      longestStreak = Math.max(longestStreak, run);
    } else {
      run = 0;
    }
  }

  const now = new Date().toISOString();
  const { error } = await supabase.from('challenge_attempts').upsert(
    {
      match_id: matchId,
      user_id: userId,
      status: 'completed',
      answers,
      correct_count: correctCount,
      total_time_ms: totalTimeMs,
      longest_streak: longestStreak,
      completed_at: now,
    },
    { onConflict: 'match_id,user_id' }
  );
  if (error) throw new Error(error.message);

  // The match closes once both attempts are in; until then it stays in progress.
  const { data: attempts } = await supabase
    .from('challenge_attempts')
    .select('completed_at')
    .eq('match_id', matchId);

  const finished = ((attempts || []) as any[]).filter((a) => a.completed_at).length;
  if (finished >= 2) {
    await supabase
      .from('challenge_matches')
      .update({ status: 'completed', completed_at: now })
      .eq('id', matchId);
  } else {
    // Same care as `beginAttempt`: a still-pending invitation keeps its status so
    // the opponent's accept/decline choice survives the sender finishing first.
    await supabase
      .from('challenge_matches')
      .update({ status: 'in_progress' })
      .eq('id', matchId)
      .eq('status', 'accepted');
  }

  return { correctCount, total: answers.length, totalTimeMs, longestStreak };
}

// ─── chapters, for the config screen ─────────────────────────────────────────

export interface ChallengeChapter {
  chapterId: string;
  name: string;
  subject: SubjectKey;
  totalQuestions: number;
}

export async function fetchChallengeChapters(): Promise<ChallengeChapter[]> {
  const { data, error } = await supabase
    .from('chapters')
    .select('id, name, subject, total_questions')
    .order('sort_order', { ascending: true });

  if (error) {
    console.warn('Could not load chapters:', error.message);
    return [];
  }

  return ((data || []) as any[])
    .map((row) => ({
      chapterId: row.id,
      name: row.name,
      subject: (row.subject || '').toLowerCase() as SubjectKey,
      totalQuestions: row.total_questions || 0,
    }))
    .filter((c) => c.subject === 'physics' || c.subject === 'chemistry' || c.subject === 'maths');
}
