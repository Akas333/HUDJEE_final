'use client';
import { useState, useEffect } from 'react';
import { Toast } from '@/components/Toast';
import { Plus, X, Trash2, BookOpen, ListTree } from 'lucide-react';
import Link from 'next/link';

export default function ChaptersPage() {
  const [chapters, setChapters] = useState<any[]>([]);
  const [subject, setSubject] = useState('physics');
  const [name, setName] = useState('');
  const [sortOrder, setSortOrder] = useState('1');
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchChapters();
  }, []);

  const fetchChapters = async () => {
    setIsLoading(true);
    const res = await fetch('/api/chapters');
    const data = await res.json();
    if (Array.isArray(data)) {
      setChapters(data);
    } else {
      console.error(data.error || 'Failed to fetch chapters');
      setChapters([]);
    }
    setIsLoading(false);
  };

  const addChapter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setToast({ message: 'Chapter name is required', type: 'error' });
      return;
    }
    
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/chapters', {
        method: 'POST',
        body: JSON.stringify({ subject, name, sort_order: parseInt(sortOrder) || 0 }),
        headers: { 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        setToast({ message: 'Chapter added successfully!', type: 'success' });
        setName('');
        setSortOrder((prev) => (parseInt(prev) + 1).toString());
        setIsModalOpen(false);
        fetchChapters();
      } else {
        const errorData = await res.json();
        setToast({ message: errorData.error || 'Failed to add chapter', type: 'error' });
      }
    } catch (error) {
      setToast({ message: 'A network error occurred', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteChapter = async (id: string) => {
    if (!confirm('Are you sure you want to delete this chapter?')) return;
    await fetch(`/api/chapters/${id}`, { method: 'DELETE' });
    setToast({ message: 'Chapter deleted', type: 'success' });
    fetchChapters();
  };

  return (
    <div className="max-w-[1200px] mx-auto space-y-8 pb-10">
      <div className="flex justify-between items-center bg-[#161618] border border-[#262626] rounded-[24px] p-8">
        <div>
          <div className="inline-block px-3 py-1.5 rounded-full bg-[#1e2030] text-[#8692f7] text-[10px] font-bold uppercase tracking-widest mb-3">
            Syllabus
          </div>
          <h1 className="text-3xl font-black text-white flex items-center gap-3">
            Chapters Management
          </h1>
          <p className="text-zinc-400 text-sm mt-2 max-w-lg">Create and organize chapters for each subject.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-primary hover:bg-primary-hover text-white px-5 py-2.5 rounded-xl font-medium flex items-center gap-2 transition-colors shadow-sm"
        >
          <Plus className="w-5 h-5" />
          Add Chapter
        </button>
      </div>

      <div className="bg-[#161618] rounded-[24px] border border-[#262626] overflow-hidden">
        <table className="w-full">
          <thead className="bg-[#141416] border-b border-[#262626] text-left text-xs font-bold text-zinc-400 uppercase tracking-wider">
            <tr>
              <th className="px-6 py-4">Subject</th>
              <th className="px-6 py-4">Chapter Name</th>
              <th className="px-6 py-4">Order</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#262626]">
            {isLoading ? (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-zinc-500">
                  Loading chapters...
                </td>
              </tr>
            ) : chapters.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-zinc-500">
                  No chapters found. Add one to get started!
                </td>
              </tr>
            ) : (
              chapters.map((c) => (
                <tr key={c.id} className="hover:bg-[#1a1a1c] transition-colors">
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest
                      ${c.subject === 'physics' ? 'bg-cyan-400/10 text-cyan-400' : 
                        c.subject === 'chemistry' ? 'bg-emerald-400/10 text-emerald-400' : 
                        'bg-purple-400/10 text-purple-400'}`}>
                      {c.subject}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-medium text-white">{c.name}</td>
                  <td className="px-6 py-4 text-zinc-400">{c.sort_order}</td>
                  <td className="px-6 py-4 text-right">
                    <Link
                      href={`/topics?chapter_id=${c.id}`}
                      className="inline-block p-2 text-zinc-500 hover:text-cyan-400 hover:bg-cyan-400/10 rounded-lg transition-colors mr-2"
                      title="Manage Concepts"
                    >
                      <ListTree className="w-5 h-5" />
                    </Link>
                    <button 
                      onClick={() => deleteChapter(c.id)} 
                      className="p-2 text-zinc-500 hover:text-rose-400 hover:bg-rose-400/10 rounded-lg transition-colors"
                      title="Delete Chapter"
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
              <h2 className="text-xl font-bold text-white">Add New Chapter</h2>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-zinc-500 hover:text-white hover:bg-[#262626] p-1.5 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={addChapter} className="p-6">
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1.5">Subject</label>
                  <select 
                    value={subject} 
                    onChange={(e) => setSubject(e.target.value)} 
                    className="w-full p-2.5 bg-[#141416] border border-[#333] rounded-xl text-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                  >
                    <option value="physics">Physics</option>
                    <option value="chemistry">Chemistry</option>
                    <option value="maths">Maths</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1.5">Chapter Name</label>
                  <input 
                    required 
                    type="text" 
                    value={name} 
                    onChange={(e) => setName(e.target.value)} 
                    placeholder="e.g. Thermodynamics"
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
                    'Save Chapter'
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
