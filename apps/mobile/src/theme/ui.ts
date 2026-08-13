import { Dimensions } from 'react-native';
import { FadeInDown } from 'react-native-reanimated';

// The one place the app's visual system is defined.
//
// Home, Practice, Arena and Challenges each grew their own copy of these
// numbers, and the copies agreed only because somebody kept them in step by
// hand. `theme/arena.ts` and `theme/challenges.ts` now re-export from here, so
// the tabs cannot drift apart by a point or a shade — and Profile and Settings,
// which never had tokens of their own, get the same ones for free.
//
// The values are Home's. Home was rebuilt first and then the rest of the app was
// brought to it, so what is written here is what shipped and was looked at on a
// device — not a palette agreed in the abstract and then argued with screen by
// screen.

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
// Solid, in three steps: the page, a card on it, a row nested in that card.
// Translucent surfaces were tried first and abandoned — over a wash they come
// out lighter at the top of the screen than the bottom, so a stack of cards
// appears to tilt, and a card nested in a card doubles its own alpha and turns
// muddy. Solid values hold their weight anywhere on the page.

/** The page. Near-black, and flat — Home carries no wash behind it. */
export const BG = '#0A0A0C';
/** Cards sit one step off the page… */
export const SURFACE = '#131317';
/** …and anything nested inside a card sits one step off the card. */
export const SURFACE_SUBTLE = '#1B1B20';
export const SURFACE_STRONG = '#232329';
export const SURFACE_BORDER = '#26262C';
export const TRACK = '#26262C';
export const DIVIDER = '#26262C';
/**
 * The 3pt dot that separates two bits of meta inside a card, and the hairline
 * on an active control. One step brighter than a border on purpose: at 3pt a
 * border-weight grey is not there at all.
 */
export const DOT = '#3F3F46';

/**
 * The disc every back button and header affordance is drawn in. Solid, like
 * everything else — it used to be a 5% white film, which is invisible on a
 * black page and too bright the moment anything sits behind it.
 */
export const GLASS = SURFACE_SUBTLE;
export const GLASS_BORDER = SURFACE_BORDER;

// ─── text ────────────────────────────────────────────────────────────────────
// Three steps only. A fourth was tried and the two middle greys were
// indistinguishable at 11pt on a phone in daylight.

export const TEXT = '#FFFFFF';
export const TEXT_MUTED = '#9CA3AF';
export const TEXT_FAINT = '#6B7280';

/**
 * Ink for text and icons sitting on a light fill — the solid CTAs, a selected
 * option badge. It is the page colour rather than pure black, so the label
 * reads as the page showing through the button rather than as a second, darker
 * shade the palette does not otherwise contain.
 */
export const ON_LIGHT = BG;

// ─── accents ─────────────────────────────────────────────────────────────────

/**
 * The accent, which is not a colour: it is white.
 *
 * Progress bars, arcs, meters, badges and every small mark are filled with
 * this. The app had a sky-blue accent, then a subject colour per screen, then
 * both at once, and the result was that nothing on a screen was emphasised
 * because five things always were. Emphasis is brightness here — white against
 * three greys — and hue is spent on two things only: the gradient a button is
 * outlined in, and whether an answer was right or wrong.
 */
export const ACCENT = '#FFFFFF';

/**
 * The ramp the primary button is *outlined* in — indigo on the left, unlit
 * through the middle, warm brass on the right. It only ever draws a 1.5pt
 * border around a near-black fill: the point of it is that the app's one loud
 * accent costs no surface area, so a flat card stack stays flat. Do not fill a
 * shape with it.
 */
export const ACCENT_GRADIENT: [string, string, string] = ['#6D5DF6', '#4A4A63', '#C99A6B'];
export const POSITIVE = '#22C55E';
export const NEGATIVE = '#EF4444';
export const CAUTION = '#F0B65C';
export const GOLD = '#E3B24C';

// ─── tints ───────────────────────────────────────────────────────────────────
// Each area of the app used to wear its own colour, first as a full-bleed wash
// and then as the accent on its marks. They are all white now — kept as named
// constants because every screen still declares which area it belongs to, and
// because putting colour back is then one line per area rather than a search.

/** Profile and Settings. */
export const PROFILE_TINT = '#FFFFFF';

/** Tests and everything downstream of one. */
export const TEST_TINT = '#FFFFFF';

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
