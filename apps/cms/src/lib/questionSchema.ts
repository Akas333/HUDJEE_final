/**
 * The one place in the CMS that knows what a question of each format looks like:
 * which editor it needs, how its `options` and `correct_answer` are stored, and
 * what makes it invalid.
 *
 * The app reads these two columns back through `apps/mobile/src/lib/questionFormat.ts`,
 * which documents the contract from the consuming side. The two files have to agree:
 *
 * | format                        | `options`                              | `correct_answer`          |
 * | ----------------------------- | -------------------------------------- | ------------------------- |
 * | mcq_single / assertion_reason | `[{id, text, image_url?}]`             | `"2"` (1-based index)     |
 * | passage                       | `[{id, text, image_url?}]`             | `"2"` (1-based index)     |
 * | mcq_multi                     | `[{id, text, image_url?}]`             | `"1,3"` (1-based, sorted) |
 * | integer / numerical           | `null`                                 | `"5"` / `"5.25"`          |
 * | matrix                        | `{type:'matrix', left:[…], right:[…]}` | `"A:P,Q; B:R"`            |
 *
 * The answer key for the option formats is a *position*, not an option id. That is
 * the whole reason `removeOption` and `moveOption` live here rather than in the
 * component: deleting option 2 of 4 has to rewrite the key, or it silently starts
 * pointing at a different option and every student gets graded against the wrong one.
 */

export type QuestionFormat =
  | 'mcq_single'
  | 'mcq_multi'
  | 'integer'
  | 'numerical'
  | 'assertion_reason'
  | 'passage'
  | 'matrix';

export const QUESTION_FORMATS: QuestionFormat[] = [
  'mcq_single',
  'mcq_multi',
  'integer',
  'numerical',
  'assertion_reason',
  'passage',
  'matrix',
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

/** Shown under the format picker so the author knows what the student will see. */
export const FORMAT_HINTS: Record<QuestionFormat, string> = {
  mcq_single: 'Student picks exactly one option.',
  mcq_multi: 'Student picks every option that applies — all of them must match to score.',
  integer: 'Student types a whole number.',
  numerical: 'Student types a number; decimals are accepted within a small tolerance.',
  assertion_reason: 'Assertion and Reason in the body, then the four standard choices.',
  passage: 'Passage in the body, then one set of options.',
  matrix: 'Student matches every row on the left to one or more entries on the right.',
};

/**
 * The four choices every JEE assertion-reason question uses. Prefilled so the
 * author does not retype them, and so the app never has to fall back to its own
 * hardcoded copy of the same list.
 */
export const ASSERTION_REASON_OPTIONS: string[] = [
  'Both A and R are true, and R is the correct explanation of A',
  'Both A and R are true, but R is not the correct explanation of A',
  'A is true but R is false',
  'A is false but R is true',
];

/**
 * `pyq_paper` is a checked TEXT column — `CHECK (pyq_paper IN ('jee_main','jee_advanced'))`.
 * A number here passes silently into the review queue's JSONB and only fails weeks
 * later, when a reviewer clicks Approve and the insert hits the constraint.
 */
export const PYQ_PAPERS = [
  { value: 'jee_main', label: 'JEE Main' },
  { value: 'jee_advanced', label: 'JEE Advanced' },
] as const;

export const DIFFICULTIES = ['easy', 'medium', 'hard'] as const;

export const AUTHOR_BUCKETS = [
  { value: 'easy', label: 'Easy', b: -2.5 },
  { value: 'slightly_easy', label: 'Slightly easy', b: -1.5 },
  { value: 'medium', label: 'Medium', b: -0.5 },
  { value: 'slightly_medium', label: 'Slightly medium', b: 0.5 },
  { value: 'slightly_hard', label: 'Slightly hard', b: 1.5 },
  { value: 'hard', label: 'Hard', b: 2.5 },
] as const;

export interface OptionDraft {
  id: string;
  text: string;
  image_url?: string;
}

export interface MatrixRowDraft {
  id: string;
  text: string;
}

/** Everything the form holds while the author works. */
export interface QuestionDraft {
  subject: string;
  chapter_id: string;
  concept_id: string;
  format: QuestionFormat;
  difficulty: string;
  source_type: 'pyq' | 'non_pyq';
  pyq_year: string;
  pyq_paper: string;
  pyq_shift: string;
  question_body: string;
  solution: string;
  published: boolean;
  author_difficulty_bucket: string;
  author_prior_b: number;
  /** Option formats only. */
  options: OptionDraft[];
  /** Which options are correct, as 0-based indices into `options`. */
  correctIndices: number[];
  /** Numeric formats only — kept as typed so a trailing "." survives editing. */
  numericAnswer: string;
  /** Matrix only. */
  matrixLeft: MatrixRowDraft[];
  matrixRight: MatrixRowDraft[];
  matrixMatches: Record<string, string[]>;
}

// ─── format capabilities ─────────────────────────────────────────────────────

const OPTION_FORMATS: QuestionFormat[] = [
  'mcq_single',
  'mcq_multi',
  'assertion_reason',
  'passage',
];

/**
 * Whether the format is answered by choosing from a list. `assertion_reason` and
 * `passage` are in here deliberately — the old form rendered an options editor for
 * assertion_reason but only persisted options when the format name contained "mcq",
 * so those options were collected from the author and then dropped on save.
 */
export function usesOptions(format: QuestionFormat): boolean {
  return OPTION_FORMATS.includes(format);
}

export function usesMatrix(format: QuestionFormat): boolean {
  return format === 'matrix';
}

export function usesNumeric(format: QuestionFormat): boolean {
  return format === 'integer' || format === 'numerical';
}

/** Whether more than one option may be correct. */
export function allowsMultipleCorrect(format: QuestionFormat): boolean {
  return format === 'mcq_multi';
}

export function isQuestionFormat(value: unknown): value is QuestionFormat {
  return QUESTION_FORMATS.includes(value as QuestionFormat);
}

// ─── option list edits ───────────────────────────────────────────────────────

let optionSeq = 0;

/** Option ids only need to be unique within the question; React keys use them. */
export function newOptionId(): string {
  optionSeq += 1;
  return `${Date.now().toString(36)}-${optionSeq}`;
}

export function blankOption(): OptionDraft {
  return { id: newOptionId(), text: '' };
}

/**
 * Removes an option and rewrites the answer key around the hole: keys above the
 * removed index shift down by one, and a key *on* it is dropped.
 */
export function removeOption(
  options: OptionDraft[],
  correctIndices: number[],
  index: number
): { options: OptionDraft[]; correctIndices: number[] } {
  return {
    options: options.filter((_, i) => i !== index),
    correctIndices: correctIndices
      .filter((i) => i !== index)
      .map((i) => (i > index ? i - 1 : i)),
  };
}

/** Moves an option one slot up or down, carrying its correct-answer flag with it. */
export function moveOption(
  options: OptionDraft[],
  correctIndices: number[],
  from: number,
  to: number
): { options: OptionDraft[]; correctIndices: number[] } {
  if (to < 0 || to >= options.length || from === to) {
    return { options, correctIndices };
  }

  const next = [...options];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);

  // Re-derive the key from which options were flagged, not from arithmetic on the
  // old indices — a swap is easier to get right by identity than by offset.
  const wasCorrect = new Set(correctIndices.map((i) => options[i]?.id));
  const remapped = next
    .map((opt, i) => (wasCorrect.has(opt.id) ? i : -1))
    .filter((i) => i >= 0);

  return { options: next, correctIndices: remapped };
}

// ─── matrix edits ────────────────────────────────────────────────────────────

/** Left rows are labelled A, B, C…; right rows P, Q, R…, as JEE papers print them. */
export function matrixLeftId(index: number): string {
  return String.fromCharCode(65 + index);
}

export function matrixRightId(index: number): string {
  return String.fromCharCode(80 + index);
}

/**
 * Rebuilds row ids after an add or remove so they stay a contiguous A, B, C…,
 * and moves the existing matches onto the new labels.
 */
export function relabelMatrix(
  left: MatrixRowDraft[],
  right: MatrixRowDraft[],
  matches: Record<string, string[]>
): { left: MatrixRowDraft[]; right: MatrixRowDraft[]; matches: Record<string, string[]> } {
  const rightIdByOldId = new Map<string, string>();
  const nextRight = right.map((row, i) => {
    const id = matrixRightId(i);
    rightIdByOldId.set(row.id, id);
    return { ...row, id };
  });

  const nextMatches: Record<string, string[]> = {};
  const nextLeft = left.map((row, i) => {
    const id = matrixLeftId(i);
    nextMatches[id] = (matches[row.id] ?? [])
      .map((oldRightId) => rightIdByOldId.get(oldRightId))
      .filter((v): v is string => Boolean(v));
    return { ...row, id };
  });

  return { left: nextLeft, right: nextRight, matches: nextMatches };
}

// ─── serialization ───────────────────────────────────────────────────────────

/** The `options` JSONB column, exactly as the app expects to read it back. */
export function serializeOptions(draft: QuestionDraft): unknown {
  if (usesMatrix(draft.format)) {
    return {
      type: 'matrix',
      left: draft.matrixLeft.map((row) => ({ id: row.id, text: row.text.trim() })),
      right: draft.matrixRight.map((row) => ({ id: row.id, text: row.text.trim() })),
    };
  }

  if (usesOptions(draft.format)) {
    return draft.options.map((opt) => {
      const out: OptionDraft = { id: opt.id, text: opt.text.trim() };
      if (opt.image_url) out.image_url = opt.image_url;
      return out;
    });
  }

  return null;
}

/** The `correct_answer` column, in the notation each format stores. */
export function serializeAnswer(draft: QuestionDraft): string {
  if (usesMatrix(draft.format)) {
    return draft.matrixLeft
      .map((row) => {
        const ids = [...(draft.matrixMatches[row.id] ?? [])].sort();
        return ids.length > 0 ? `${row.id}:${ids.join(',')}` : null;
      })
      .filter(Boolean)
      .join('; ');
  }

  if (usesNumeric(draft.format)) {
    return draft.numericAnswer.trim();
  }

  if (usesOptions(draft.format)) {
    // 1-based positions, ascending — sorted numerically, since a plain string sort
    // puts "10" before "2" once a question has more than nine options.
    return [...draft.correctIndices]
      .sort((a, b) => a - b)
      .map((i) => String(i + 1))
      .join(',');
  }

  return '';
}

/** The row as it goes to the API. Keys here must all be real `questions` columns. */
export function serializeQuestion(draft: QuestionDraft) {
  const isPyq = draft.source_type === 'pyq';

  return {
    subject: draft.subject,
    chapter_id: draft.chapter_id,
    concept_id: draft.concept_id,
    format: draft.format,
    difficulty: draft.difficulty,
    source_type: draft.source_type,
    pyq_year: isPyq && draft.pyq_year ? parseInt(draft.pyq_year, 10) : null,
    // Both are TEXT columns; `pyq_paper` is additionally constrained to two values.
    pyq_paper: isPyq && draft.pyq_paper ? draft.pyq_paper : null,
    pyq_shift: isPyq && draft.pyq_shift ? draft.pyq_shift.trim() : null,
    question_body: draft.question_body.trim(),
    options: serializeOptions(draft),
    correct_answer: serializeAnswer(draft),
    solution: draft.solution.trim(),
    published: draft.published,
    author_difficulty_bucket: draft.author_difficulty_bucket || draft.difficulty,
    author_prior_b: Number.isFinite(draft.author_prior_b) ? draft.author_prior_b : 0,
  };
}

// ─── deserialization (edit mode) ─────────────────────────────────────────────

function toOptionDrafts(raw: unknown): OptionDraft[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item: any) => {
    if (typeof item === 'string') return { id: newOptionId(), text: item };
    return {
      id: item?.id != null ? String(item.id) : newOptionId(),
      text: typeof item?.text === 'string' ? item.text : '',
      ...(item?.image_url ? { image_url: String(item.image_url) } : {}),
    };
  });
}

/** `"1,3"` → `[0, 2]`, tolerating keys stored as an option id or 0-based index. */
export function parseCorrectIndices(options: OptionDraft[], key: unknown): number[] {
  if (key == null || key === '') return [];

  const indices = String(key)
    .split(',')
    .map((part) => {
      const token = part.trim();
      if (!token) return -1;

      const byId = options.findIndex((o) => o.id === token);
      if (byId >= 0) return byId;

      const n = Number(token);
      if (!Number.isInteger(n)) return -1;
      if (n >= 1 && n <= options.length) return n - 1;
      // Older rows and the Arena/Challenges paths wrote 0-based keys.
      if (n >= 0 && n < options.length) return n;
      return -1;
    })
    .filter((i) => i >= 0);

  return Array.from(new Set(indices)).sort((a, b) => a - b);
}

/** `"A:P,Q; B:R"` → `{ A: ['P','Q'], B: ['R'] }`. */
export function parseMatrixKey(key: unknown): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  if (key == null) return out;

  for (const pair of String(key).split(';')) {
    const [left, right] = pair.split(':');
    if (!left || right == null) continue;
    out[left.trim()] = right
      .split(',')
      .map((r) => r.trim())
      .filter(Boolean);
  }
  return out;
}

export function emptyDraft(overrides: Partial<QuestionDraft> = {}): QuestionDraft {
  return {
    subject: 'physics',
    chapter_id: '',
    concept_id: '',
    format: 'mcq_single',
    difficulty: 'medium',
    source_type: 'non_pyq',
    pyq_year: '',
    pyq_paper: '',
    pyq_shift: '',
    question_body: '',
    solution: '',
    published: false,
    author_difficulty_bucket: '',
    author_prior_b: 0,
    options: [blankOption(), blankOption(), blankOption(), blankOption()],
    correctIndices: [],
    numericAnswer: '',
    matrixLeft: [0, 1, 2, 3].map((i) => ({ id: matrixLeftId(i), text: '' })),
    matrixRight: [0, 1, 2, 3].map((i) => ({ id: matrixRightId(i), text: '' })),
    matrixMatches: { A: [], B: [], C: [], D: [] },
    ...overrides,
  };
}

/** A saved row (or a pending `after_state`) back into a draft the form can edit. */
export function draftFromRow(row: any): QuestionDraft {
  const format: QuestionFormat = isQuestionFormat(row?.format) ? row.format : 'mcq_single';
  const base = emptyDraft();

  let options = usesOptions(format) ? toOptionDrafts(row?.options) : base.options;

  // Assertion-reason rows saved before the CMS persisted their options arrive with
  // `options: null` but a valid answer key — the app was rendering its own copy of
  // the four standard choices, so the key means a position in *that* list. Restoring
  // it here makes those rows editable, and re-saving finally stores the options.
  if (format === 'assertion_reason' && options.length === 0) {
    options = ASSERTION_REASON_OPTIONS.map((text) => ({ id: newOptionId(), text }));
  }
  const matrixLeft = toOptionDrafts(row?.options?.left);
  const matrixRight = toOptionDrafts(row?.options?.right);
  const storedMatches = parseMatrixKey(row?.correct_answer);

  return {
    ...base,
    subject: row?.subject || base.subject,
    chapter_id: row?.chapter_id || '',
    concept_id: row?.concept_id || '',
    format,
    difficulty: row?.difficulty || base.difficulty,
    source_type: row?.source_type === 'pyq' ? 'pyq' : 'non_pyq',
    pyq_year: row?.pyq_year != null ? String(row.pyq_year) : '',
    pyq_paper: row?.pyq_paper != null ? String(row.pyq_paper) : '',
    pyq_shift: row?.pyq_shift != null ? String(row.pyq_shift) : '',
    question_body: row?.question_body || '',
    solution: row?.solution || '',
    published: Boolean(row?.published),
    author_difficulty_bucket: row?.author_difficulty_bucket || '',
    author_prior_b: typeof row?.author_prior_b === 'number' ? row.author_prior_b : 0,
    options: options.length > 0 ? options : base.options,
    correctIndices: usesOptions(format) ? parseCorrectIndices(options, row?.correct_answer) : [],
    numericAnswer: usesNumeric(format) ? String(row?.correct_answer ?? '') : '',
    matrixLeft: matrixLeft.length > 0 ? matrixLeft : base.matrixLeft,
    matrixRight: matrixRight.length > 0 ? matrixRight : base.matrixRight,
    matrixMatches:
      Object.keys(storedMatches).length > 0
        ? // Every left row needs a key, including the ones the stored answer left out.
          Object.fromEntries(
            (matrixLeft.length > 0 ? matrixLeft : base.matrixLeft).map((row_) => [
              row_.id,
              storedMatches[row_.id] ?? [],
            ])
          )
        : base.matrixMatches,
  };
}

// ─── validation ──────────────────────────────────────────────────────────────

/**
 * Which part of the form a problem belongs to, so the page can put the message
 * next to the field instead of in a toast the author has to decode.
 */
export type QuestionField =
  | 'chapter_id'
  | 'concept_id'
  | 'question_body'
  | 'options'
  | 'correct_answer'
  | 'solution'
  | 'pyq_year'
  | 'pyq_paper';

export interface ValidationIssue {
  field: QuestionField;
  message: string;
  /** Blocking issues stop a save; warnings are advisory. */
  severity: 'error' | 'warning';
}

/**
 * Everything that makes a question unusable once it reaches a student. The
 * important ones are the answer-key checks: `correct_answer` is `NOT NULL` but an
 * empty string satisfies that, so before this existed an MCQ with no option ticked
 * would publish cleanly and then mark every student wrong.
 */
export function validateQuestion(draft: QuestionDraft): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!draft.chapter_id) {
    issues.push({ field: 'chapter_id', message: 'Pick a chapter.', severity: 'error' });
  }
  if (!draft.concept_id) {
    issues.push({ field: 'concept_id', message: 'Pick a concept.', severity: 'error' });
  }
  if (!draft.question_body.trim()) {
    issues.push({ field: 'question_body', message: 'The question body is empty.', severity: 'error' });
  }

  if (usesOptions(draft.format)) {
    const filled = draft.options.filter((o) => o.text.trim() || o.image_url);

    if (filled.length < 2) {
      issues.push({
        field: 'options',
        message: 'A question needs at least two options.',
        severity: 'error',
      });
    }
    if (filled.length !== draft.options.length) {
      issues.push({
        field: 'options',
        message: 'Every option needs text or an image — remove the blank ones.',
        severity: 'error',
      });
    }
    if (draft.correctIndices.length === 0) {
      issues.push({
        field: 'correct_answer',
        message: 'Mark which option is correct.',
        severity: 'error',
      });
    }
    if (!allowsMultipleCorrect(draft.format) && draft.correctIndices.length > 1) {
      issues.push({
        field: 'correct_answer',
        message: 'This format takes exactly one correct option.',
        severity: 'error',
      });
    }
    if (allowsMultipleCorrect(draft.format) && draft.correctIndices.length === draft.options.length) {
      issues.push({
        field: 'correct_answer',
        message: 'Every option is marked correct — check that this is intended.',
        severity: 'warning',
      });
    }
  }

  if (usesNumeric(draft.format)) {
    const raw = draft.numericAnswer.trim();
    if (!raw) {
      issues.push({ field: 'correct_answer', message: 'Enter the answer.', severity: 'error' });
    } else if (!Number.isFinite(Number(raw))) {
      issues.push({
        field: 'correct_answer',
        message: `"${raw}" is not a number.`,
        severity: 'error',
      });
    } else if (draft.format === 'integer' && !Number.isInteger(Number(raw))) {
      issues.push({
        field: 'correct_answer',
        message: 'An integer question needs a whole number.',
        severity: 'error',
      });
    }
  }

  if (usesMatrix(draft.format)) {
    if (draft.matrixLeft.some((row) => !row.text.trim())) {
      issues.push({ field: 'options', message: 'Every left row needs text.', severity: 'error' });
    }
    if (draft.matrixRight.some((row) => !row.text.trim())) {
      issues.push({ field: 'options', message: 'Every right row needs text.', severity: 'error' });
    }
    // The app grades a matrix as wrong unless every keyed row matches exactly, and
    // treats rows missing from the key as "must be left empty" — so a half-filled
    // key is not a lenient key, it is a broken one.
    const unmatched = draft.matrixLeft.filter(
      (row) => (draft.matrixMatches[row.id] ?? []).length === 0
    );
    if (unmatched.length > 0) {
      issues.push({
        field: 'correct_answer',
        message: `Match every row — ${unmatched.map((r) => r.id).join(', ')} ${
          unmatched.length === 1 ? 'has' : 'have'
        } no match yet.`,
        severity: 'error',
      });
    }
  }

  if (draft.source_type === 'pyq') {
    const year = parseInt(draft.pyq_year, 10);
    if (!draft.pyq_year) {
      issues.push({ field: 'pyq_year', message: 'PYQ questions need a year.', severity: 'error' });
    } else if (!Number.isInteger(year) || year < 1990 || year > new Date().getFullYear()) {
      issues.push({ field: 'pyq_year', message: 'That year looks wrong.', severity: 'error' });
    }
    if (!draft.pyq_paper) {
      issues.push({ field: 'pyq_paper', message: 'Pick which paper this came from.', severity: 'error' });
    } else if (!PYQ_PAPERS.some((p) => p.value === draft.pyq_paper)) {
      issues.push({
        field: 'pyq_paper',
        message: 'Paper must be JEE Main or JEE Advanced.',
        severity: 'error',
      });
    }
  }

  if (!draft.solution.trim()) {
    issues.push({
      field: 'solution',
      message: 'No solution — students will see a blank explanation.',
      severity: 'warning',
    });
  }

  return issues;
}

export function blockingIssues(issues: ValidationIssue[]): ValidationIssue[] {
  return issues.filter((i) => i.severity === 'error');
}

/** First message per field, for rendering inline under the offending input. */
export function issuesByField(issues: ValidationIssue[]): Partial<Record<QuestionField, ValidationIssue>> {
  const out: Partial<Record<QuestionField, ValidationIssue>> = {};
  for (const issue of issues) {
    const existing = out[issue.field];
    if (!existing || (existing.severity === 'warning' && issue.severity === 'error')) {
      out[issue.field] = issue;
    }
  }
  return out;
}
