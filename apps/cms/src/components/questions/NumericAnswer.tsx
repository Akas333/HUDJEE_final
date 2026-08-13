'use client';

import { AlertCircle } from 'lucide-react';
import type { QuestionFormat } from '@/lib/questionSchema';

/**
 * The answer box for `integer` and `numerical`.
 *
 * Input is filtered rather than validated-on-submit so the author cannot type a
 * decimal into an integer question at all. The value is kept as typed — stripping a
 * trailing "." mid-edit would make "3." impossible to turn into "3.5".
 */
export default function NumericAnswer({
  format,
  value,
  onChange,
  error,
}: {
  format: QuestionFormat;
  value: string;
  onChange: (value: string) => void;
  error?: string;
}) {
  const isInteger = format === 'integer';

  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-zinc-400">Correct answer</label>
      <input
        type="text"
        inputMode={isInteger ? 'numeric' : 'decimal'}
        value={value}
        onChange={(e) => {
          const cleaned = isInteger
            ? e.target.value.replace(/[^0-9-]/g, '')
            : e.target.value.replace(/[^0-9.eE+-]/g, '');
          onChange(cleaned);
        }}
        placeholder={isInteger ? 'e.g. 42' : 'e.g. 3.14'}
        className={`w-full max-w-xs rounded-xl border bg-[#141416] p-2.5 font-mono text-white transition-all focus:outline-none focus:ring-2 focus:ring-primary/20 ${
          error ? 'border-rose-500/50 focus:border-rose-500' : 'border-[#333] focus:border-primary'
        }`}
      />
      <p className="mt-2 text-xs text-zinc-500">
        {isInteger
          ? 'Whole numbers only — 42 or -5.'
          : 'Decimals allowed. The app grades within a small relative tolerance, so 0.30 accepts 0.3.'}
      </p>
      {error && (
        <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-rose-400">
          <AlertCircle size={13} /> {error}
        </p>
      )}
    </div>
  );
}
