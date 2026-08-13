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

/**
 * The one place the app's typeface is chosen.
 *
 * Every screen asks for a *weight* (`typography.bold`) and never for a family,
 * so the family is a single swap here rather than a find-and-replace across
 * fifty-one files. Change `ACTIVE_FAMILY`, reload, and the whole app is wearing
 * the new face — which is the point: a typeface has to be judged on real
 * screens with real copy, not in a specimen.
 *
 * To add a candidate:
 *   1. `npm install @expo-google-fonts/<family> --workspace mobile`
 *   2. import its six weights above
 *   3. add an entry to `FAMILIES` below
 *   4. point `ACTIVE_FAMILY` at it
 *
 * Every family must supply all six weights under the same keys. A family that
 * ships fewer (many do) should repeat the nearest one rather than omit it —
 * `fontFamily` silently falls back to the system face when the name misses,
 * and that reads as a rendering bug rather than a missing weight.
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
} satisfies Record<string, FontFamilySpec>;

export type FamilyKey = keyof typeof FAMILIES;

/** ← The switch. Swap this to try a different face across the whole app. */
export const ACTIVE_FAMILY: FamilyKey = 'nunito';

export const activeFamily: FontFamilySpec = FAMILIES[ACTIVE_FAMILY];

/**
 * Only the active family's faces, so trying a font does not make the bundle
 * carry every candidate it has ever been compared against.
 */
export function fontAssetsToLoad(): Record<string, number> {
  return activeFamily.assets;
}
