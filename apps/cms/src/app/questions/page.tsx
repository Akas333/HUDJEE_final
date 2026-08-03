'use client';
import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Plus, Trash2, Search, Edit2, FileQuestion } from 'lucide-react';

function QuestionsContent() {
  const searchParams = useSearchParams();
  const conceptId = searchParams.get('concept_id');
  const chapterId = searchParams.get('chapter_id');
  const subject = searchParams.get('subject');
  const conceptName = searchParams.get('concept_name');
  
  const [questions, setQuestions] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  
  useEffect(() => {
    fetchQuestions();
  }, [search, conceptId]);

  const fetchQuestions = async () => {
    const res = await fetch(`/api/questions?search=${search}&concept_id=${conceptId || ''}`);
    const data = await res.json();
    if (Array.isArray(data)) {
      setQuestions(data);
    } else {
      console.error(data.error || 'Failed to fetch questions');
      setQuestions([]);
    }
  };

  const deleteQuestion = async (id: string) => {
    if (!confirm('Are you sure you want to delete this question?')) return;
    await fetch(`/api/questions/${id}`, { method: 'DELETE' });
    fetchQuestions();
  };

  return (
    <div className="max-w-[1200px] mx-auto space-y-8 pb-10">
      <div className="flex justify-between items-center bg-[#161618] border border-[#262626] rounded-[24px] p-8">
        <div>
          <div className="inline-block px-3 py-1.5 rounded-full bg-[#1e2030] text-[#8692f7] text-[10px] font-bold uppercase tracking-widest mb-3">
            Questions Bank
          </div>
          <h1 className="text-3xl font-black text-white flex items-center gap-3">
            {conceptId ? (conceptName ? `Questions for: ${conceptName}` : 'Questions for Concept') : 'All Questions'}
          </h1>
          <p className="text-zinc-400 text-sm mt-2 max-w-lg">Manage your database of questions and practice material.</p>
        </div>
        <Link 
          href={`/questions/new${conceptId ? `?concept_id=${conceptId}&chapter_id=${chapterId || ''}&subject=${subject || ''}` : ''}`} 
          className="bg-primary hover:bg-primary-hover text-white px-5 py-2.5 rounded-xl font-medium flex items-center gap-2 transition-colors shadow-sm"
        >
          <Plus size={20} />
          <span>Add Question</span>
        </Link>
      </div>

      <div className="bg-[#161618] rounded-[24px] border border-[#262626] overflow-hidden">
        <div className="p-4 border-b border-[#262626] bg-[#141416] flex gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={20} />
            <input 
              type="text" 
              placeholder="Search questions..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-[#1a1a1c] border border-[#333] text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-zinc-600"
            />
          </div>
        </div>

        <table className="w-full">
          <thead className="bg-[#141416] text-left text-xs font-bold text-zinc-400 uppercase tracking-wider border-b border-[#262626]">
            <tr>
              <th className="px-6 py-4">Subject</th>
              <th className="px-6 py-4">Chapter</th>
              <th className="px-6 py-4">Difficulty</th>
              <th className="px-6 py-4">Format</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#262626]">
            {questions.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-zinc-500">
                  No questions found.
                </td>
              </tr>
            ) : (
              questions.map((q) => (
                <tr key={q.id} className="hover:bg-[#1a1a1c] transition-colors">
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest
                      ${q.subject === 'physics' ? 'bg-cyan-400/10 text-cyan-400' : 
                        q.subject === 'chemistry' ? 'bg-emerald-400/10 text-emerald-400' : 
                        'bg-purple-400/10 text-purple-400'}`}>
                      {q.subject}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-medium text-white">{q.chapters?.name || '-'}</td>
                  <td className="px-6 py-4 capitalize text-zinc-400">{q.difficulty}</td>
                  <td className="px-6 py-4 capitalize text-zinc-400">{q.format.replace('_', ' ')}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest rounded-full ${q.published ? 'bg-emerald-400/10 text-emerald-400' : 'bg-amber-400/10 text-amber-400'}`}>
                      {q.published ? 'Published' : 'Draft'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Link href={`/questions/new?id=${q.id}`} className="p-2 text-zinc-500 hover:text-cyan-400 hover:bg-cyan-400/10 rounded-lg transition-colors">
                        <Edit2 size={18} />
                      </Link>
                      <button onClick={() => deleteQuestion(q.id)} className="p-2 text-zinc-500 hover:text-rose-400 hover:bg-rose-400/10 rounded-lg transition-colors">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function QuestionsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-zinc-500">Loading...</div>}>
      <QuestionsContent />
    </Suspense>
  );
}
