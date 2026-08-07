import { Crosshair, FlagTriangleRight, Infinity as InfinityIcon, Timer } from 'lucide-react-native';

import { SubjectKey } from './subjects';

// Arena rides the same visual system as Home and Practice: 24pt gutter, Nunito,
// raised dark cards over a tinted wash, hairline borders. Those tokens are the
// app's, not Arena's, so they come from `theme/ui` — this file re-exports them
// so the four Arena screens keep their existing imports, and holds only what is
// genuinely Arena's own: the modes, the presets, the clock formatting.

export {
  CARD_WIDTH,
  DIVIDER,
  GAP,
  GRADIENT,
  GUTTER,
  NEGATIVE,
  POSITIVE,
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

export const SUBJECT_LABELS: Record<SubjectKey, string> = {
  physics: 'Physics',
  chemistry: 'Chemistry',
  maths: 'Maths',
};

export const SUBJECT_SHORT: Record<SubjectKey, string> = {
  physics: 'PHY',
  chemistry: 'CHEM',
  maths: 'MATH',
};

export const SUBJECT_ORDER: SubjectKey[] = ['physics', 'chemistry', 'maths'];

// ─── modes ───────────────────────────────────────────────────────────────────

export type ArenaModeId = 'open_run' | 'time_trial' | 'target_run' | 'full_simulation';

export interface ArenaMode {
  id: ArenaModeId;
  name: string;
  tagline: string;
  /** The constraints, at a glance, for the card's meta line. */
  meta: string;
  icon: any;
  /** One hue per mode, so the four cards stay scannable at a glance. */
  accent: string;
  /** Whether the mode asks for a duration / a question target in setup. */
  timed: boolean;
  counted: boolean;
}

export const ARENA_MODES: ArenaMode[] = [
  {
    id: 'open_run',
    name: 'Open Run',
    tagline: 'Endless adaptive questions across whatever you pick. Stop whenever you want.',
    meta: 'No timer · No limit',
    icon: InfinityIcon,
    accent: '#A78BFA',
    timed: false,
    counted: false,
  },
  {
    id: 'time_trial',
    name: 'Time Trial',
    tagline: 'Solve as many as you can before the clock runs out.',
    meta: 'Fixed time · No limit',
    icon: Timer,
    accent: '#40C9FF',
    timed: true,
    counted: false,
  },
  {
    id: 'target_run',
    name: 'Target Run',
    tagline: 'Hit a set number of questions with no clock on your back.',
    meta: 'No timer · Fixed count',
    icon: Crosshair,
    accent: '#69EAC0',
    timed: false,
    counted: true,
  },
  {
    id: 'full_simulation',
    name: 'Full Simulation',
    tagline: 'Fixed count and fixed time — the closest thing to the real paper.',
    meta: 'Fixed time · Fixed count',
    icon: FlagTriangleRight,
    accent: '#F0B65C',
    timed: true,
    counted: true,
  },
];

export const MODE_BY_ID: Record<ArenaModeId, ArenaMode> = ARENA_MODES.reduce(
  (acc, mode) => ({ ...acc, [mode.id]: mode }),
  {} as Record<ArenaModeId, ArenaMode>
);

export const DURATION_PRESETS = [10, 15, 20, 30, 45, 60, 90]; // minutes
export const TARGET_PRESETS = [10, 20, 30, 45, 60, 90]; // questions

// ─── formatting ──────────────────────────────────────────────────────────────

export function formatClock(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = safe % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}
