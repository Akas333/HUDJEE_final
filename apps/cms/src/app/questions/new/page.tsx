'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Toast } from '@/components/Toast';

export default function NewQuestionPage() {
  const router = useRouter();
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
  
  const [chapters, setChapters] = useState<any[]>([]);
  const [topics, setTopics] = useState<any[]>([]);
  
  const [formData, setFormData] = useState({
    subject: 'physics',
    chapter_id: '',
    concept_id: '',
    format: 'mcq_single',
    difficulty: 'medium',
    source_type: 'non_pyq',
    pyq_year: '',
    pyq_paper: '',
    pyq_shift: '',
    question_body: '',
    correct_answer: '',
    solution: '',
    published: false,
  });

  const [options, setOptions] = useState([{ id: '1', text: '' }, { id: '2', text: '' }]);

  useEffect(() => {
    fetchChapters();
  }, [formData.subject]);

  useEffect(() => {
    if (formData.chapter_id) fetchTopics(formData.chapter_id);
    else setTopics([]);
  }, [formData.chapter_id]);

  const fetchChapters = async () => {
    const res = await fetch('/api/chapters');
    const data = await res.json();
    setChapters(data.filter((c: any) => c.subject === formData.subject) || []);
    setFormData(prev => ({ ...prev, chapter_id: '', concept_id: '' }));
  };

  const fetchTopics = async (chapterId: string) => {
    const res = await fetch(`/api/topics?chapter_id=${chapterId}`);
    const data = await res.json();
    setTopics(data || []);
    setFormData(prev => ({ ...prev, concept_id: '' }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...formData,
      options: options,
      pyq_year: formData.pyq_year ? parseInt(formData.pyq_year) : null,
      pyq_paper: formData.pyq_paper ? parseInt(formData.pyq_paper) : null,
      pyq_shift: formData.pyq_shift ? parseInt(formData.pyq_shift) : null,
    };

    const res = await fetch('/api/questions', {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: { 'Content-Type': 'application/json' },
    });

    if (res.ok) {
      setToast({ message: 'Question created successfully!', type: 'success' });
      setTimeout(() => router.push('/questions'), 1500);
    } else {
      setToast({ message: 'Failed to create question.', type: 'error' });
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Add New Question</h1>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 space-y-8">
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
            <select value={formData.subject} onChange={e => setFormData({...formData, subject: e.target.value})} className="w-full p-2 border border-gray-200 rounded-lg">
              <option value="physics">Physics</option>
              <option value="chemistry">Chemistry</option>
              <option value="maths">Maths</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Chapter</label>
            <select required value={formData.chapter_id} onChange={e => setFormData({...formData, chapter_id: e.target.value})} className="w-full p-2 border border-gray-200 rounded-lg">
              <option value="">Select Chapter...</option>
              {chapters.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Topic</label>
            <select required value={formData.concept_id} onChange={e => setFormData({...formData, concept_id: e.target.value})} className="w-full p-2 border border-gray-200 rounded-lg">
              <option value="">Select Topic...</option>
              {topics.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Format</label>
            <select value={formData.format} onChange={e => setFormData({...formData, format: e.target.value})} className="w-full p-2 border border-gray-200 rounded-lg">
              <option value="mcq_single">MCQ Single</option>
              <option value="mcq_multi">MCQ Multi</option>
              <option value="integer">Integer</option>
              <option value="numerical">Numerical</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Difficulty</label>
            <select value={formData.difficulty} onChange={e => setFormData({...formData, difficulty: e.target.value})} className="w-full p-2 border border-gray-200 rounded-lg">
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Source Type</label>
            <select value={formData.source_type} onChange={e => setFormData({...formData, source_type: e.target.value})} className="w-full p-2 border border-gray-200 rounded-lg">
              <option value="non_pyq">Non-PYQ</option>
              <option value="pyq">PYQ</option>
            </select>
          </div>
        </div>

        {formData.source_type === 'pyq' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-gray-50 p-4 rounded-lg">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Year</label>
              <input type="number" value={formData.pyq_year} onChange={e => setFormData({...formData, pyq_year: e.target.value})} className="w-full p-2 border border-gray-200 rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Paper</label>
              <input type="number" value={formData.pyq_paper} onChange={e => setFormData({...formData, pyq_paper: e.target.value})} className="w-full p-2 border border-gray-200 rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Shift</label>
              <input type="number" value={formData.pyq_shift} onChange={e => setFormData({...formData, pyq_shift: e.target.value})} className="w-full p-2 border border-gray-200 rounded-lg" />
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Question Body (LaTeX supported)</label>
          <textarea required rows={6} value={formData.question_body} onChange={e => setFormData({...formData, question_body: e.target.value})} className="w-full p-3 border border-gray-200 rounded-lg font-mono text-sm" placeholder="Write question content here..."></textarea>
        </div>

        {(formData.format.includes('mcq')) && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <label className="block text-sm font-medium text-gray-700">Options</label>
              <button type="button" onClick={() => setOptions([...options, { id: Date.now().toString(), text: '' }])} className="text-sm text-primary hover:underline">
                + Add Option
              </button>
            </div>
            <div className="space-y-3">
              {options.map((opt, i) => (
                <div key={opt.id} className="flex gap-3 items-center">
                  <span className="w-6 text-center font-bold text-gray-500">{i + 1}</span>
                  <input type="text" value={opt.text} onChange={e => {
                    const newOpts = [...options];
                    newOpts[i].text = e.target.value;
                    setOptions(newOpts);
                  }} className="flex-1 p-2 border border-gray-200 rounded-lg" placeholder={`Option ${i + 1}`} />
                  <button type="button" onClick={() => setOptions(options.filter((_, idx) => idx !== i))} className="text-red-500 hover:bg-red-50 p-2 rounded-lg">✕</button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Correct Answer</label>
          <input required type="text" value={formData.correct_answer} onChange={e => setFormData({...formData, correct_answer: e.target.value})} className="w-full p-2 border border-gray-200 rounded-lg" placeholder="e.g. 1, 2 or precise value" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Solution</label>
          <textarea rows={4} value={formData.solution} onChange={e => setFormData({...formData, solution: e.target.value})} className="w-full p-3 border border-gray-200 rounded-lg font-mono text-sm" placeholder="Write solution here..."></textarea>
        </div>

        <div className="flex items-center gap-3">
          <input type="checkbox" id="published" checked={formData.published} onChange={e => setFormData({...formData, published: e.target.checked})} className="w-5 h-5 text-primary rounded border-gray-300 focus:ring-primary" />
          <label htmlFor="published" className="text-sm font-medium text-gray-700">Publish immediately</label>
        </div>

        <div className="pt-4 border-t border-gray-100 flex justify-end">
          <button type="button" onClick={() => router.back()} className="px-6 py-2 text-gray-600 hover:text-gray-900 mr-4">Cancel</button>
          <button type="submit" className="bg-primary hover:bg-primary-hover text-white px-8 py-2 rounded-lg font-medium transition-colors">
            Save Question
          </button>
        </div>
      </form>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
