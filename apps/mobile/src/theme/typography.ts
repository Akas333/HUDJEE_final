import { activeFamily } from './fonts';

/**
 * The type scale, expressed in weights rather than family names.
 *
 * `typography.bold` resolves through `theme/fonts`, so no screen names a
 * typeface and swapping `ACTIVE_FAMILY` there re-dresses the whole app. Nothing
 * below should ever hardcode a font name — that is the one thing that would
 * pin a screen to a face and break the swap.
 */

const w = activeFamily.weights;

export const typography = {
  regular: w.regular,
  medium: w.medium,
  semiBold: w.semiBold,
  bold: w.bold,
  extraBold: w.extraBold,
  black: w.black,

  // ── HudJee Visual System Typography ──
  hudjee: {
    display: { fontFamily: w.bold, fontSize: 44 },
    headingLg: { fontFamily: w.bold, fontSize: 22 },
    headingMd: { fontFamily: w.semiBold, fontSize: 18 },
    body: { fontFamily: w.regular, fontSize: 15 },
    label: { fontFamily: w.regular, fontSize: 13 },
    caption: { fontFamily: w.regular, fontSize: 12 },
    numericEmphasis: { fontFamily: w.medium, fontSize: 16 },
  },
};
