'use client';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Toast } from '@/components/Toast';
import { Plus, X, Trash2, ListTree, FileQuestion } from 'lucide-react';

function ConceptsContent() {
  const searchParams = useSearchParams();
  const defaultChapterId = searchParams.get('chapter_id') || '';

  const [topics, setTopics] = useState<any[]>([]);
  const [chapters, setChapters] = useState<any[]>([]);
  const [selectedChapterId, setSelectedChapterId] = useState(defaultChapterId);
  const [name, setName] = useState('');
  const [sortOrder, setSortOrder] = useState('1');
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchChapters();
    fetchTopics(defaultChapterId);
  }, [defaultChapterId]);

  const fetchChapters = async () => {
    const res = await fetch('/api/chapters');
    const data = await res.json();
    if (Array.isArray(data)) {
      setChapters(data);
    }
  };

  const fetchTopics = async (chapterId: string) => {
    setIsLoading(true);
    const res = await fetch(`/api/topics${chapterId ? `?chapter_id=${chapterId}` : ''}`);
    const data = await res.json();
    if (Array.isArray(data)) {
      setTopics(data);
    } else {
      console.error(data.error || 'Failed to fetch concepts');
      setTopics([]);
    }
    setIsLoading(false);
  };

  const handleFilter = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    setSelectedChapterId(id);
    fetchTopics(id);
  };

  const addTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedChapterId) {
      setToast({ message: 'Select a chapter first', type: 'error' });
      return;
    }
    if (!name.trim()) {
      setToast({ message: 'Concept name is required', type: 'error' });
      return;
    }
    
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/topics', {
        method: 'POST',
        body: JSON.stringify({ chapter_id: selectedChapterId, name, sort_order: parseInt(sortOrder) || 0 }),
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (res.ok) {
        setToast({ message: 'Concept added successfully!', type: 'success' });
        setName('');
        setSortOrder((prev) => (parseInt(prev) + 1).toString());
        setIsModalOpen(false);
        fetchTopics(selectedChapterId);
      } else {
        const errorData = await res.json();
        setToast({ message: errorData.error || 'Failed to add concept', type: 'error' });
      }
    } catch (error) {
      setToast({ message: 'A network error occurred', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteTopic = async (id: string) => {
    if (!confirm('Are you sure you want to delete this concept?')) return;
    await fetch(`/api/topics/${id}`, { method: 'DELETE' });
    setToast({ message: 'Concept deleted', type: 'success' });
    fetchTopics(selectedChapterId);
  };

  return (
    <div className="max-w-[1200px] mx-auto space-y-8 pb-10">
      <div className="flex justify-between items-center bg-[#161618] border border-[#262626] rounded-[24px] p-8">
        <div>
          <div className="inline-block px-3 py-1.5 rounded-full bg-[#1e2030] text-[#8692f7] text-[10px] font-bold uppercase tracking-widest mb-3">
            Syllabus
          </div>
          <h1 className="text-3xl font-black text-white flex items-center gap-3">
            Concepts Management
          </h1>
          <p className="text-zinc-400 text-sm mt-2 max-w-lg">Manage concepts within your chapters.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-primary hover:bg-primary-hover text-white px-5 py-2.5 rounded-xl font-medium flex items-center gap-2 transition-colors shadow-sm"
        >
          <Plus className="w-5 h-5" />
          Add Concept
        </button>
      </div>

      <div className="bg-[#161618] p-4 rounded-[20px] border border-[#262626] flex items-center gap-4">
        <label className="text-sm font-medium text-zinc-400 whitespace-nowrap">Filter by Chapter:</label>
        <select 
          value={selectedChapterId} 
          onChange={handleFilter} 
          className="flex-1 p-2.5 bg-[#141416] border border-[#333] text-white rounded-xl max-w-md focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
        >
          <option value="">All Chapters</option>
          {chapters.map(c => (
            <option key={c.id} value={c.id}>{c.subject} - {c.name}</option>
          ))}
        </select>
      </div>

      <div className="bg-[#161618] rounded-[24px] border border-[#262626] overflow-hidden">
        <table className="w-full">
          <thead className="bg-[#141416] border-b border-[#262626] text-left text-xs font-bold text-zinc-400 uppercase tracking-wider">
            <tr>
              <th className="px-6 py-4">Chapter</th>
              <th className="px-6 py-4">Concept Name</th>
              <th className="px-6 py-4">Order</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#262626]">
            {isLoading ? (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-zinc-500">
                  Loading concepts...
                </td>
              </tr>
            ) : topics.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-zinc-500">
                  No concepts found for this chapter. Add one to get started!
                </td>
              </tr>
            ) : (
              topics.map((t) => (
                <tr key={t.id} className="hover:bg-[#1a1a1c] transition-colors">
                  <td className="px-6 py-4 text-zinc-500 font-medium">{t.chapters?.name}</td>
                  <td className="px-6 py-4 font-medium text-white">
                    <Link href={`/questions?concept_id=${t.id}&chapter_id=${t.chapter_id}&subject=${t.chapters?.subject || ''}&concept_name=${encodeURIComponent(t.name)}`} className="hover:text-cyan-400 hover:underline transition-colors">
                      {t.name}
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-zinc-400">{t.sort_order}</td>
                  <td className="px-6 py-4 text-right">
                    <Link
                      href={`/questions?concept_id=${t.id}&chapter_id=${t.chapter_id}&subject=${t.chapters?.subject || ''}&concept_name=${encodeURIComponent(t.name)}`}
                      className="inline-block p-2 text-zinc-500 hover:text-cyan-400 hover:bg-cyan-400/10 rounded-lg transition-colors mr-2"
                      title="Manage Questions"
                    >
                      <FileQuestion className="w-5 h-5" />
                    </Link>
                    <button 
                      onClick={() => deleteTopic(t.id)} 
                      className="p-2 text-zinc-500 hover:text-rose-400 hover:bg-rose-400/10 rounded-lg transition-colors"
                      title="Delete Concept"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 flex items-center justify-center p-4">
          <div className="bg-[#161618] border border-[#262626] rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-[#262626] flex justify-between items-center bg-[#141416]">
              <h2 className="text-xl font-bold text-white">Add New Concept</h2>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-zinc-500 hover:text-white hover:bg-[#262626] p-1.5 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={addTopic} className="p-6">
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1.5">Chapter</label>
                  <select 
                    required 
                    value={selectedChapterId} 
                    onChange={(e) => setSelectedChapterId(e.target.value)} 
                    className="w-full p-2.5 bg-[#141416] border border-[#333] rounded-xl text-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                  >
                    <option value="">Select a chapter...</option>
                    {chapters.map(c => (
                      <option key={c.id} value={c.id}>{c.subject} - {c.name}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1.5">Concept Name</label>
                  <input 
                    required 
                    type="text" 
                    value={name} 
                    onChange={(e) => setName(e.target.value)} 
                    placeholder="e.g. Newton's First Law"
                    className="w-full p-2.5 bg-[#141416] border border-[#333] rounded-xl text-white placeholder:text-zinc-600 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all" 
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1.5">Display Order</label>
                  <input 
                    required 
                    type="number" 
                    value={sortOrder} 
                    onChange={(e) => setSortOrder(e.target.value)} 
                    className="w-full p-2.5 bg-[#141416] border border-[#333] rounded-xl text-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all" 
                  />
                  <p className="text-xs text-zinc-500 mt-1.5">Determines the sequence in the app (e.g., 1, 2, 3...)</p>
                </div>
              </div>
              
              <div className="mt-8 flex gap-3 justify-end">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 text-zinc-400 font-medium hover:text-white hover:bg-[#262626] rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="bg-primary hover:bg-primary-hover disabled:bg-primary/60 text-white px-6 py-2.5 rounded-xl font-medium flex items-center gap-2 transition-colors shadow-sm"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Concept'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}

export default function TopicsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-zinc-500">Loading Concepts...</div>}>
      <ConceptsContent />
    </Suspense>
  );
}
