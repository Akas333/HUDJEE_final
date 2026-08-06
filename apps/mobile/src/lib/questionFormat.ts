/**
 * The one place in the app that knows what a question of each format looks like,
 * how its answer is entered, and how the stored answer key is read back.
 *
 * The CMS (`apps/cms/src/app/questions/new/page.tsx`) is the authority on both
 * shapes, and it stores them like this:
 *
 * | format                        | `options`                                  | `correct_answer`       |
 * | ----------------------------- | ------------------------------------------ | ---------------------- |
 * | mcq_single / assertion_reason | `[{id, text, image_url?}]`                 | `"2"` (1-based index)  |
 * | mcq_multi                     | `[{id, text, image_url?}]`                 | `"1,3"` (1-based, sorted) |
 * | integer / numerical           | `null`                                     | `"5"` / `"5.25"`       |
 * | matrix                        | `{type:'matrix', left:[…], right:[…]}`     | `"A:P,Q; B:R"`         |
 * | passage                       | `[{id, text, image_url?}]`, answered as MCQ | `"2"`                 |
 *
 * Older rows and the two other question paths in the app (Arena, Challenges)
 * also carry keys stored as the option's own `id` or as a 0-based index, so
 * `resolveCorrectIndex` accepts all three rather than trusting one.
 */

export type QuestionFormat =
  | 'mcq_single'
  | 'mcq_multi'
  | 'integer'
  | 'numerical'
  | 'assertion_reason'
  | 'passage'
  | 'matrix';

export interface NormalizedOption {
  /** The option's stored id, when it has one — the answer key may point at it. */
  id: string | null;
  text: string;
  imageUrl: string | null;
}

export interface MatrixSpec {
  left: NormalizedOption[];
  right: NormalizedOption[];
}

/**
 * How the student's response is held while they work. One shape per input kind
 * rather than one loose `any`, so a screen cannot hand a matrix answer to a
 * numeric question without the compiler saying so.
 */
export type AnswerDraft =
  /** mcq_single, assertion_reason, passage — the chosen option's index, or none. */
  | { kind: 'single'; index: number | null }
  /** mcq_multi — chosen option indices, in ascending order. */
  | { kind: 'multi'; indices: number[] }
  /** integer, numerical — exactly what the student typed. */
  | { kind: 'numeric'; text: string }
  /** matrix — left option id → the right option ids matched to it. */
  | { kind: 'matrix'; matches: Record<string, string[]> };

export interface NormalizedQuestion {
  id: string;
  format: QuestionFormat;
  /** The LaTeX/markdown body, images and all. */
  body: string;
  options: NormalizedOption[];
  matrix: MatrixSpec | null;
}

/** Formats whose answer is one or more of a list of options. */
const OPTION_FORMATS: QuestionFormat[] = ['mcq_single', 'mcq_multi', 'assertion_reason', 'passage'];

/**
 * The four choices every JEE assertion-reason question uses. The CMS offers an
 * options editor for the format but only persists `options` when the format name
 * contains "mcq", so these rows arrive with no options at all — falling back to
 * the standard four keeps them answerable instead of showing an empty question.
 */
export const ASSERTION_REASON_FALLBACK: string[] = [
  'Both A and R are true, and R is the correct explanation of A',
  'Both A and R are true, but R is not the correct explanation of A',
  'A is true but R is false',
  'A is false but R is true',
];

export const FORMAT_LABELS: Record<QuestionFormat, string> = {
  mcq_single: 'Single correct',
  mcq_multi: 'Multiple correct',
  integer: 'Integer answer',
  numerical: 'Numerical answer',
  assertion_reason: 'Assertion & reason',
  passage: 'Passage based',
  matrix: 'Matrix match',
};

/** The one line of instruction each format needs, and no more. */
export const FORMAT_HINTS: Record<QuestionFormat, string> = {
  mcq_single: 'Pick one option.',
  mcq_multi: 'Pick every option that applies.',
  integer: 'Enter a whole number.',
  numerical: 'Enter a number — decimals allowed.',
  assertion_reason: 'Read both statements, then pick one option.',
  passage: 'Answer from the passage above.',
  matrix: 'Match every row on the left to one or more on the right.',
};

function isFormat(value: unknown): value is QuestionFormat {
  return (
    value === 'mcq_single' ||
    value === 'mcq_multi' ||
    value === 'integer' ||
    value === 'numerical' ||
    value === 'assertion_reason' ||
    value === 'passage' ||
    value === 'matrix'
  );
}

function toOption(raw: any, index: number): NormalizedOption {
  // The engine used to flatten options to plain strings, and Challenges still
  // stores them that way, so a bare string has to keep working.
  if (typeof raw === 'string') return { id: null, text: raw, imageUrl: null };
  if (!raw || typeof raw !== 'object') return { id: null, text: '', imageUrl: null };
  return {
    id: raw.id != null ? String(raw.id) : null,
    text: typeof raw.text === 'string' ? raw.text : '',
    imageUrl: raw.image_url || raw.imageUrl || null,
  };
}

/** Reads whatever the API handed us into the one shape the UI renders. */
export function normalizeQuestion(raw: any): NormalizedQuestion {
  const format: QuestionFormat = isFormat(raw?.type)
    ? raw.type
    : isFormat(raw?.format)
      ? raw.format
      : 'mcq_single';

  const rawOptions = raw?.options;
  let options: NormalizedOption[] = [];
  let matrix: MatrixSpec | null = null;

  if (format === 'matrix') {
    const left = Array.isArray(rawOptions?.left) ? rawOptions.left : [];
    const right = Array.isArray(rawOptions?.right) ? rawOptions.right : [];
    matrix = { left: left.map(toOption), right: right.map(toOption) };
  } else if (Array.isArray(rawOptions)) {
    options = rawOptions.map(toOption);
  }

  if (format === 'assertion_reason' && options.length === 0) {
    options = ASSERTION_REASON_FALLBACK.map((text, i) => ({
      id: String(i + 1),
      text,
      imageUrl: null,
    }));
  }

  return {
    id: String(raw?.question_id ?? raw?.id ?? ''),
    format,
    body: typeof raw?.prompt === 'string' ? raw.prompt : (raw?.question_body ?? ''),
    options,
    matrix,
  };
}

/** The empty answer a freshly loaded question starts on. */
export function emptyDraft(question: NormalizedQuestion): AnswerDraft {
  switch (question.format) {
    case 'mcq_multi':
      return { kind: 'multi', indices: [] };
    case 'integer':
    case 'numerical':
      return { kind: 'numeric', text: '' };
    case 'matrix': {
      const matches: Record<string, string[]> = {};
      (question.matrix?.left ?? []).forEach((row, i) => {
        matches[row.id ?? String.fromCharCode(65 + i)] = [];
      });
      return { kind: 'matrix', matches };
    }
    default:
      return { kind: 'single', index: null };
  }
}

/** Whether there is enough of an answer to submit. */
export function isDraftComplete(draft: AnswerDraft): boolean {
  switch (draft.kind) {
    case 'single':
      return draft.index !== null;
    case 'multi':
      return draft.indices.length > 0;
    case 'numeric':
      return draft.text.trim().length > 0 && Number.isFinite(Number(draft.text.trim()));
    case 'matrix':
      // Every row has to be matched: a half-filled matrix is not an answer.
      return (
        Object.keys(draft.matches).length > 0 &&
        Object.values(draft.matches).every((ids) => ids.length > 0)
      );
  }
}

/**
 * The answer in the same notation the CMS stores the key in, so what we send up
 * and what sits in `questions.correct_answer` can be compared as written.
 */
export function serializeDraft(draft: AnswerDraft): string {
  switch (draft.kind) {
    case 'single':
      return draft.index === null ? '' : String(draft.index + 1);
    case 'multi':
      return draft.indices
        .map((i) => String(i + 1))
        .sort()
        .join(',');
    case 'numeric':
      return draft.text.trim();
    case 'matrix':
      return Object.entries(draft.matches)
        .filter(([, ids]) => ids.length > 0)
        .map(([leftId, ids]) => `${leftId}:${[...ids].sort().join(',')}`)
        .join('; ');
  }
}

/**
 * Which option a stored key points at. The key may be the option's own id, a
 * 1-based index (what the CMS writes today), or a 0-based index (older rows and
 * the Arena/Challenges paths) — checked in that order. Returns -1 for none.
 */
export function resolveCorrectIndex(options: NormalizedOption[], key: unknown): number {
  if (key == null || key === '') return -1;
  const token = String(key).trim();

  const byId = options.findIndex((o) => o.id != null && o.id === token);
  if (byId >= 0) return byId;

  const n = Number(token);
  if (!Number.isInteger(n)) return -1;
  if (n >= 1 && n <= options.length) return n - 1;
  if (n >= 0 && n < options.length) return n;
  return -1;
}

/** Every option index a key names — one for single-answer formats, many for mcq_multi. */
export function resolveCorrectIndices(options: NormalizedOption[], key: unknown): number[] {
  if (key == null) return [];
  return String(key)
    .split(',')
    .map((part) => resolveCorrectIndex(options, part))
    .filter((i) => i >= 0)
    .sort((a, b) => a - b);
}

/** `"A:P,Q; B:R"` → `{ A: ['P','Q'], B: ['R'] }`, ordering thrown away. */
export function parseMatrixKey(key: unknown): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  if (key == null) return out;
  for (const pair of String(key).split(';')) {
    const [left, right] = pair.split(':');
    if (!left || right == null) continue;
    out[left.trim()] = right
      .split(',')
      .map((r) => r.trim())
      .filter(Boolean)
      .sort();
  }
  return out;
}

/**
 * Numeric answers compare as numbers, not as text: `"5.0"`, `"5"` and `" 5 "`
 * are the same answer, and a key authored as `0.30` must accept `0.3`. The
 * tolerance is relative so large answers are not held to absolute precision.
 */
function numbersMatch(a: number, b: number): boolean {
  return Math.abs(a - b) <= 1e-6 * Math.max(1, Math.abs(b));
}

/** Grades a draft against the stored key. Unanswerable input grades as wrong. */
export function gradeDraft(
  question: NormalizedQuestion,
  draft: AnswerDraft,
  correctAnswer: unknown
): boolean {
  switch (draft.kind) {
    case 'single': {
      if (draft.index === null) return false;
      return resolveCorrectIndex(question.options, correctAnswer) === draft.index;
    }
    case 'multi': {
      const expected = resolveCorrectIndices(question.options, correctAnswer);
      if (expected.length === 0) return false;
      const picked = [...draft.indices].sort((a, b) => a - b);
      return expected.length === picked.length && expected.every((v, i) => v === picked[i]);
    }
    case 'numeric': {
      const given = Number(draft.text.trim());
      const expected = Number(String(correctAnswer ?? '').trim());
      if (!Number.isFinite(given) || !Number.isFinite(expected)) return false;
      // An integer question is answered with an integer, whatever was typed.
      if (question.format === 'integer' && !Number.isInteger(given)) return false;
      return numbersMatch(given, expected);
    }
    case 'matrix': {
      const expected = parseMatrixKey(correctAnswer);
      const rows = Object.keys(expected);
      if (rows.length === 0) return false;
      const given = draft.matches;
      // Rows the key leaves out must be left empty, so extra matches are wrong.
      const answeredRows = Object.keys(given).filter((r) => (given[r] ?? []).length > 0);
      if (answeredRows.length !== rows.length) return false;
      return rows.every((row) => {
        const a = [...(given[row] ?? [])].sort();
        const b = expected[row];
        return a.length === b.length && a.every((v, i) => v === b[i]);
      });
    }
  }
}

export function isOptionFormat(format: QuestionFormat): boolean {
  return OPTION_FORMATS.includes(format);
}

// ─── body content ────────────────────────────────────────────────────────────

export type ContentBlock =
  | { kind: 'text'; text: string }
  | { kind: 'image'; url: string; alt: string };

/**
 * Markdown image syntax is how the CMS drops a diagram into a body or a
 * solution — pasting an image into either editor appends `![image](url)`. The
 * rest of the string is LaTeX, which renders as plain text until a math
 * renderer lands.
 */
const IMAGE_PATTERN = /!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;

export function parseContent(raw: string | null | undefined): ContentBlock[] {
  const source = raw ?? '';
  const blocks: ContentBlock[] = [];
  let cursor = 0;

  IMAGE_PATTERN.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = IMAGE_PATTERN.exec(source)) !== null) {
    const text = source.slice(cursor, match.index).trim();
    if (text) blocks.push({ kind: 'text', text });
    blocks.push({ kind: 'image', url: match[2], alt: match[1] || 'Diagram' });
    cursor = match.index + match[0].length;
  }

  const tail = source.slice(cursor).trim();
  if (tail) blocks.push({ kind: 'text', text: tail });

  return blocks;
}
