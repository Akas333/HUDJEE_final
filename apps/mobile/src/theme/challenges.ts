import { SubjectKey } from './subjects';
import { CAUTION, NEGATIVE, POSITIVE, TEXT_MUTED as MUTED } from './ui';

// Challenges rides the same visual system as Home, Practice and Arena: 24pt
// gutter, Nunito, raised dark cards over a tinted wash, hairline borders. Those
// tokens come from `theme/ui` and are re-exported here so the ten Challenges
// screens keep their existing imports — the two tabs sit next to each other in
// the tab bar, and a near-miss between them reads as a bug.
//
// What is different here is temperature, not structure: Challenges is the one
// surface allowed to feel warm, because its job is relationships rather than
// measurement. That shows up in one place only — the result stamp and the
// win/loss accents — and nowhere in the chrome.

export {
  CARD_WIDTH,
  DIVIDER,
  GAP,
  GOLD,
  GRADIENT,
  GUTTER,
  RADIUS,
  SECTION_GAP,
  SURFACE,
  SURFACE_BORDER,
  SURFACE_STRONG,
  TEXT,
  TEXT_FAINT,
  TEXT_MUTED,
  TRACK,
} from './ui';

/** The social layer's own tint: neither of the three subjects owns this tab. */
export const CHALLENGE_TINT = '#6D5BD0';

export const WIN = POSITIVE;
export const LOSS = NEGATIVE;
export const DRAW = MUTED;
export const AT_RISK = CAUTION;

// ─── difficulty tiers ────────────────────────────────────────────────────────
// Challenges shows a band, never a number. Arena keeps the raw difficulty: there
// the number *is* the instrument, here it is competitive context and a coarse
// label carries it without inviting anybody to grind the figure.

export type DifficultyTier = 'I' | 'II' | 'III' | 'IV';

export const TIERS: DifficultyTier[] = ['I', 'II', 'III', 'IV'];

export const TIER_LABELS: Record<DifficultyTier, string> = {
  I: 'Tier I',
  II: 'Tier II',
  III: 'Tier III',
  IV: 'Tier IV',
};

export const TIER_BLURBS: Record<DifficultyTier, string> = {
  I: 'Warm-up',
  II: 'Standard',
  III: 'Demanding',
  IV: 'Brutal',
};

export const TIER_COLORS: Record<DifficultyTier, string> = {
  I: '#69EAC0',
  II: '#40C9FF',
  III: '#C79BF0',
  IV: '#F0857C',
};

// ─── configuration presets ───────────────────────────────────────────────────

export const SET_SIZES = [5, 10, 15];
export const PER_QUESTION_SECONDS = [30, 60, 90];
export const EXPIRY_HOURS = [24, 48, 168];

export const DEFAULT_SET_SIZE = 5;
export const DEFAULT_TIMER_SECONDS = 60;
export const DEFAULT_EXPIRY_HOURS = 48;

/** Max challenges awaiting a response per friend pair — mirrored in the DB. */
export const MAX_OPEN_PER_FRIEND = 3;

export const SUBJECT_LABELS: Record<SubjectKey, string> = {
  physics: 'Physics',
  chemistry: 'Chemistry',
  maths: 'Maths',
};

// ─── streak scale ────────────────────────────────────────────────────────────
// The gauge is a rolling 30-day window rather than an all-time scale: on an
// absolute scale a 40-day streak would sit at 4% forever and the needle would
// stop meaning anything. Each band completed rolls the scale on.

export const STREAK_BAND = 30;

export function streakBandProgress(days: number): number {
  if (days <= 0) return 0;
  const within = days % STREAK_BAND;
  // A day that lands exactly on the band boundary reads as a full ring, not as
  // an empty one.
  return within === 0 ? 1 : within / STREAK_BAND;
}

export function nextStreakMilestone(days: number): number {
  return (Math.floor(days / STREAK_BAND) + 1) * STREAK_BAND;
}

// ─── formatting ──────────────────────────────────────────────────────────────

export function formatClock(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/** Attempt times are milliseconds; the results screen speaks in seconds. */
export function formatDurationMs(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000));
  if (total < 60) return `${total}s`;
  const m = Math.floor(total / 60);
  const s = total % 60;
  return s === 0 ? `${m}m` : `${m}m ${s}s`;
}

/** "2d left" / "4h left" / "18m left" — deliberately coarse above a day. */
export function formatTimeLeft(expiresAt: string): string {
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return 'Window closed';

  const minutes = Math.floor(ms / 60000);
  if (minutes < 60) return `${Math.max(1, minutes)}m left`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h left`;

  return `${Math.floor(hours / 24)}d left`;
}

export function formatExpiryWindow(hours: number): string {
  if (hours >= 168) return '7 days';
  return `${hours}h`;
}

/** Relative "last seen", matching the wording Home and Practice already use. */
export function relativeDay(iso: string | null): string | null {
  if (!iso) return null;
  const then = new Date(iso);
  const startOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((startOf(new Date()) - startOf(then)) / 86400000);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 14) return 'Last week';
  return `${Math.floor(days / 7)} weeks ago`;
}
