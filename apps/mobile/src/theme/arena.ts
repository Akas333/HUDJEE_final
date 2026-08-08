import { Dimensions } from 'react-native';
import { Crosshair, FlagTriangleRight, Infinity as InfinityIcon, Timer } from 'lucide-react-native';

import { colors } from './colors';
import { SubjectKey } from './subjects';

// Arena rides the same visual system as Home and Practice: 24pt gutter, Nunito,
// raised dark cards over a tinted wash, hairline borders. The tokens live here
// rather than being re-typed per screen, because Arena spans four of them and a
// near-miss between the setup screen and the session would read as two different
// products.

const { width } = Dimensions.get('window');

export const GUTTER = 24;
export const GAP = 12;
export const SECTION_GAP = 28;
export const CARD_WIDTH = width - GUTTER * 2;
export const RADIUS = 18;

// Solid, and a step *lighter* than the base the app sits on — same relationship
// Home uses. Translucent cards read as washed out over the bright top of the
// wash and, worse, come out darker than the page lower down, so a stack of them
// sinks into the background instead of sitting on it. The subject tint still
// carries the screen: it runs behind the header and in every gutter and gap.
export const SURFACE = '#17171D';
export const SURFACE_STRONG = '#26262F';
export const SURFACE_BORDER = '#2C2C37';
export const TRACK = '#26262E';
export const DIVIDER = '#333340';

export const TEXT = colors.hudjeeTextPrimary;
export const TEXT_MUTED = colors.hudjeeTextSecondary;
export const TEXT_FAINT = colors.hudjeeTextTertiary;

export const GRADIENT: [string, string] = ['#69EAC0', '#40C9FF'];
export const POSITIVE = '#3FE8A6';
export const NEGATIVE = '#F87171';

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
