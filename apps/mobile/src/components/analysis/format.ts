/** Time, written the way a student reads a clock rather than a stopwatch. */

export function shortDuration(ms: number): string {
  const totalSeconds = Math.round(ms / 1000);
  if (totalSeconds < 60) return `${totalSeconds} sec`;
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  if (m < 60) return s === 0 ? `${m} min` : `${m} min ${s} sec`;
  const h = Math.floor(m / 60);
  return `${h} hr ${m % 60} min`;
}

/** For a stat tile, where the unit is already in the label. */
export function compactDuration(ms: number): string {
  const totalSeconds = Math.round(ms / 1000);
  if (totalSeconds < 60) return `${totalSeconds}s`;
  const m = Math.round(totalSeconds / 60);
  if (m < 60) return `${m}m`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

export function minutesOf(ms: number): number {
  return Math.round(ms / 60000);
}

export function titleCase(value: string): string {
  if (!value) return '';
  return value.charAt(0).toUpperCase() + value.slice(1);
}
