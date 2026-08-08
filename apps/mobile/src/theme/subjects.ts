// The subject colour system. Picking a subject in Practice re-tints everything
// downstream of that choice — the chapter list, the concept screen and the
// session itself — so the student can tell at a glance which subject they are
// inside. Home is deliberately excluded: it is not scoped to a subject.

export type SubjectKey = 'physics' | 'chemistry' | 'maths';

export const SUBJECT_COLORS: Record<SubjectKey, string> = {
  physics: '#3EADCF',
  chemistry: '#32CD32',
  maths: '#FF4E00',
};

/** Mixed practice, or anything not scoped to one subject, keeps brand blue. */
export const DEFAULT_TINT = '#4B47C8';

/** The near-black the whole app sits on. */
export const BASE_COLOR = '#0B0B0C';

/** How much of the tint survives into the backdrop. Any more reads as a wash. */
const BACKDROP_WEIGHT = 0.3;

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

function toHex(n: number): string {
  return Math.round(Math.max(0, Math.min(255, n)))
    .toString(16)
    .padStart(2, '0');
}

/** `hex` laid over the base at `weight`, so every tint lands equally dark. */
export function sink(hex: string, weight: number): string {
  const c = hexToRgb(hex);
  const base = hexToRgb(BASE_COLOR);
  return `#${toHex(c.r * weight + base.r * (1 - weight))}${toHex(
    c.g * weight + base.g * (1 - weight)
  )}${toHex(c.b * weight + base.b * (1 - weight))}`;
}

export function withAlpha(hex: string, alpha: number): string {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r},${g},${b},${alpha})`;
}

/** The three stops behind every subject-scoped screen. */
export function backdropFor(tint: string): [string, string, string] {
  return [sink(tint, BACKDROP_WEIGHT), BASE_COLOR, BASE_COLOR];
}
