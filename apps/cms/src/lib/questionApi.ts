import { createClient } from '@supabase/supabase-js';
import {
  DIFFICULTIES,
  PYQ_PAPERS,
  isQuestionFormat,
  usesMatrix,
  usesNumeric,
  usesOptions,
} from './questionSchema';

/** Service-role client. Every write in the CMS goes through one of these routes. */
export const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface Author {
  id: string;
  name: string;
}

/**
 * Who is making this change, taken from the caller's Supabase session rather than
 * from the request body.
 *
 * The body would be simpler and is what the client could just send — but it is also
 * trivially forgeable, and these values decide what `employee_stats` reports and
 * whose name a reviewer sees on a submission. All three write paths used to hardcode
 * `created_by_name: 'Admin'` and never set `created_by` at all, which left the team
 * dashboard counting zero questions for everyone.
 *
 * Returns null when there is no usable session; callers decide whether to proceed.
 */
export async function resolveAuthor(request: Request): Promise<Author | null> {
  const header = request.headers.get('authorization');
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return null;

  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) return null;

  const { data: profile } = await admin
    .from('profiles')
    .select('username, role')
    .eq('id', data.user.id)
    .single();

  // Only CMS staff may author content, whatever the token belongs to.
  if (!profile || !['employee', 'admin', 'superadmin'].includes(profile.role)) return null;

  return { id: data.user.id, name: profile.username || data.user.email || 'Unknown' };
}

/**
 * The last gate before Postgres.
 *
 * The form validates the same things far more helpfully, but it validates a *draft*;
 * this validates the *row*, and it is the only check that still runs if a payload
 * arrives from anywhere else. It deliberately repeats the checks that the database
 * cannot make itself: `correct_answer` is `NOT NULL`, but an empty string satisfies
 * that, so without this an unanswerable question inserts cleanly.
 */
export function validateQuestionRow(row: any): string | null {
  if (!row || typeof row !== 'object') return 'Malformed payload.';

  if (!isQuestionFormat(row.format)) return `Unknown format "${row.format}".`;
  if (!['physics', 'chemistry', 'maths'].includes(row.subject)) {
    return `Unknown subject "${row.subject}".`;
  }
  if (!DIFFICULTIES.includes(row.difficulty)) return `Unknown difficulty "${row.difficulty}".`;
  if (!row.chapter_id || !row.concept_id) return 'A question needs a chapter and a concept.';
  if (typeof row.question_body !== 'string' || !row.question_body.trim()) {
    return 'The question body is empty.';
  }

  const key = typeof row.correct_answer === 'string' ? row.correct_answer.trim() : '';
  if (!key) return 'The question has no correct answer set.';

  if (usesOptions(row.format)) {
    if (!Array.isArray(row.options) || row.options.length < 2) {
      return 'This format needs at least two options.';
    }
    if (row.options.some((o: any) => !String(o?.text ?? '').trim() && !o?.image_url)) {
      return 'Every option needs text or an image.';
    }
    const positions = key.split(',').map((p: string) => Number(p.trim()));
    if (positions.some((n: number) => !Number.isInteger(n) || n < 1 || n > row.options.length)) {
      return 'The answer key points outside the option list.';
    }
    if (row.format !== 'mcq_multi' && positions.length > 1) {
      return 'This format takes exactly one correct option.';
    }
  }

  if (usesNumeric(row.format)) {
    if (!Number.isFinite(Number(key))) return 'The answer is not a number.';
    if (row.format === 'integer' && !Number.isInteger(Number(key))) {
      return 'An integer question needs a whole number.';
    }
  }

  if (usesMatrix(row.format)) {
    const left = row.options?.left;
    if (!Array.isArray(left) || left.length === 0) return 'The matrix has no rows.';
    const keyed = new Set(
      key
        .split(';')
        .map((pair: string) => pair.split(':')[0]?.trim())
        .filter(Boolean)
    );
    if (left.some((r: any) => !keyed.has(r?.id))) return 'Every matrix row needs a match.';
  }

  if (row.source_type === 'pyq') {
    if (row.pyq_paper && !PYQ_PAPERS.some((p) => p.value === row.pyq_paper)) {
      // The column is CHECK-constrained; catching it here gives a readable message
      // instead of a raw constraint violation surfacing at approval time.
      return 'Paper must be jee_main or jee_advanced.';
    }
  } else if (row.pyq_year || row.pyq_paper || row.pyq_shift) {
    return 'PYQ details were sent on a non-PYQ question.';
  }

  return null;
}

/** Only real `questions` columns, so an extra client-side key cannot break the insert. */
const COLUMNS = [
  'subject',
  'chapter_id',
  'concept_id',
  'format',
  'difficulty',
  'source_type',
  'pyq_year',
  'pyq_paper',
  'pyq_shift',
  'question_body',
  'options',
  'correct_answer',
  'solution',
  'published',
  'author_difficulty_bucket',
  'author_prior_b',
] as const;

export function pickColumns(body: any, author: Author | null) {
  const row: Record<string, unknown> = {};
  for (const key of COLUMNS) {
    if (body[key] !== undefined) row[key] = body[key];
  }
  // `solution` is NOT NULL in the schema, and an author may legitimately save
  // without one — the form warns rather than blocks.
  row.solution = typeof body.solution === 'string' ? body.solution : '';
  if (author) row.created_by = author.id;
  return row;
}
