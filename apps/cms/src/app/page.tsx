'use client';
import { useEffect, useState } from 'react';
import { FileQuestion, BookOpen, ListTree, CheckCircle } from 'lucide-react';

export default function Dashboard() {
  const [stats, setStats] = useState({ questions: 0, chapters: 0, topics: 0, published: 0 });

  useEffect(() => {
    fetch('/api/stats')
      .then(res => res.json())
      .then(data => setStats(data));
  }, []);

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
            <FileQuestion size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Total Questions</p>
            <p className="text-2xl font-bold text-gray-900">{stats.questions}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="p-3 bg-purple-50 text-purple-600 rounded-lg">
            <BookOpen size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Total Chapters</p>
            <p className="text-2xl font-bold text-gray-900">{stats.chapters}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="p-3 bg-orange-50 text-orange-600 rounded-lg">
            <ListTree size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Total Topics</p>
            <p className="text-2xl font-bold text-gray-900">{stats.topics}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="p-3 bg-green-50 text-green-600 rounded-lg">
            <CheckCircle size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Published Questions</p>
            <p className="text-2xl font-bold text-gray-900">{stats.published}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
