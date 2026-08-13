'use client';

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  RotateCcw,
  Save,
  Sparkles,
  Wand2,
} from 'lucide-react';
import { Toast } from '@/components/Toast';
import { supabase } from '@/lib/supabase';
import LatexField from '@/components/questions/LatexField';
import OptionsEditor from '@/components/questions/OptionsEditor';
import MatrixEditor from '@/components/questions/MatrixEditor';
import NumericAnswer from '@/components/questions/NumericAnswer';
import TaxonomyPicker from '@/components/questions/TaxonomyPicker';
import QuestionPreview from '@/components/questions/QuestionPreview';
import {
  ASSERTION_REASON_OPTIONS,
  AUTHOR_BUCKETS,
  DIFFICULTIES,
  FORMAT_HINTS,
  FORMAT_LABELS,
  PYQ_PAPERS,
  QUESTION_FORMATS,
  blockingIssues,
  draftFromRow,
  emptyDraft,
  issuesByField,
  newOptionId,
  serializeQuestion,
  usesMatrix,
  usesNumeric,
  usesOptions,
  validateQuestion,
  type QuestionDraft,
  type QuestionFormat,
} from '@/lib/questionSchema';

/**
 * Where an in-progress new question is parked. Authoring one question can take ten
 * minutes of typing LaTeX; before this, a refresh or a stray back-navigation threw
 * all of it away. Edit mode deliberately does not autosave — restoring a stale local
 * copy over a freshly fetched row would quietly resurrect old content.
 */
const DRAFT_KEY = 'hudjee-cms:question-draft';

/** The fields that carry over to the next question in a batch. */
function carryOver(draft: QuestionDraft): QuestionDraft {
  return emptyDraft({
    subject: draft.subject,
    chapter_id: draft.chapter_id,
    concept_id: draft.concept_id,
    format: draft.format,
    difficulty: draft.difficulty,
    source_type: draft.source_type,
    pyq_year: draft.pyq_year,
    pyq_paper: draft.pyq_paper,
    pyq_shift: draft.pyq_shift,
    published: draft.published,
    // The four standard choices are part of the format, not of the last question.
    ...(draft.format === 'assertion_reason'
      ? { options: ASSERTION_REASON_OPTIONS.map((text) => ({ id: newOptionId(), text })) }
      : {}),
  });
}

function NewQuestionForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const editId = searchParams.get('id');
  const isEditing = Boolean(editId);

  const [draft, setDraft] = useState<QuestionDraft>(() =>
    emptyDraft({
      subject: searchParams.get('subject') || 'physics',
      chapter_id: searchParams.get('chapter_id') || '',
      concept_id: searchParams.get('concept_id') || '',
    })
  );

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(isEditing);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const [savedCount, setSavedCount] = useState(0);
  const [recoverable, setRecoverable] = useState<QuestionDraft | null>(null);

  const bodyAnchorRef = useRef<HTMLDivElement>(null);

  const issues = useMemo(() => validateQuestion(draft), [draft]);
  const errors = useMemo(() => blockingIssues(issues), [issues]);
  const fieldIssues = useMemo(() => issuesByField(issues), [issues]);

  /** Only surface a field-level error once the author has tried to save. */
  const errorFor = (field: keyof typeof fieldIssues) => {
    const issue = fieldIssues[field];
    return attempted && issue?.severity === 'error' ? issue.message : undefined;
  };
  const warningFor = (field: keyof typeof fieldIssues) => {
    const issue = fieldIssues[field];
    return issue?.severity === 'warning' ? issue.message : undefined;
  };

  const patch = useCallback((update: Partial<QuestionDraft>) => {
    setDraft((prev) => ({ ...prev, ...update }));
  }, []);

  // ─── load (edit mode) ──────────────────────────────────────────────────────

  useEffect(() => {
    if (!editId) return;
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch(`/api/questions/${editId}`);
        const data = await res.json();
        if (cancelled) return;
        if (data?.error) throw new Error(data.error);
        setDraft(draftFromRow(data));
      } catch (err: any) {
        if (!cancelled) setToast({ message: err?.message || 'Could not load question.', type: 'error' });
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [editId]);

  // ─── autosave (new questions only) ─────────────────────────────────────────

  useEffect(() => {
    if (isEditing) return;
    try {
      const stored = window.localStorage.getItem(DRAFT_KEY);
      if (!stored) return;
      const parsed = JSON.parse(stored) as QuestionDraft;
      if (parsed?.question_body?.trim()) setRecoverable(parsed);
    } catch {
      // A malformed draft is not worth surfacing — drop it.
      window.localStorage.removeItem(DRAFT_KEY);
    }
  }, [isEditing]);

  useEffect(() => {
    if (isEditing || isLoading) return;
    // Debounced so a long body is not re-serialized on every keystroke.
    const timer = setTimeout(() => {
      try {
        if (draft.question_body.trim()) {
          window.localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
        }
      } catch {
        // Storage full or blocked — autosave is a convenience, not a guarantee.
      }
    }, 800);
    return () => clearTimeout(timer);
  }, [draft, isEditing, isLoading]);

  // ─── save ──────────────────────────────────────────────────────────────────

  const save = useCallback(
    async (mode: 'close' | 'again') => {
      setAttempted(true);

      const blocking = blockingIssues(validateQuestion(draft));
      if (blocking.length > 0) {
        setToast({
          message: `${blocking.length} thing${blocking.length === 1 ? '' : 's'} to fix before saving.`,
          type: 'error',
        });
        return;
      }

      setIsSaving(true);
      try {
        const { data } = await supabase.auth.getSession();
        const res = await fetch(editId ? `/api/questions/${editId}` : '/api/questions', {
          method: editId ? 'PUT' : 'POST',
          headers: {
            'Content-Type': 'application/json',
            // Lets the route attribute the row to a real user instead of "Admin".
            ...(data.session?.access_token
              ? { Authorization: `Bearer ${data.session.access_token}` }
              : {}),
          },
          body: JSON.stringify(serializeQuestion(draft)),
        });

        const payload = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(payload?.error || 'Save failed.');

        window.localStorage.removeItem(DRAFT_KEY);

        const queued = payload?.is_pending_review;
        const verb = editId ? 'updated' : 'saved';
        setToast({
          message: queued ? `Question ${verb} and sent for review.` : `Question ${verb} and published.`,
          type: 'success',
        });

        if (mode === 'again') {
          setSavedCount((n) => n + 1);
          setDraft(carryOver(draft));
          setAttempted(false);
          bodyAnchorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else {
          setTimeout(
            () =>
              router.push(
                draft.concept_id ? `/questions?concept_id=${draft.concept_id}` : '/questions'
              ),
            900
          );
        }
      } catch (err: any) {
        setToast({ message: err?.message || 'Save failed.', type: 'error' });
      } finally {
        setIsSaving(false);
      }
    },
    [draft, editId, router]
  );

  // ─── keyboard ──────────────────────────────────────────────────────────────

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const cmd = e.metaKey || e.ctrlKey;
      if (!cmd) return;

      if (e.key === 'Enter') {
        e.preventDefault();
        save(isEditing ? 'close' : 'again');
      } else if (e.key.toLowerCase() === 's') {
        e.preventDefault();
        save('close');
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [save, isEditing]);

  // ─── format switching ──────────────────────────────────────────────────────

  const changeFormat = (format: QuestionFormat) => {
    setDraft((prev) => {
      const next: QuestionDraft = { ...prev, format };

      // Assertion-reason always uses the same four choices — prefill rather than
      // make every author retype them, but never overwrite work already there.
      if (format === 'assertion_reason' && prev.options.every((o) => !o.text.trim())) {
        next.options = ASSERTION_REASON_OPTIONS.map((text) => ({ id: newOptionId(), text }));
        next.correctIndices = [];
      }

      // Single-answer formats cannot carry a multi-select key over.
      if (format !== 'mcq_multi' && prev.correctIndices.length > 1) {
        next.correctIndices = prev.correctIndices.slice(0, 1);
      }

      return next;
    });
  };

  const autoEvaluate = async () => {
    setIsEvaluating(true);
    try {
      const res = await fetch('/api/evaluate-question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question_body: draft.question_body,
          options: usesOptions(draft.format) ? draft.options : null,
          subject: draft.subject,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Evaluation failed.');

      patch({
        author_difficulty_bucket: data.author_difficulty_bucket,
        author_prior_b: data.author_prior_b,
      });
      setToast({ message: 'Difficulty estimated.', type: 'success' });
    } catch (err: any) {
      setToast({ message: err?.message || 'Evaluation failed.', type: 'error' });
    } finally {
      setIsEvaluating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24 text-zinc-500">
        <Loader2 className="mr-3 animate-spin" size={20} /> Loading question…
      </div>
    );
  }

  const sectionClass = 'rounded-[20px] border border-[#262626] bg-[#161618] p-6';

  return (
    <div className="mx-auto max-w-[1500px] pb-4">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <button
            type="button"
            onClick={() => router.push('/questions')}
            className="mb-3 flex items-center gap-1.5 text-xs font-medium text-zinc-500 transition-colors hover:text-white"
          >
            <ArrowLeft size={14} /> All questions
          </button>
          <h1 className="text-3xl font-black text-white">
            {isEditing ? 'Edit question' : 'Add question'}
          </h1>
        </div>
        {savedCount > 0 && (
          <div className="flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-400">
            <CheckCircle2 size={16} /> {savedCount} saved this session
          </div>
        )}
      </div>

      {/* Recovered draft */}
      {recoverable && (
        <div className="mb-6 flex flex-wrap items-center gap-3 rounded-xl border border-[#8692f7]/25 bg-[#8692f7]/[0.07] px-4 py-3">
          <RotateCcw size={16} className="text-[#8692f7]" />
          <span className="flex-1 text-sm text-zinc-300">
            You have an unsaved question from a previous session.
          </span>
          <button
            type="button"
            onClick={() => {
              setDraft(recoverable);
              setRecoverable(null);
            }}
            className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-hover"
          >
            Restore it
          </button>
          <button
            type="button"
            onClick={() => {
              window.localStorage.removeItem(DRAFT_KEY);
              setRecoverable(null);
            }}
            className="rounded-lg px-3 py-1.5 text-sm text-zinc-400 hover:text-white"
          >
            Discard
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
        {/* ── Form ── */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            save('close');
          }}
          className="space-y-6"
        >
          <div className={sectionClass}>
            <TaxonomyPicker
              subject={draft.subject}
              chapterId={draft.chapter_id}
              conceptId={draft.concept_id}
              onChange={patch}
              chapterError={errorFor('chapter_id')}
              conceptError={errorFor('concept_id')}
              onError={(message) => setToast({ message, type: 'error' })}
            />
          </div>

          <div className={sectionClass}>
            <label className="mb-3 block text-sm font-medium text-zinc-400">Format</label>
            <div className="flex flex-wrap gap-2">
              {QUESTION_FORMATS.map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => changeFormat(f)}
                  className={`rounded-lg border px-3.5 py-2 text-sm font-medium transition-all ${
                    draft.format === f
                      ? 'border-[#8692f7] bg-[#8692f7]/10 text-white'
                      : 'border-[#2a2a2a] text-zinc-400 hover:border-[#3a3a3a] hover:text-white'
                  }`}
                >
                  {FORMAT_LABELS[f]}
                </button>
              ))}
            </div>
            <p className="mt-3 text-xs text-zinc-500">{FORMAT_HINTS[draft.format]}</p>

            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-400">Difficulty</label>
                <div className="flex gap-2">
                  {DIFFICULTIES.map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => patch({ difficulty: d })}
                      className={`flex-1 rounded-lg border py-2 text-sm font-medium capitalize transition-all ${
                        draft.difficulty === d
                          ? 'border-[#8692f7] bg-[#8692f7]/10 text-white'
                          : 'border-[#2a2a2a] text-zinc-400 hover:text-white'
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-400">Source</label>
                <div className="flex gap-2">
                  {(
                    [
                      { value: 'non_pyq', label: 'Original' },
                      { value: 'pyq', label: 'Past year' },
                    ] as const
                  ).map((s) => (
                    <button
                      key={s.value}
                      type="button"
                      onClick={() => patch({ source_type: s.value })}
                      className={`flex-1 rounded-lg border py-2 text-sm font-medium transition-all ${
                        draft.source_type === s.value
                          ? 'border-[#8692f7] bg-[#8692f7]/10 text-white'
                          : 'border-[#2a2a2a] text-zinc-400 hover:text-white'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {draft.source_type === 'pyq' && (
              <div className="mt-4 grid grid-cols-1 gap-4 rounded-xl border border-[#262626] bg-[#141416] p-4 md:grid-cols-3">
                <div>
                  <label className="mb-2 block text-xs font-medium text-zinc-400">Year</label>
                  <input
                    type="number"
                    value={draft.pyq_year}
                    onChange={(e) => patch({ pyq_year: e.target.value })}
                    placeholder="2024"
                    className={`w-full rounded-lg border bg-[#111112] p-2 text-sm text-white focus:outline-none ${
                      errorFor('pyq_year') ? 'border-rose-500/50' : 'border-[#333] focus:border-primary'
                    }`}
                  />
                  {errorFor('pyq_year') && (
                    <p className="mt-1 text-xs text-rose-400">{errorFor('pyq_year')}</p>
                  )}
                </div>
                <div>
                  <label className="mb-2 block text-xs font-medium text-zinc-400">Paper</label>
                  {/* A select, not a number box: `pyq_paper` is CHECK-constrained to
                      these two strings, and a number here fails only at approval. */}
                  <select
                    value={draft.pyq_paper}
                    onChange={(e) => patch({ pyq_paper: e.target.value })}
                    className={`w-full rounded-lg border bg-[#111112] p-2 text-sm text-white focus:outline-none ${
                      errorFor('pyq_paper') ? 'border-rose-500/50' : 'border-[#333] focus:border-primary'
                    }`}
                  >
                    <option value="">Select…</option>
                    {PYQ_PAPERS.map((p) => (
                      <option key={p.value} value={p.value}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                  {errorFor('pyq_paper') && (
                    <p className="mt-1 text-xs text-rose-400">{errorFor('pyq_paper')}</p>
                  )}
                </div>
                <div>
                  <label className="mb-2 block text-xs font-medium text-zinc-400">Shift</label>
                  <input
                    type="text"
                    value={draft.pyq_shift}
                    onChange={(e) => patch({ pyq_shift: e.target.value })}
                    placeholder="Shift 1 (morning)"
                    className="w-full rounded-lg border border-[#333] bg-[#111112] p-2 text-sm text-white focus:border-primary focus:outline-none"
                  />
                </div>
              </div>
            )}
          </div>

          <div className={sectionClass} ref={bodyAnchorRef}>
            <LatexField
              label={
                draft.format === 'passage'
                  ? 'Passage & question (LaTeX)'
                  : draft.format === 'assertion_reason'
                    ? 'Assertion & Reason (LaTeX)'
                    : 'Question (LaTeX)'
              }
              value={draft.question_body}
              onChange={(question_body) => patch({ question_body })}
              placeholder={
                draft.format === 'assertion_reason'
                  ? 'Assertion (A): …\n\nReason (R): …'
                  : 'A block of mass $m$ slides down a frictionless incline of angle $\\theta$…'
              }
              rows={10}
              error={errorFor('question_body')}
              onUploadError={(message) => setToast({ message, type: 'error' })}
            />
          </div>

          <div className={sectionClass}>
            {usesOptions(draft.format) && (
              <OptionsEditor
                format={draft.format}
                options={draft.options}
                correctIndices={draft.correctIndices}
                onChange={patch}
                error={errorFor('options') || errorFor('correct_answer')}
                warning={warningFor('correct_answer')}
                onUploadError={(message) => setToast({ message, type: 'error' })}
              />
            )}

            {usesNumeric(draft.format) && (
              <NumericAnswer
                format={draft.format}
                value={draft.numericAnswer}
                onChange={(numericAnswer) => patch({ numericAnswer })}
                error={errorFor('correct_answer')}
              />
            )}

            {usesMatrix(draft.format) && (
              <MatrixEditor
                left={draft.matrixLeft}
                right={draft.matrixRight}
                matches={draft.matrixMatches}
                onChange={({ left, right, matches }) =>
                  patch({ matrixLeft: left, matrixRight: right, matrixMatches: matches })
                }
                error={errorFor('options') || errorFor('correct_answer')}
              />
            )}
          </div>

          <div className={sectionClass}>
            <LatexField
              label="Solution (LaTeX)"
              value={draft.solution}
              onChange={(solution) => patch({ solution })}
              placeholder="Resolve the weight along the incline: $mg\sin\theta = ma$…"
              rows={7}
              warning={warningFor('solution')}
              onUploadError={(message) => setToast({ message, type: 'error' })}
            />
          </div>

          <div className={sectionClass}>
            <div className="mb-3 flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-zinc-400">Adaptive calibration</label>
                <p className="mt-0.5 text-xs text-zinc-600">
                  The starting difficulty the IRT engine uses before real student data exists.
                </p>
              </div>
              <button
                type="button"
                disabled={isEvaluating || !draft.question_body.trim()}
                onClick={autoEvaluate}
                className="flex items-center gap-2 rounded-lg border border-[#2a2a2a] px-3 py-2 text-xs font-medium text-[#a5b4fc] transition-colors hover:border-[#8692f7]/40 disabled:text-zinc-600"
              >
                {isEvaluating ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Wand2 size={14} />
                )}
                Estimate with AI
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <select
                value={draft.author_difficulty_bucket}
                onChange={(e) => {
                  const bucket = AUTHOR_BUCKETS.find((b) => b.value === e.target.value);
                  patch({
                    author_difficulty_bucket: e.target.value,
                    // Each bucket maps to a b-range; seed the midpoint so the author
                    // only touches the number when they want to fine-tune it.
                    ...(bucket ? { author_prior_b: bucket.b } : {}),
                  });
                }}
                className="w-full rounded-lg border border-[#333] bg-[#141416] p-2.5 text-sm text-zinc-300 focus:border-primary focus:outline-none"
              >
                <option value="">Bucket (defaults to difficulty)</option>
                {AUTHOR_BUCKETS.map((b) => (
                  <option key={b.value} value={b.value}>
                    {b.label}
                  </option>
                ))}
              </select>
              <div>
                <input
                  type="number"
                  step="0.1"
                  value={draft.author_prior_b}
                  onChange={(e) => patch({ author_prior_b: parseFloat(e.target.value) || 0 })}
                  className="w-full rounded-lg border border-[#333] bg-[#141416] p-2.5 text-sm text-zinc-300 focus:border-primary focus:outline-none"
                  placeholder="Prior b"
                />
                <p className="mt-1 text-xs text-zinc-600">
                  Prior b — −3 (easiest) to 3 (hardest).
                </p>
              </div>
            </div>
          </div>
        </form>

        {/* ── Preview ── */}
        <aside className="xl:sticky xl:top-0 xl:max-h-[calc(100vh-8rem)] xl:self-start xl:overflow-y-auto">
          <div className="rounded-[20px] border border-[#262626] bg-[#161618] p-6">
            <div className="mb-4 flex items-center gap-2">
              <Sparkles size={15} className="text-[#8692f7]" />
              <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-400">
                Student view
              </h2>
            </div>
            <QuestionPreview draft={draft} />
          </div>

          {issues.length > 0 && (
            <div className="mt-4 space-y-2 rounded-[20px] border border-[#262626] bg-[#161618] p-5">
              <h3 className="mb-3 text-xs font-bold uppercase tracking-widest text-zinc-500">
                Checks
              </h3>
              {issues.map((issue, i) => (
                <p
                  key={`${issue.field}-${i}`}
                  className={`flex items-start gap-2 text-xs ${
                    issue.severity === 'error' ? 'text-rose-400' : 'text-amber-400'
                  }`}
                >
                  {issue.severity === 'error' ? (
                    <AlertCircle size={13} className="mt-0.5 shrink-0" />
                  ) : (
                    <AlertTriangle size={13} className="mt-0.5 shrink-0" />
                  )}
                  {issue.message}
                </p>
              ))}
            </div>
          )}
        </aside>
      </div>

      {/* Action bar — sticky inside the scrolling <main>, so a collapsed sidebar
          cannot leave it hanging off-centre the way a fixed bar would. */}
      <div className="sticky bottom-0 z-40 mt-6 rounded-t-2xl border border-[#262626] bg-[#111]/95 px-6 py-3 backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <label className="flex cursor-pointer items-center gap-2.5">
              <input
                type="checkbox"
                checked={draft.published}
                onChange={(e) => patch({ published: e.target.checked })}
                className="h-4 w-4 rounded border-[#333] bg-[#141416] text-primary focus:ring-primary/20"
              />
              <span className="text-sm text-zinc-300">
                Publish immediately
                <span className="ml-1.5 text-xs text-zinc-600">
                  {draft.published ? '— live to students on save' : '— goes to the review queue'}
                </span>
              </span>
            </label>

            {errors.length > 0 && (
              <span className="flex items-center gap-1.5 text-xs font-medium text-rose-400">
                <AlertCircle size={13} /> {errors.length} to fix
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden items-center gap-3 text-[11px] text-zinc-600 lg:flex">
              <kbd className="rounded border border-[#333] bg-[#1a1a1a] px-1.5 py-0.5 font-mono">
                ⌘S
              </kbd>
              save
              {!isEditing && (
                <>
                  <kbd className="rounded border border-[#333] bg-[#1a1a1a] px-1.5 py-0.5 font-mono">
                    ⌘⏎
                  </kbd>
                  save &amp; next
                </>
              )}
            </span>

            <button
              type="button"
              onClick={() => router.push('/questions')}
              className="px-4 py-2.5 text-sm text-zinc-400 transition-colors hover:text-white"
            >
              Cancel
            </button>

            {!isEditing && (
              <button
                type="button"
                onClick={() => save('again')}
                disabled={isSaving}
                className="rounded-xl border border-[#8692f7]/40 px-5 py-2.5 text-sm font-bold text-[#8692f7] transition-colors hover:bg-[#8692f7]/10 disabled:opacity-50"
              >
                Save &amp; add another
              </button>
            )}

            <button
              type="button"
              onClick={() => save('close')}
              disabled={isSaving}
              className="flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-bold text-white transition-colors hover:bg-primary-hover disabled:opacity-50"
            >
              {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {isEditing ? 'Save changes' : 'Save question'}
            </button>
          </div>
        </div>
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}

export default function NewQuestionPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-zinc-500">Loading form…</div>}>
      <NewQuestionForm />
    </Suspense>
  );
}
