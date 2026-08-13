'use client';

import { Check } from 'lucide-react';
import MathText from './MathText';
import {
  FORMAT_HINTS,
  FORMAT_LABELS,
  serializeAnswer,
  usesMatrix,
  usesNumeric,
  usesOptions,
  type QuestionDraft,
} from '@/lib/questionSchema';

const LETTERS = 'ABCDEFGH';

/**
 * The question as a student meets it, plus the answer key marked.
 *
 * It renders from the same draft the form holds and calls `serializeAnswer` for the
 * key, so what is shown here is what will be stored — a preview built from separate
 * logic would eventually disagree with the save, which is worse than no preview.
 */
export default function QuestionPreview({ draft }: { draft: QuestionDraft }) {
  const answerKey = serializeAnswer(draft);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-[#1e2030] px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-[#8692f7]">
          {FORMAT_LABELS[draft.format]}
        </span>
        <span className="rounded-full bg-[#222] px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest capitalize text-zinc-400">
          {draft.difficulty}
        </span>
        {draft.source_type === 'pyq' && draft.pyq_year && (
          <span className="rounded-full bg-amber-400/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-amber-400">
            PYQ {draft.pyq_year}
          </span>
        )}
      </div>

      <p className="text-xs text-zinc-600">{FORMAT_HINTS[draft.format]}</p>

      <div className="rounded-xl border border-[#262626] bg-[#111112] p-4">
        {draft.question_body.trim() ? (
          <MathText className="text-[15px] leading-relaxed text-zinc-100">
            {draft.question_body}
          </MathText>
        ) : (
          <p className="text-sm text-zinc-600">The question body will appear here.</p>
        )}
      </div>

      {usesOptions(draft.format) && (
        <div className="space-y-2">
          {draft.options.map((opt, i) => {
            const isCorrect = draft.correctIndices.includes(i);
            return (
              <div
                key={opt.id}
                className={`flex items-start gap-3 rounded-xl border p-3 ${
                  isCorrect
                    ? 'border-emerald-500/40 bg-emerald-500/[0.06]'
                    : 'border-[#262626] bg-[#111112]'
                }`}
              >
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    isCorrect ? 'bg-emerald-500 text-black' : 'bg-[#222] text-zinc-500'
                  }`}
                >
                  {isCorrect ? <Check size={13} /> : LETTERS[i]}
                </span>
                <div className="min-w-0 flex-1">
                  {opt.text.trim() ? (
                    <MathText className="text-sm text-zinc-200">{opt.text}</MathText>
                  ) : (
                    <span className="text-sm text-zinc-600">Empty option</span>
                  )}
                  {opt.image_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={opt.image_url}
                      alt={`Option ${LETTERS[i]}`}
                      className="mt-2 h-20 rounded-lg border border-[#262626] object-contain"
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {usesMatrix(draft.format) && (
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            {draft.matrixLeft.map((row) => (
              <div
                key={row.id}
                className="flex gap-2 rounded-lg border border-[#262626] bg-[#111112] p-2"
              >
                <span className="font-bold text-zinc-500">{row.id}</span>
                <MathText className="min-w-0 text-sm text-zinc-200">{row.text}</MathText>
              </div>
            ))}
          </div>
          <div className="space-y-1.5">
            {draft.matrixRight.map((row) => (
              <div
                key={row.id}
                className="flex gap-2 rounded-lg border border-[#262626] bg-[#111112] p-2"
              >
                <span className="font-bold text-zinc-500">{row.id}</span>
                <MathText className="min-w-0 text-sm text-zinc-200">{row.text}</MathText>
              </div>
            ))}
          </div>
        </div>
      )}

      {usesNumeric(draft.format) && (
        <div className="rounded-xl border border-dashed border-[#333] bg-[#111112] p-4 text-center text-sm text-zinc-600">
          Student types a {draft.format === 'integer' ? 'whole number' : 'number'} here
        </div>
      )}

      <div className="rounded-xl border border-[#262626] bg-[#141416] p-3">
        <div className="mb-1 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
          Stored answer key
        </div>
        {answerKey ? (
          <code className="font-mono text-sm text-emerald-400">{answerKey}</code>
        ) : (
          <span className="text-sm text-rose-400">Not set — the app cannot grade this question.</span>
        )}
      </div>

      {draft.solution.trim() && (
        <div>
          <div className="mb-2 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
            Solution
          </div>
          <div className="rounded-xl border border-[#262626] bg-[#111112] p-4">
            <MathText className="text-sm leading-relaxed text-zinc-300">{draft.solution}</MathText>
          </div>
        </div>
      )}
    </div>
  );
}
