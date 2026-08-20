'use client';

import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, Check, Loader2, Plus, X } from 'lucide-react';

const SUBJECTS = [
  { value: 'physics', label: 'Physics' },
  { value: 'chemistry', label: 'Chemistry' },
  { value: 'maths', label: 'Maths' },
];

interface Row {
  id: string;
  name: string;
  subject?: string;
  sort_order?: number;
}

interface TaxonomyPickerProps {
  subject: string;
  chapterId: string;
  conceptId: string;
  onChange: (next: { subject: string; chapter_id: string; concept_id: string }) => void;
  chapterError?: string;
  conceptError?: string;
  onError?: (message: string) => void;
}

/**
 * Subject → chapter → concept, with inline creation of either level.
 *
 * The inline create is the point: authoring a chapter's worth of questions used to
 * stall the moment a concept was missing, because the only way to add one was to
 * navigate to /topics — losing the half-written question on the way.
 */
export default function TaxonomyPicker({
  subject,
  chapterId,
  conceptId,
  onChange,
  chapterError,
  conceptError,
  onError,
}: TaxonomyPickerProps) {
  const [chapters, setChapters] = useState<Row[]>([]);
  const [concepts, setConcepts] = useState<Row[]>([]);
  const [loadingChapters, setLoadingChapters] = useState(true);
  const [loadingConcepts, setLoadingConcepts] = useState(false);
  const [creating, setCreating] = useState<'chapter' | 'concept' | null>(null);
  const [newName, setNewName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const loadChapters = useCallback(async () => {
    setLoadingChapters(true);
    try {
      const res = await fetch('/api/chapters');
      const data = await res.json();
      setChapters(Array.isArray(data) ? data.filter((c: Row) => c.subject === subject) : []);
    } catch {
      setChapters([]);
    } finally {
      setLoadingChapters(false);
    }
  }, [subject]);

  const loadConcepts = useCallback(async (chapter: string) => {
    if (!chapter) {
      setConcepts([]);
      return;
    }
    setLoadingConcepts(true);
    try {
      const res = await fetch(`/api/topics?chapter_id=${chapter}`);
      const data = await res.json();
      setConcepts(Array.isArray(data) ? data : []);
    } catch {
      setConcepts([]);
    } finally {
      setLoadingConcepts(false);
    }
  }, []);

  useEffect(() => {
    loadChapters();
  }, [loadChapters]);

  useEffect(() => {
    loadConcepts(chapterId);
  }, [chapterId, loadConcepts]);

  const create = async () => {
    const name = newName.trim();
    if (!name) return;

    setIsSaving(true);
    try {
      const isChapter = creating === 'chapter';
      const res = await fetch(isChapter ? '/api/chapters' : '/api/topics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          isChapter
            ? { subject, name, sort_order: chapters.length + 1 }
            : { chapter_id: chapterId, name, sort_order: concepts.length + 1 }
        ),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Could not save.');

      if (isChapter) {
        await loadChapters();
        onChange({ subject, chapter_id: data.id, concept_id: '' });
      } else {
        await loadConcepts(chapterId);
        onChange({ subject, chapter_id: chapterId, concept_id: data.id });
      }

      setNewName('');
      setCreating(null);
    } catch (err: any) {
      onError?.(err?.message || 'Could not save.');
    } finally {
      setIsSaving(false);
    }
  };

  const selectClass = (hasError?: string) =>
    `w-full rounded-xl border bg-[#141416] p-2.5 text-white transition-all focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:text-zinc-600 ${
      hasError ? 'border-rose-500/50 focus:border-rose-500' : 'border-[#333] focus:border-primary'
    }`;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div>
          <label className="mb-2 block text-sm font-medium text-zinc-400">Subject</label>
          <select
            value={subject}
            onChange={(e) => onChange({ subject: e.target.value, chapter_id: '', concept_id: '' })}
            className={selectClass()}
          >
            {SUBJECTS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="text-sm font-medium text-zinc-400">Chapter</label>
            <button
              type="button"
              onClick={() => {
                setCreating('chapter');
                setNewName('');
              }}
              className="flex items-center gap-1 text-xs font-medium text-[#8692f7] hover:text-[#6a78f2]"
            >
              <Plus size={12} /> New
            </button>
          </div>
          <select
            value={chapterId}
            onChange={(e) => onChange({ subject, chapter_id: e.target.value, concept_id: '' })}
            disabled={loadingChapters}
            className={selectClass(chapterError)}
          >
            <option value="">{loadingChapters ? 'Loading…' : 'Select chapter…'}</option>
            {chapters.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          {chapterError && (
            <p className="mt-1.5 flex items-center gap-1 text-xs text-rose-400">
              <AlertCircle size={12} /> {chapterError}
            </p>
          )}
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="text-sm font-medium text-zinc-400">Concept</label>
            <button
              type="button"
              onClick={() => {
                setCreating('concept');
                setNewName('');
              }}
              disabled={!chapterId}
              className="flex items-center gap-1 text-xs font-medium text-[#8692f7] hover:text-[#6a78f2] disabled:text-zinc-600"
            >
              <Plus size={12} /> New
            </button>
          </div>
          <select
            value={conceptId}
            onChange={(e) => onChange({ subject, chapter_id: chapterId, concept_id: e.target.value })}
            disabled={!chapterId || loadingConcepts}
            className={selectClass(conceptError)}
          >
            <option value="">
              {!chapterId ? 'Pick a chapter first' : loadingConcepts ? 'Loading…' : 'Select concept…'}
            </option>
            {concepts.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          {conceptError && (
            <p className="mt-1.5 flex items-center gap-1 text-xs text-rose-400">
              <AlertCircle size={12} /> {conceptError}
            </p>
          )}
        </div>
      </div>

      {creating && (
        <div className="flex items-center gap-2 rounded-xl border border-[#8692f7]/20 bg-[#8692f7]/[0.06] p-3">
          <span className="shrink-0 text-xs font-medium text-zinc-400">
            New {creating === 'chapter' ? `${subject} chapter` : 'concept'}
          </span>
          <input
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                create();
              }
              if (e.key === 'Escape') setCreating(null);
            }}
            placeholder="Name…"
            className="min-w-0 flex-1 rounded-lg border border-[#333] bg-[#141416] px-3 py-1.5 text-sm text-white focus:border-primary focus:outline-none"
          />
          <button
            type="button"
            onClick={create}
            disabled={isSaving || !newName.trim()}
            className="flex shrink-0 items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-primary-hover disabled:opacity-50"
          >
            {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            Create
          </button>
          <button
            type="button"
            onClick={() => setCreating(null)}
            className="shrink-0 rounded-lg p-1.5 text-zinc-500 hover:text-white"
          >
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
