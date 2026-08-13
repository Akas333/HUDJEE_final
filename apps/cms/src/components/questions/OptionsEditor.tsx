'use client';

import { AlertCircle, ChevronDown, ChevronUp, ImageIcon, Loader2, Plus, X } from 'lucide-react';
import MathText from './MathText';
import { imageFromClipboard, useImageUpload } from './useImageUpload';
import {
  allowsMultipleCorrect,
  blankOption,
  moveOption,
  removeOption,
  type OptionDraft,
  type QuestionFormat,
} from '@/lib/questionSchema';

/** A, B, C… as the student sees them, rather than the raw 1-based index. */
const LETTERS = 'ABCDEFGH';

interface OptionsEditorProps {
  format: QuestionFormat;
  options: OptionDraft[];
  correctIndices: number[];
  onChange: (next: { options: OptionDraft[]; correctIndices: number[] }) => void;
  error?: string;
  warning?: string;
  onUploadError?: (message: string) => void;
}

/**
 * The options list and the answer key, edited together.
 *
 * They are one component because they are one piece of data: `correct_answer`
 * stores *positions*, so any edit to the list is also an edit to the key. Deleting
 * or reordering here goes through `removeOption`/`moveOption`, which rewrite the
 * key to follow the options. The previous form deleted from the array and left the
 * key alone, which silently repointed it at whatever slid into that slot.
 */
export default function OptionsEditor({
  format,
  options,
  correctIndices,
  onChange,
  error,
  warning,
  onUploadError,
}: OptionsEditorProps) {
  const { upload, isUploading } = useImageUpload(onUploadError);
  const multi = allowsMultipleCorrect(format);
  const correct = new Set(correctIndices);

  const setOptions = (next: OptionDraft[]) => onChange({ options: next, correctIndices });

  const toggleCorrect = (index: number) => {
    if (multi) {
      const next = correct.has(index)
        ? correctIndices.filter((i) => i !== index)
        : [...correctIndices, index].sort((a, b) => a - b);
      onChange({ options, correctIndices: next });
    } else {
      onChange({ options, correctIndices: [index] });
    }
  };

  const patchOption = (index: number, patch: Partial<OptionDraft>) => {
    setOptions(options.map((opt, i) => (i === index ? { ...opt, ...patch } : opt)));
  };

  const attachImage = async (index: number, file: File) => {
    const url = await upload(file);
    if (url) patchOption(index, { image_url: url });
  };

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <div>
          <label className="text-sm font-medium text-zinc-400">Options</label>
          <p className="mt-0.5 text-xs text-zinc-600">
            {multi
              ? 'Tick every correct option — the student must select all of them.'
              : 'Tick the one correct option.'}{' '}
            LaTeX and pasted images work here too.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOptions([...options, blankOption()])}
          disabled={options.length >= LETTERS.length}
          className="flex items-center gap-1.5 rounded-lg border border-[#2a2a2a] px-3 py-1.5 text-xs font-medium text-[#8692f7] transition-colors hover:border-[#8692f7]/40 disabled:text-zinc-600"
        >
          <Plus size={14} /> Add option
        </button>
      </div>

      <div className="space-y-2">
        {options.map((opt, i) => {
          const isCorrect = correct.has(i);
          return (
            <div
              key={opt.id}
              className={`rounded-xl border p-3 transition-colors ${
                isCorrect
                  ? 'border-emerald-500/40 bg-emerald-500/[0.06]'
                  : 'border-[#262626] bg-[#1a1a1c]'
              }`}
            >
              <div className="flex items-start gap-3">
                <button
                  type="button"
                  onClick={() => toggleCorrect(i)}
                  title={isCorrect ? 'Correct answer' : 'Mark as correct'}
                  className={`mt-1 flex h-7 w-7 shrink-0 items-center justify-center border text-xs font-bold transition-all ${
                    multi ? 'rounded-md' : 'rounded-full'
                  } ${
                    isCorrect
                      ? 'border-emerald-500 bg-emerald-500 text-black'
                      : 'border-[#3a3a3a] text-zinc-500 hover:border-[#8692f7] hover:text-[#8692f7]'
                  }`}
                >
                  {LETTERS[i]}
                </button>

                <div className="min-w-0 flex-1 space-y-2">
                  <input
                    type="text"
                    value={opt.text}
                    onChange={(e) => patchOption(i, { text: e.target.value })}
                    onPaste={async (e) => {
                      const file = imageFromClipboard(e);
                      if (!file) return;
                      e.preventDefault();
                      await attachImage(i, file);
                    }}
                    placeholder={`Option ${LETTERS[i]}`}
                    className="w-full rounded-lg border border-[#333] bg-[#141416] p-2.5 font-mono text-sm text-white transition-all focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />

                  {opt.text.trim() && (
                    <div className="rounded-lg border border-[#262626] bg-[#111112] px-3 py-1.5">
                      <MathText className="text-sm text-zinc-300">{opt.text}</MathText>
                    </div>
                  )}

                  {opt.image_url && (
                    <div className="relative w-fit">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={opt.image_url}
                        alt={`Option ${LETTERS[i]}`}
                        className="h-20 rounded-lg border border-[#333] object-contain"
                      />
                      <button
                        type="button"
                        onClick={() => patchOption(i, { image_url: undefined })}
                        className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-xs text-white"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex shrink-0 items-center gap-0.5">
                  <button
                    type="button"
                    onClick={() => onChange(moveOption(options, correctIndices, i, i - 1))}
                    disabled={i === 0}
                    title="Move up"
                    className="rounded-md p-1.5 text-zinc-600 transition-colors hover:bg-[#222] hover:text-white disabled:opacity-30 disabled:hover:bg-transparent"
                  >
                    <ChevronUp size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => onChange(moveOption(options, correctIndices, i, i + 1))}
                    disabled={i === options.length - 1}
                    title="Move down"
                    className="rounded-md p-1.5 text-zinc-600 transition-colors hover:bg-[#222] hover:text-white disabled:opacity-30 disabled:hover:bg-transparent"
                  >
                    <ChevronDown size={15} />
                  </button>
                  <label
                    title="Attach image"
                    className="cursor-pointer rounded-md p-1.5 text-zinc-600 transition-colors hover:bg-[#222] hover:text-[#8692f7]"
                  >
                    {isUploading ? (
                      <Loader2 size={15} className="animate-spin" />
                    ) : (
                      <ImageIcon size={15} />
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        e.target.value = '';
                        if (file) await attachImage(i, file);
                      }}
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => onChange(removeOption(options, correctIndices, i))}
                    disabled={options.length <= 2}
                    title={options.length <= 2 ? 'A question needs two options' : 'Remove option'}
                    className="rounded-md p-1.5 text-zinc-600 transition-colors hover:bg-rose-500/10 hover:text-rose-400 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-zinc-600"
                  >
                    <X size={15} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {error && (
        <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-rose-400">
          <AlertCircle size={13} /> {error}
        </p>
      )}
      {!error && warning && (
        <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-amber-400">
          <AlertCircle size={13} /> {warning}
        </p>
      )}
    </div>
  );
}
