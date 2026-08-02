'use client';
import { useState, useEffect } from 'react';
import { Toast } from '@/components/Toast';

export default function TopicsPage() {
  const [topics, setTopics] = useState<any[]>([]);
  const [chapters, setChapters] = useState<any[]>([]);
  const [selectedChapterId, setSelectedChapterId] = useState('');
  const [name, setName] = useState('');
  const [sortOrder, setSortOrder] = useState('1');
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    fetchChapters();
    fetchTopics('');
  }, []);

  const fetchChapters = async () => {
    const res = await fetch('/api/chapters');
    const data = await res.json();
    setChapters(data || []);
  };

  const fetchTopics = async (chapterId: string) => {
    const res = await fetch(`/api/topics${chapterId ? `?chapter_id=${chapterId}` : ''}`);
    const data = await res.json();
    setTopics(data || []);
  };

  const handleFilter = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    setSelectedChapterId(id);
    fetchTopics(id);
  };

  const addTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedChapterId) return alert('Select a chapter first');
    
    const res = await fetch('/api/topics', {
      method: 'POST',
      body: JSON.stringify({ chapter_id: selectedChapterId, name, sort_order: parseInt(sortOrder) }),
      headers: { 'Content-Type': 'application/json' },
    });
    
    if (res.ok) {
      setToast({ message: 'Topic added successfully!', type: 'success' });
      setName('');
      fetchTopics(selectedChapterId);
    } else {
      setToast({ message: 'Failed to add topic', type: 'error' });
    }
  };

  const deleteTopic = async (id: string) => {
    if (!confirm('Delete this topic?')) return;
    await fetch(`/api/topics/${id}`, { method: 'DELETE' });
    fetchTopics(selectedChapterId);
  };

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Topics</h1>

      <form onSubmit={addTopic} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-8 flex gap-4 items-end">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">Filter / Assign Chapter</label>
          <select value={selectedChapterId} onChange={handleFilter} className="w-full p-2 border border-gray-200 rounded-lg">
            <option value="">All Chapters</option>
            {chapters.map(c => (
              <option key={c.id} value={c.id}>{c.subject} - {c.name}</option>
            ))}
          </select>
        </div>
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">Topic Name</label>
          <input required type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full p-2 border border-gray-200 rounded-lg" />
        </div>
        <div className="w-24">
          <label className="block text-sm font-medium text-gray-700 mb-1">Order</label>
          <input required type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} className="w-full p-2 border border-gray-200 rounded-lg" />
        </div>
        <button type="submit" disabled={!selectedChapterId} className="bg-primary hover:bg-primary-hover disabled:bg-gray-300 text-white px-6 py-2 rounded-lg h-[42px]">Add</button>
      </form>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 text-left text-sm font-medium text-gray-500">
            <tr>
              <th className="px-6 py-4">Chapter</th>
              <th className="px-6 py-4">Topic Name</th>
              <th className="px-6 py-4">Order</th>
              <th className="px-6 py-4">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {topics.map((t) => (
              <tr key={t.id}>
                <td className="px-6 py-4">{t.chapters?.name}</td>
                <td className="px-6 py-4">{t.name}</td>
                <td className="px-6 py-4">{t.sort_order}</td>
                <td className="px-6 py-4">
                  <button onClick={() => deleteTopic(t.id)} className="text-red-500 hover:text-red-700">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
