import {
  Nunito_400Regular,
  Nunito_500Medium,
  Nunito_600SemiBold,
  Nunito_700Bold,
  Nunito_800ExtraBold,
  Nunito_900Black,
} from '@expo-google-fonts/nunito';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
  Inter_900Black,
} from '@expo-google-fonts/inter';
import {
  Cinzel_600SemiBold,
  Cinzel_700Bold,
  Cinzel_800ExtraBold,
  Cinzel_900Black,
} from '@expo-google-fonts/cinzel';
import { FaunaOne_400Regular } from '@expo-google-fonts/fauna-one';
import {
  Montserrat_600SemiBold,
  Montserrat_700Bold,
  Montserrat_800ExtraBold,
  Montserrat_900Black,
} from '@expo-google-fonts/montserrat';
import { Karla_400Regular, Karla_500Medium } from '@expo-google-fonts/karla';

/**
 * The one place the app's typeface is chosen.
 *
 * Every screen asks for a *weight* (`typography.bold`) and never for a family,
 * so the family is a single swap here rather than a find-and-replace across
 * fifty-one files. Change `ACTIVE_FAMILY`, reload, and the whole app is wearing
 * the new face — which is the point: a typeface has to be judged on real
 * screens with real copy, not in a specimen.
 *
 * An entry is a *scheme*, not necessarily a single family. A pairing splits the
 * six weights across two faces — a text face on the lower weights, a display
 * face on the upper ones — so `typography.regular` and `typography.bold` keep
 * meaning what they meant, and no screen has to learn a second axis.
 *
 * To add a candidate:
 *   1. `npm install @expo-google-fonts/<family> --workspace mobile`
 *   2. import its weights above
 *   3. add an entry to `FAMILIES` below
 *   4. point `ACTIVE_FAMILY` at it
 *
 * Every scheme must supply all six weights under the same keys. One that ships
 * fewer faces (many do — Fauna One is a single 400) should repeat the nearest
 * one rather than omit it: `fontFamily` silently falls back to the system face
 * when the name misses, and that reads as a rendering bug rather than a missing
 * weight.
 */

export type WeightKey =
  | 'regular'
  | 'medium'
  | 'semiBold'
  | 'bold'
  | 'extraBold'
  | 'black';

export interface FontFamilySpec {
  /** Shown in the font-picker screen, not in product copy. */
  label: string;
  /** Weight key → the registered `fontFamily` name. */
  weights: Record<WeightKey, string>;
  /** What `Font.loadAsync` needs: registered name → asset module. */
  assets: Record<string, number>;
}

export const FAMILIES = {
  nunito: {
    label: 'Nunito',
    weights: {
      regular: 'Nunito_400Regular',
      medium: 'Nunito_500Medium',
      semiBold: 'Nunito_600SemiBold',
      bold: 'Nunito_700Bold',
      extraBold: 'Nunito_800ExtraBold',
      black: 'Nunito_900Black',
    },
    assets: {
      Nunito_400Regular,
      Nunito_500Medium,
      Nunito_600SemiBold,
      Nunito_700Bold,
      Nunito_800ExtraBold,
      Nunito_900Black,
    },
  },
  inter: {
    label: 'Inter',
    weights: {
      regular: 'Inter_400Regular',
      medium: 'Inter_500Medium',
      semiBold: 'Inter_600SemiBold',
      bold: 'Inter_700Bold',
      extraBold: 'Inter_800ExtraBold',
      black: 'Inter_900Black',
    },
    assets: {
      Inter_400Regular,
      Inter_500Medium,
      Inter_600SemiBold,
      Inter_700Bold,
      Inter_800ExtraBold,
      Inter_900Black,
    },
  },
  /**
   * Cinzel + Fauna One — a pairing, split at the seam the app already uses.
   *
   * Fauna One carries the running copy: `regular` and `medium` are both its
   * single 400, because that is all it has. Cinzel — an inscriptional face
   * whose lowercase is drawn as small caps — carries everything the app was
   * already emphasising, so `semiBold` and up set titles, numbers, and button
   * labels in caps. That means emphasis now changes *face*, not just weight:
   * `medium` no longer reads as heavier than `regular`, so reach for
   * `semiBold` when something genuinely has to step forward.
   */
  cinzelFauna: {
    label: 'Cinzel + Fauna One',
    weights: {
      regular: 'FaunaOne_400Regular',
      medium: 'FaunaOne_400Regular',
      semiBold: 'Cinzel_600SemiBold',
      bold: 'Cinzel_700Bold',
      extraBold: 'Cinzel_800ExtraBold',
      black: 'Cinzel_900Black',
    },
    assets: {
      FaunaOne_400Regular,
      Cinzel_600SemiBold,
      Cinzel_700Bold,
      Cinzel_800ExtraBold,
      Cinzel_900Black,
    },
  },
  /**
   * Montserrat + Karla — the same display-over-text split, both faces sans.
   *
   * Karla (a grotesque with a wide aperture and a tall x-height) sets the
   * running copy at 400/500, so `medium` is a real step up again. Montserrat —
   * geometric, wide, and comfortable with the tight tracking the headings
   * already carry — takes `semiBold` and above.
   */
  montserratKarla: {
    label: 'Montserrat + Karla',
    weights: {
      regular: 'Karla_400Regular',
      medium: 'Karla_500Medium',
      semiBold: 'Montserrat_600SemiBold',
      bold: 'Montserrat_700Bold',
      extraBold: 'Montserrat_800ExtraBold',
      black: 'Montserrat_900Black',
    },
    assets: {
      Karla_400Regular,
      Karla_500Medium,
      Montserrat_600SemiBold,
      Montserrat_700Bold,
      Montserrat_800ExtraBold,
      Montserrat_900Black,
    },
  },
} satisfies Record<string, FontFamilySpec>;

export type FamilyKey = keyof typeof FAMILIES;

/** ← The switch. Swap this to try a different face across the whole app. */
export const ACTIVE_FAMILY: FamilyKey = 'montserratKarla';

export const activeFamily: FontFamilySpec = FAMILIES[ACTIVE_FAMILY];

/**
 * Only the active family's faces, so trying a font does not make the bundle
 * carry every candidate it has ever been compared against.
 */
export function fontAssetsToLoad(): Record<string, number> {
  return activeFamily.assets;
}
