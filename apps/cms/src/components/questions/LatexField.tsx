'use client';

import { useRef, useState } from 'react';
import { ImageIcon, Loader2, Eye, EyeOff, AlertCircle } from 'lucide-react';
import MathText from './MathText';
import { imageFromClipboard, useImageUpload } from './useImageUpload';

/**
 * Common LaTeX a JEE author reaches for. `$0` marks where the caret lands after
 * insertion, so `\frac{}{}` leaves it inside the numerator rather than at the end.
 */
const SNIPPETS: { label: string; insert: string; title: string }[] = [
  { label: '$x$', insert: '$$0$', title: 'Inline math' },
  { label: 'a⁄b', insert: '$\\frac{$0}{}$', title: 'Fraction' },
  { label: 'x²', insert: '^{$0}', title: 'Superscript' },
  { label: 'xₙ', insert: '_{$0}', title: 'Subscript' },
  { label: '√', insert: '$\\sqrt{$0}$', title: 'Square root' },
  { label: '∫', insert: '$\\int_{$0}^{} \\, dx$', title: 'Integral' },
  { label: 'Σ', insert: '$\\sum_{$0}^{}$', title: 'Summation' },
  { label: 'θ', insert: '$\\theta$0$', title: 'Greek letter' },
  { label: '→', insert: '$\\rightarrow$0$', title: 'Arrow' },
];

interface LatexFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  error?: string;
  warning?: string;
  onUploadError?: (message: string) => void;
  /** Extra controls rendered next to the label, e.g. an AI action. */
  actions?: React.ReactNode;
}

/**
 * A LaTeX textarea with the rendered result beside it.
 *
 * Two things here matter more than they look. The preview means the author sees a
 * broken `\frac` immediately instead of discovering it in the app a week later. And
 * images land **at the caret**: the old form appended `![image](url)` to the end of
 * the body, so pasting a diagram meant to sit mid-question always put it after
 * everything, and the author had to cut and paste the markdown into place by hand.
 */
export default function LatexField({
  label,
  value,
  onChange,
  placeholder,
  rows = 8,
  error,
  warning,
  onUploadError,
  actions,
}: LatexFieldProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showPreview, setShowPreview] = useState(true);
  const { upload, isUploading } = useImageUpload(onUploadError);

  /** Replaces the current selection, then restores focus with the caret placed. */
  const insertAtCaret = (snippet: string) => {
    const el = textareaRef.current;
    const caretToken = snippet.indexOf('$0');
    const text = snippet.replace('$0', '');

    if (!el) {
      onChange(value + text);
      return;
    }

    const start = el.selectionStart ?? value.length;
    const end = el.selectionEnd ?? start;
    onChange(value.slice(0, start) + text + value.slice(end));

    const caret = start + (caretToken >= 0 ? caretToken : text.length);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(caret, caret);
    });
  };

  const insertImage = async (file: File) => {
    const url = await upload(file);
    if (url) insertAtCaret(`\n![diagram](${url})\n`);
  };

  const handlePaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const file = imageFromClipboard(e);
    if (!file) return;
    e.preventDefault();
    await insertImage(file);
  };

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <label className="text-sm font-medium text-zinc-400">{label}</label>
        <div className="flex items-center gap-3">
          {actions}
          <button
            type="button"
            onClick={() => setShowPreview((v) => !v)}
            className="flex items-center gap-1.5 text-xs font-medium text-zinc-500 transition-colors hover:text-zinc-300"
          >
            {showPreview ? <EyeOff size={14} /> : <Eye size={14} />}
            {showPreview ? 'Hide preview' : 'Show preview'}
          </button>
          <label
            className={`flex cursor-pointer items-center gap-1.5 text-xs font-medium transition-colors ${
              isUploading ? 'text-zinc-600' : 'text-[#8692f7] hover:text-[#6a78f2]'
            }`}
          >
            {isUploading ? <Loader2 size={14} className="animate-spin" /> : <ImageIcon size={14} />}
            {isUploading ? 'Uploading…' : 'Image'}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={isUploading}
              onChange={async (e) => {
                const file = e.target.files?.[0];
                e.target.value = '';
                if (file) await insertImage(file);
              }}
            />
          </label>
        </div>
      </div>

      <div className="mb-2 flex flex-wrap gap-1">
        {SNIPPETS.map((s) => (
          <button
            key={s.label}
            type="button"
            title={s.title}
            onClick={() => insertAtCaret(s.insert)}
            className="rounded-md border border-[#2a2a2a] bg-[#141416] px-2 py-1 font-mono text-xs text-zinc-400 transition-colors hover:border-[#8692f7]/40 hover:text-white"
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className={`grid gap-3 ${showPreview ? 'lg:grid-cols-2' : 'grid-cols-1'}`}>
        <textarea
          ref={textareaRef}
          rows={rows}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onPaste={handlePaste}
          placeholder={placeholder}
          className={`w-full resize-y rounded-xl border bg-[#141416] p-4 font-mono text-sm text-white transition-all focus:outline-none focus:ring-2 focus:ring-primary/20 ${
            error ? 'border-rose-500/50 focus:border-rose-500' : 'border-[#333] focus:border-primary'
          }`}
        />

        {showPreview && (
          <div className="min-h-[8rem] overflow-auto rounded-xl border border-[#262626] bg-[#111112] p-4">
            {value.trim() ? (
              <MathText className="text-sm text-zinc-200">{value}</MathText>
            ) : (
              <p className="text-sm text-zinc-600">
                Preview — type <code className="font-mono text-zinc-500">$x^2$</code> for maths, paste
                a screenshot for a diagram.
              </p>
            )}
          </div>
        )}
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
