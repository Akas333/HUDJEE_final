import { Dimensions } from 'react-native';
import { FadeInDown } from 'react-native-reanimated';

import { colors } from './colors';

// The one place the app's visual system is defined.
//
// Home, Practice, Arena and Challenges each grew their own copy of these
// numbers, and the copies agreed only because somebody kept them in step by
// hand. `theme/arena.ts` and `theme/challenges.ts` now re-export from here, so
// the tabs cannot drift apart by a point or a shade — and Profile and Settings,
// which never had tokens of their own, get the same ones for free.

const { width } = Dimensions.get('window');

// ─── metrics ─────────────────────────────────────────────────────────────────

export const GUTTER = 24;
export const GAP = 12;
export const SECTION_GAP = 28;
export const CARD_WIDTH = width - GUTTER * 2;
export const RADIUS = 18;
/** Rows nested inside a card, which must read as inset rather than stacked. */
export const RADIUS_INNER = 12;

// ─── surfaces ────────────────────────────────────────────────────────────────
// Solid, and a step *lighter* than the base the app sits on. Translucent cards
// read as washed out over the bright top of the tinted wash and, worse, come out
// darker than the page lower down, so a stack of them sinks into the background
// instead of sitting on it. The tint still carries the screen: it runs behind
// the header and in every gutter and gap.

export const SURFACE = '#17171D';
export const SURFACE_STRONG = '#26262F';
export const SURFACE_BORDER = '#2C2C37';
export const TRACK = '#26262E';
export const DIVIDER = '#333340';

/** The hairline disc every back button and header affordance is drawn in. */
export const GLASS = 'rgba(255,255,255,0.05)';
export const GLASS_BORDER = 'rgba(255,255,255,0.09)';

// ─── text ────────────────────────────────────────────────────────────────────

export const TEXT = colors.hudjeeTextPrimary;
export const TEXT_MUTED = colors.hudjeeTextSecondary;
export const TEXT_FAINT = colors.hudjeeTextTertiary;

// ─── accents ─────────────────────────────────────────────────────────────────

export const GRADIENT: [string, string] = ['#69EAC0', '#40C9FF'];
export const POSITIVE = '#3FE8A6';
export const NEGATIVE = '#F87171';
export const CAUTION = '#F0B65C';
export const GOLD = '#E3B24C';

// ─── tints ───────────────────────────────────────────────────────────────────
// Each area of the app wears one colour in its backdrop wash, so a student can
// tell where they are from the corner of their eye. Practice takes the subject's
// colour; the rest are fixed.

/** Profile and Settings: the quietest wash in the app, on purpose. These are
 *  chrome, not content — a saturated tint here would compete with the tab the
 *  student actually came from. */
export const PROFILE_TINT = '#5A5F86';

/** Tests and everything downstream of one. A paper spans all three subjects, so
 *  it cannot borrow a subject's colour; this is the sober blue that says exam. */
export const TEST_TINT = '#3E6B8F';

// ─── motion ──────────────────────────────────────────────────────────────────

/**
 * The entrance every list and card stack uses: items settle in sequence rather
 * than arriving at once. Capped at ten so a long list does not make the last row
 * wait half a second.
 */
export const enter = (index: number, step = 40) =>
  FadeInDown.springify()
    .damping(18)
    .mass(0.6)
    .delay(Math.min(index, 10) * step);
