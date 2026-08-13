'use client';

import { AlertCircle, Plus, X } from 'lucide-react';
import MathText from './MathText';
import {
  matrixLeftId,
  matrixRightId,
  relabelMatrix,
  type MatrixRowDraft,
} from '@/lib/questionSchema';

interface MatrixState {
  left: MatrixRowDraft[];
  right: MatrixRowDraft[];
  matches: Record<string, string[]>;
}

interface MatrixEditorProps extends MatrixState {
  onChange: (next: MatrixState) => void;
  error?: string;
}

/**
 * The two columns and the match grid.
 *
 * Row ids are positional labels (A, B, C… / P, Q, R…) and the answer key is written
 * in terms of them, so adding or removing a row has to relabel every row *and* carry
 * the existing matches onto the new labels — `relabelMatrix` does both, for the same
 * reason the options editor remaps its key on delete.
 */
export default function MatrixEditor({ left, right, matches, onChange, error }: MatrixEditorProps) {
  const apply = (nextLeft: MatrixRowDraft[], nextRight: MatrixRowDraft[], nextMatches = matches) => {
    onChange(relabelMatrix(nextLeft, nextRight, nextMatches));
  };

  const toggleMatch = (leftId: string, rightId: string) => {
    const current = matches[leftId] ?? [];
    const next = current.includes(rightId)
      ? current.filter((id) => id !== rightId)
      : [...current, rightId].sort();
    onChange({ left, right, matches: { ...matches, [leftId]: next } });
  };

  const column = (
    side: 'left' | 'right',
    rows: MatrixRowDraft[],
    label: string,
    nextId: (i: number) => string
  ) => (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <label className="text-sm font-medium text-zinc-400">{label}</label>
        <button
          type="button"
          onClick={() => {
            const added = [...rows, { id: nextId(rows.length), text: '' }];
            apply(side === 'left' ? added : left, side === 'right' ? added : right);
          }}
          disabled={rows.length >= 8}
          className="flex items-center gap-1.5 text-xs font-medium text-[#8692f7] transition-colors hover:text-[#6a78f2] disabled:text-zinc-600"
        >
          <Plus size={14} /> Add row
        </button>
      </div>
      <div className="space-y-2">
        {rows.map((row, i) => (
          <div key={row.id} className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="w-6 shrink-0 text-center font-bold text-zinc-500">{row.id}</span>
              <input
                type="text"
                value={row.text}
                onChange={(e) => {
                  const edited = rows.map((r, idx) =>
                    idx === i ? { ...r, text: e.target.value } : r
                  );
                  onChange({
                    left: side === 'left' ? edited : left,
                    right: side === 'right' ? edited : right,
                    matches,
                  });
                }}
                placeholder={`${row.id} …`}
                className="min-w-0 flex-1 rounded-lg border border-[#333] bg-[#141416] p-2 font-mono text-sm text-white focus:border-primary focus:outline-none"
              />
              <button
                type="button"
                onClick={() => {
                  const trimmed = rows.filter((_, idx) => idx !== i);
                  apply(side === 'left' ? trimmed : left, side === 'right' ? trimmed : right);
                }}
                disabled={rows.length <= 2}
                className="shrink-0 rounded-md p-1.5 text-zinc-600 transition-colors hover:bg-rose-500/10 hover:text-rose-400 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-zinc-600"
              >
                <X size={15} />
              </button>
            </div>
            {row.text.trim() && (
              <div className="ml-8 rounded-lg border border-[#262626] bg-[#111112] px-3 py-1">
                <MathText className="text-xs text-zinc-300">{row.text}</MathText>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        {column('left', left, 'Column I', matrixLeftId)}
        {column('right', right, 'Column II', matrixRightId)}
      </div>

      <div className="overflow-hidden rounded-xl border border-[#262626] bg-[#1a1a1c]">
        <div className="border-b border-[#333] bg-[#222] px-4 py-2.5 text-sm font-medium text-zinc-300">
          Correct matches
          <span className="ml-2 text-xs font-normal text-zinc-500">
            every row on the left needs at least one match
          </span>
        </div>
        <div className="overflow-x-auto p-4">
          <table className="w-full text-center">
            <thead>
              <tr>
                <th className="p-2" />
                {right.map((r) => (
                  <th key={r.id} className="p-2 font-bold text-zinc-400">
                    {r.id}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {left.map((l) => {
                const rowMatches = matches[l.id] ?? [];
                return (
                  <tr key={l.id} className="border-t border-[#262626]">
                    <td
                      className={`p-2 font-bold ${
                        rowMatches.length === 0 ? 'text-rose-400' : 'text-zinc-400'
                      }`}
                    >
                      {l.id}
                    </td>
                    {right.map((r) => {
                      const on = rowMatches.includes(r.id);
                      return (
                        <td key={r.id} className="p-1.5">
                          <button
                            type="button"
                            onClick={() => toggleMatch(l.id, r.id)}
                            className={`h-7 w-7 rounded-md border text-xs font-bold transition-all ${
                              on
                                ? 'border-emerald-500 bg-emerald-500 text-black'
                                : 'border-[#3a3a3a] text-transparent hover:border-[#8692f7]'
                            }`}
                          >
                            ✓
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {error && (
        <p className="flex items-center gap-1.5 text-xs font-medium text-rose-400">
          <AlertCircle size={13} /> {error}
        </p>
      )}
    </div>
  );
}
