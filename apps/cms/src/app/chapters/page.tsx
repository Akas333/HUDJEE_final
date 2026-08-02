'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Toast } from '@/components/Toast';

export default function ChaptersPage() {
  const [chapters, setChapters] = useState<any[]>([]);
  const [subject, setSubject] = useState('physics');
  const [name, setName] = useState('');
  const [sortOrder, setSortOrder] = useState('1');
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    fetchChapters();
  }, []);

  const fetchChapters = async () => {
    const res = await fetch('/api/chapters');
    const data = await res.json();
    setChapters(data || []);
  };

  const addChapter = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/chapters', {
      method: 'POST',
      body: JSON.stringify({ subject, name, sort_order: parseInt(sortOrder) }),
      headers: { 'Content-Type': 'application/json' },
    });
    if (res.ok) {
      setToast({ message: 'Chapter added successfully!', type: 'success' });
      setName('');
      fetchChapters();
    } else {
      setToast({ message: 'Failed to add chapter', type: 'error' });
    }
  };

  const deleteChapter = async (id: string) => {
    if (!confirm('Delete this chapter?')) return;
    await fetch(`/api/chapters/${id}`, { method: 'DELETE' });
    fetchChapters();
  };

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Chapters</h1>

      <form onSubmit={addChapter} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-8 flex gap-4 items-end">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
          <select value={subject} onChange={(e) => setSubject(e.target.value)} className="w-full p-2 border border-gray-200 rounded-lg">
            <option value="physics">Physics</option>
            <option value="chemistry">Chemistry</option>
            <option value="maths">Maths</option>
          </select>
        </div>
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">Chapter Name</label>
          <input required type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full p-2 border border-gray-200 rounded-lg" />
        </div>
        <div className="w-24">
          <label className="block text-sm font-medium text-gray-700 mb-1">Order</label>
          <input required type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} className="w-full p-2 border border-gray-200 rounded-lg" />
        </div>
        <button type="submit" className="bg-primary hover:bg-primary-hover text-white px-6 py-2 rounded-lg h-[42px]">Add</button>
      </form>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 text-left text-sm font-medium text-gray-500">
            <tr>
              <th className="px-6 py-4">Subject</th>
              <th className="px-6 py-4">Name</th>
              <th className="px-6 py-4">Order</th>
              <th className="px-6 py-4">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {chapters.map((c) => (
              <tr key={c.id}>
                <td className="px-6 py-4 capitalize">{c.subject}</td>
                <td className="px-6 py-4">{c.name}</td>
                <td className="px-6 py-4">{c.sort_order}</td>
                <td className="px-6 py-4">
                  <button onClick={() => deleteChapter(c.id)} className="text-red-500 hover:text-red-700">Delete</button>
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
