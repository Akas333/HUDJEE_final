import { BG } from './ui';

// The subject system. Picking a subject in Practice used to re-tint everything
// downstream of it — a wash behind the page, then a coloured badge, dot and
// pill on every row.
//
// All three are white now. The subject is already named in the header, in the
// selected segment and on every card; a teal dot next to the word "Physics" was
// telling the student something they had just read, in the one channel the
// design has left for saying "this matters". The map stays because the call
// sites are meaningful — this is where a subject's mark comes from, and one
// edit here puts colour back if it is ever wanted.

export type SubjectKey = 'physics' | 'chemistry' | 'maths';

export const SUBJECT_COLORS: Record<SubjectKey, string> = {
  physics: '#FFFFFF',
  chemistry: '#FFFFFF',
  maths: '#FFFFFF',
};

/** Mixed practice, or anything not scoped to one subject. */
export const DEFAULT_TINT = '#FFFFFF';

/** The near-black the whole app sits on. */
export const BASE_COLOR = BG;

export function subjectKeyOf(name?: string | null): SubjectKey | null {
  const key = (name || '').toLowerCase();
  if (key === 'physics' || key === 'chemistry' || key === 'maths') return key;
  return null;
}

export function tintFor(subject: SubjectKey | null | undefined): string {
  return subject ? SUBJECT_COLORS[subject] : DEFAULT_TINT;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace('#', '');
  return {
    r: parseInt(clean.slice(0, 2), 16),
    g: parseInt(clean.slice(2, 4), 16),
    b: parseInt(clean.slice(4, 6), 16),
  };
}

/**
 * A tint at `alpha`, for the chips and selected pills that carry an area's
 * colour. This is the one translucency the flat system keeps: a colour over a
 * card reads as a tag, and mixing each one to a solid hex by hand would mean
 * three shades per accent to maintain.
 */
export function withAlpha(hex: string, alpha: number): string {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r},${g},${b},${alpha})`;
}
