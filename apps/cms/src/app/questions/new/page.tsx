'use client';
import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Toast } from '@/components/Toast';
import { ImageIcon, Wand2, Loader2 } from 'lucide-react';
import WatermarkImage from '@/components/WatermarkImage';

function NewQuestionForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get('id');
  const initialConceptId = searchParams.get('concept_id');
  const initialChapterId = searchParams.get('chapter_id');
  const initialSubject = searchParams.get('subject');

  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
  
  const [chapters, setChapters] = useState<any[]>([]);
  const [topics, setTopics] = useState<any[]>([]);
  const [isLoadingChapters, setIsLoadingChapters] = useState(true);
  
  const [formData, setFormData] = useState({
    subject: initialSubject || 'physics',
    chapter_id: initialChapterId || '',
    concept_id: initialConceptId || '',
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
    author_difficulty_bucket: '',
    author_prior_b: 0,
  });

  const [isEvaluating, setIsEvaluating] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const [options, setOptions] = useState([{ id: '1', text: '' }, { id: '2', text: '' }]);
  
  // Matrix specific state
  const [matrixLeft, setMatrixLeft] = useState([{ id: 'A', text: '' }, { id: 'B', text: '' }, { id: 'C', text: '' }, { id: 'D', text: '' }]);
  const [matrixRight, setMatrixRight] = useState([{ id: 'P', text: '' }, { id: 'Q', text: '' }, { id: 'R', text: '' }, { id: 'S', text: '' }, { id: 'T', text: '' }]);
  const [matrixMatches, setMatrixMatches] = useState<Record<string, string[]>>({ 'A': [], 'B': [], 'C': [], 'D': [] });

  // History tracking for Undo/Redo
  const [history, setHistory] = useState<any[]>([]);
  const [pointer, setPointer] = useState(-1);

  // Capture initial state
  useEffect(() => {
    if (pointer === -1) {
      setHistory([{ formData, options }]);
      setPointer(0);
    }
  }, []);

  // Save history state (call this on significant changes, e.g. blur or format change)
  const pushHistory = (newFormData: any, newOptions: any) => {
    setHistory(prev => {
      const newHistory = prev.slice(0, pointer + 1);
      newHistory.push({ formData: newFormData, options: newOptions });
      if (newHistory.length > 30) newHistory.shift(); // Keep last 30 states
      return newHistory;
    });
    setPointer(prev => Math.min(prev + 1, 30));
  };

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;
      
      // Save: Ctrl/Cmd + S
      if (cmdOrCtrl && e.key === 's') {
        e.preventDefault();
        const form = document.getElementById('question-form') as HTMLFormElement;
        if (form) form.requestSubmit();
      }
      
      // Undo/Redo only if we aren't actively typing in a text field (let native undo handle text)
      const activeTag = document.activeElement?.tagName.toLowerCase();
      const isTyping = activeTag === 'input' || activeTag === 'textarea';

      // Undo: Ctrl/Cmd + Z
      if (cmdOrCtrl && e.key === 'z' && !e.shiftKey) {
        if (!isTyping) {
          e.preventDefault();
          if (pointer > 0) {
            const prevState = history[pointer - 1];
            setFormData(prevState.formData);
            setOptions(prevState.options);
            setPointer(pointer - 1);
            setToast({ message: 'Undo', type: 'success' });
          }
        }
      }
      
      // Redo: Ctrl/Cmd + Shift + Z or Ctrl/Cmd + Y
      if ((cmdOrCtrl && e.key === 'z' && e.shiftKey) || (cmdOrCtrl && e.key === 'y')) {
        if (!isTyping) {
          e.preventDefault();
          if (pointer < history.length - 1) {
            const nextState = history[pointer + 1];
            setFormData(nextState.formData);
            setOptions(nextState.options);
            setPointer(pointer + 1);
            setToast({ message: 'Redo', type: 'success' });
          }
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [history, pointer]);

  useEffect(() => {
    if (editId) {
      fetchQuestionData(editId);
    }
  }, [editId]);

  const fetchQuestionData = async (id: string) => {
    const res = await fetch(`/api/questions/${id}`);
    const data = await res.json();
    if (data && !data.error) {
      setFormData({
        subject: data.subject || 'physics',
        chapter_id: data.chapter_id || '',
        concept_id: data.concept_id || '',
        format: data.format || 'mcq_single',
        difficulty: data.difficulty || 'medium',
        source_type: data.source_type || 'non_pyq',
        pyq_year: data.pyq_year?.toString() || '',
        pyq_paper: data.pyq_paper?.toString() || '',
        pyq_shift: data.pyq_shift?.toString() || '',
        question_body: data.question_body || '',
        correct_answer: data.correct_answer || '',
        solution: data.solution || '',
        published: data.published || false,
        author_difficulty_bucket: data.author_difficulty_bucket || '',
        author_prior_b: data.author_prior_b || 0,
      });
      if (data.options && Array.isArray(data.options)) {
        setOptions(data.options);
      } else if (data.options && data.options.type === 'matrix') {
        setMatrixLeft(data.options.left || []);
        setMatrixRight(data.options.right || []);
        // parse correct_answer string "A:P,Q; B:R" into matrixMatches
        const matches: Record<string, string[]> = {};
        data.options.left?.forEach((l: any) => matches[l.id] = []);
        if (data.correct_answer) {
          data.correct_answer.split(';').forEach((pair: string) => {
            const [leftId, rightStr] = pair.split(':').map(s => s.trim());
            if (leftId && rightStr) {
              matches[leftId] = rightStr.split(',').map(s => s.trim()).filter(Boolean);
            }
          });
        }
        setMatrixMatches(matches);
      }
    }
  };

  useEffect(() => {
    fetchChapters();
  }, [formData.subject]);

  useEffect(() => {
    if (formData.chapter_id) fetchTopics(formData.chapter_id);
    else setTopics([]);
  }, [formData.chapter_id]);

  const fetchChapters = async () => {
    setIsLoadingChapters(true);
    const res = await fetch('/api/chapters');
    const data = await res.json();
    if (Array.isArray(data)) {
      setChapters(data.filter((c: any) => c.subject === formData.subject));
    } else {
      console.error(data.error || 'Failed to fetch chapters');
      setChapters([]);
    }
    setIsLoadingChapters(false);
  };

  const fetchTopics = async (chapterId: string) => {
    const res = await fetch(`/api/topics?chapter_id=${chapterId}`);
    const data = await res.json();
    if (Array.isArray(data)) {
      setTopics(data);
    } else {
      console.error(data.error || 'Failed to fetch topics');
      setTopics([]);
    }
  };

  const handleSubjectChange = (val: string) => {
    setFormData({ ...formData, subject: val, chapter_id: '', concept_id: '' });
  };

  const handleChapterChange = (val: string) => {
    setFormData({ ...formData, chapter_id: val, concept_id: '' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Construct options payload
    let finalOptions: any = null;
    let finalCorrectAnswer = formData.correct_answer;

    if (formData.format === 'matrix') {
      finalOptions = { type: 'matrix', left: matrixLeft, right: matrixRight };
      // Build correct answer string from matches (e.g. "A:P,Q; B:R")
      finalCorrectAnswer = Object.entries(matrixMatches)
        .map(([leftId, rightIds]) => rightIds.length > 0 ? `${leftId}:${rightIds.join(',')}` : null)
        .filter(Boolean)
        .join('; ');
    } else if (formData.format.includes('mcq')) {
      finalOptions = options;
    }

    const payload = {
      ...formData,
      correct_answer: finalCorrectAnswer,
      options: finalOptions,
      pyq_year: formData.pyq_year ? parseInt(formData.pyq_year) : null,
      pyq_paper: formData.pyq_paper ? parseInt(formData.pyq_paper) : null,
      pyq_shift: formData.pyq_shift ? parseInt(formData.pyq_shift) : null,
      author_difficulty_bucket: formData.author_difficulty_bucket || 'medium',
      author_prior_b: formData.author_prior_b || 0,
    };

    const url = editId ? `/api/questions/${editId}` : '/api/questions';
    const method = editId ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      body: JSON.stringify(payload),
      headers: { 'Content-Type': 'application/json' },
    });

    if (res.ok) {
      setToast({ message: `Question ${editId ? 'updated' : 'created'} successfully!`, type: 'success' });
      setTimeout(() => router.push(formData.concept_id ? `/questions?concept_id=${formData.concept_id}` : '/questions'), 1500);
    } else {
      let errorMessage = `Failed to ${editId ? 'update' : 'create'} question.`;
      try {
        const data = await res.json();
        if (data.error) errorMessage = data.error;
      } catch (e) {}
      setToast({ message: errorMessage, type: 'error' });
    }
  };

  return (
    <div className="max-w-[1000px] mx-auto pb-10">
      <div className="mb-8">
        <div className="inline-block px-3 py-1.5 rounded-full bg-[#1e2030] text-[#8692f7] text-[10px] font-bold uppercase tracking-widest mb-3">
          Questions
        </div>
        <h1 className="text-3xl font-black text-white">{editId ? 'Edit Question' : 'Add New Question'}</h1>
      </div>

      <form id="question-form" onSubmit={handleSubmit} className="bg-[#161618] rounded-[24px] border border-[#262626] p-8 space-y-8">
        {!initialConceptId && !editId && !isLoadingChapters && chapters.length === 0 && (
          <div className="bg-amber-400/10 border border-amber-400/20 text-amber-400 px-4 py-3 rounded-xl flex items-center gap-3 text-sm">
            <span className="font-semibold">No Chapters Found:</span> 
            <span>You must create a chapter in this subject before adding questions.</span>
          </div>
        )}

        {!initialConceptId && !editId && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">Subject</label>
              <select value={formData.subject} onChange={e => handleSubjectChange(e.target.value)} className="w-full p-2.5 bg-[#141416] border border-[#333] text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all">
                <option value="physics">Physics</option>
                <option value="chemistry">Chemistry</option>
                <option value="maths">Maths</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">Chapter</label>
              <select required value={formData.chapter_id} onChange={e => handleChapterChange(e.target.value)} className="w-full p-2.5 bg-[#141416] border border-[#333] text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all">
                <option value="">Select Chapter...</option>
                {chapters.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">Topic</label>
              <select required value={formData.concept_id} onChange={e => setFormData({...formData, concept_id: e.target.value})} className="w-full p-2.5 bg-[#141416] border border-[#333] text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all">
                <option value="">Select Topic...</option>
                {topics.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">Format</label>
            <select value={formData.format} onChange={e => setFormData({...formData, format: e.target.value})} className="w-full p-2.5 bg-[#141416] border border-[#333] text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all">
              <option value="mcq_single">Single Correct (MCQ)</option>
              <option value="mcq_multi">Multiple Correct</option>
              <option value="integer">Integer Type</option>
              <option value="numerical">Numeric Type</option>
              <option value="matrix">Matrix Match</option>
              <option value="assertion_reason">Assertion Reason</option>
              <option value="passage">Passage Based</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">Difficulty</label>
            <select value={formData.difficulty} onChange={e => setFormData({...formData, difficulty: e.target.value})} className="w-full p-2.5 bg-[#141416] border border-[#333] text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all">
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">Source Type</label>
            <select value={formData.source_type} onChange={e => setFormData({...formData, source_type: e.target.value})} className="w-full p-2.5 bg-[#141416] border border-[#333] text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all">
              <option value="non_pyq">Non-PYQ</option>
              <option value="pyq">PYQ</option>
            </select>
          </div>
        </div>

        {formData.source_type === 'pyq' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-[#1a1a1c] p-6 rounded-[20px] border border-[#262626]">
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">Year</label>
              <input type="number" value={formData.pyq_year} onChange={e => setFormData({...formData, pyq_year: e.target.value})} className="w-full p-2.5 bg-[#141416] border border-[#333] text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">Paper</label>
              <input type="number" value={formData.pyq_paper} onChange={e => setFormData({...formData, pyq_paper: e.target.value})} className="w-full p-2.5 bg-[#141416] border border-[#333] text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">Shift</label>
              <input type="number" value={formData.pyq_shift} onChange={e => setFormData({...formData, pyq_shift: e.target.value})} className="w-full p-2.5 bg-[#141416] border border-[#333] text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
            </div>
          </div>
        )}

        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="block text-sm font-medium text-zinc-400">Question Body (LaTeX supported)</label>
            <label className={`cursor-pointer flex items-center gap-2 text-sm font-medium transition-colors ${isUploadingImage ? 'text-zinc-500' : 'text-[#8692f7] hover:text-[#6a78f2]'}`}>
              {isUploadingImage ? <Loader2 size={16} className="animate-spin" /> : <ImageIcon size={16} />}
              {isUploadingImage ? 'Uploading...' : 'Upload Image'}
              <input 
                type="file" 
                accept="image/*" 
                className="hidden" 
                disabled={isUploadingImage}
                onChange={async (e) => {
                  if (e.target.files && e.target.files[0]) {
                    setIsUploadingImage(true);
                    try {
                      const fd = new FormData();
                      fd.append('image', e.target.files[0]);
                      const res = await fetch('/api/upload-image', { method: 'POST', body: fd });
                      const data = await res.json();
                      if (data.error) throw new Error(data.error);
                      setFormData({...formData, question_body: formData.question_body + `\n![image](${data.url})\n`});
                      setToast({ message: 'Image uploaded & watermarked successfully!', type: 'success' });
                    } catch (err: any) {
                      setToast({ message: err.message, type: 'error' });
                    } finally {
                      setIsUploadingImage(false);
                      e.target.value = '';
                    }
                  }
                }} 
              />
            </label>
          </div>
          <textarea required rows={6} value={formData.question_body} onBlur={() => pushHistory(formData, options)} onChange={e => setFormData({...formData, question_body: e.target.value})} className="w-full p-4 bg-[#141416] border border-[#333] text-white rounded-xl font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" placeholder="Write question content here..."></textarea>
          
          {/* AI Evaluation Button */}
          <div className="mt-4 flex flex-col md:flex-row gap-4 items-start md:items-center p-4 bg-[#1a1a1c] border border-[#262626] rounded-xl">
            <button
              type="button"
              disabled={isEvaluating || !formData.question_body}
              onClick={async () => {
                setIsEvaluating(true);
                try {
                  const payload = {
                    question_body: formData.question_body,
                    options: formData.format.includes('mcq') ? options : null,
                    subject: formData.subject
                  };
                  const res = await fetch('/api/evaluate-question', {
                    method: 'POST',
                    body: JSON.stringify(payload)
                  });
                  const data = await res.json();
                  if (data.error) throw new Error(data.error);
                  
                  setFormData(prev => ({
                    ...prev,
                    author_difficulty_bucket: data.author_difficulty_bucket,
                    author_prior_b: data.author_prior_b
                  }));
                  setToast({ message: 'AI evaluated question successfully!', type: 'success' });
                } catch (err: any) {
                  setToast({ message: err.message || 'AI evaluation failed', type: 'error' });
                } finally {
                  setIsEvaluating(false);
                }
              }}
              className="flex items-center gap-2 bg-[#2c2e3e] hover:bg-[#3a3c4f] disabled:bg-[#222] disabled:text-zinc-600 text-[#a5b4fc] px-4 py-2 rounded-lg font-medium transition-colors text-sm"
            >
              {isEvaluating ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
              Auto-Evaluate Difficulty
            </button>

            <div className="flex gap-4 flex-1 w-full">
              <div className="flex-1">
                <select value={formData.author_difficulty_bucket} onChange={e => setFormData({...formData, author_difficulty_bucket: e.target.value})} className="w-full p-2 bg-[#141416] border border-[#333] text-zinc-300 rounded-lg text-sm focus:outline-none focus:border-primary">
                  <option value="">Select Bucket...</option>
                  <option value="easy">Easy</option>
                  <option value="slightly_easy">Slightly Easy</option>
                  <option value="medium">Medium</option>
                  <option value="slightly_medium">Slightly Medium</option>
                  <option value="slightly_hard">Slightly Hard</option>
                  <option value="hard">Hard</option>
                </select>
              </div>
              <div className="flex-1">
                <input type="number" step="0.1" value={formData.author_prior_b} onChange={e => setFormData({...formData, author_prior_b: parseFloat(e.target.value)})} className="w-full p-2 bg-[#141416] border border-[#333] text-zinc-300 rounded-lg text-sm focus:outline-none focus:border-primary" placeholder="Prior b (e.g. 0.5)" />
              </div>
            </div>
          </div>
        </div>

        {/* FORMAT-SPECIFIC UI */}
        {(formData.format === 'mcq_single' || formData.format === 'mcq_multi' || formData.format === 'assertion_reason') && (
          <div className="space-y-6">
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium text-zinc-400">Options</label>
              <button type="button" onClick={() => setOptions([...options, { id: Date.now().toString(), text: '' }])} className="text-sm text-[#8692f7] font-medium hover:text-[#6a78f2] transition-colors">
                + Add Option
              </button>
            </div>
            
            <div className="text-xs text-zinc-500 font-medium mb-1 pl-12 uppercase tracking-widest">Select Correct</div>
            <div className="space-y-3">
              {options.map((opt: any, i) => {
                const isChecked = formData.format === 'mcq_single' 
                  ? formData.correct_answer === (i + 1).toString()
                  : formData.correct_answer.split(',').includes((i + 1).toString());
                
                return (
                  <div key={opt.id} className="flex flex-col gap-2 p-3 bg-[#1a1a1c] border border-[#262626] rounded-xl">
                    <div className="flex gap-3 items-center">
                      <div className="w-8 flex justify-center">
                        {formData.format === 'mcq_single' || formData.format === 'assertion_reason' ? (
                          <input type="radio" name="correct_answer" checked={isChecked} onChange={() => setFormData({...formData, correct_answer: (i + 1).toString()})} className="w-4 h-4 text-primary bg-[#141416] border-[#333] focus:ring-primary/20" />
                        ) : (
                          <input type="checkbox" checked={isChecked} onChange={(e) => {
                            let current = formData.correct_answer ? formData.correct_answer.split(',') : [];
                            if (e.target.checked) current.push((i + 1).toString());
                            else current = current.filter(val => val !== (i + 1).toString());
                            setFormData({...formData, correct_answer: current.sort().join(',')});
                          }} className="w-4 h-4 text-primary bg-[#141416] border-[#333] rounded focus:ring-primary/20" />
                        )}
                      </div>
                      <span className="w-4 text-center font-bold text-zinc-500">{i + 1}</span>
                      <input type="text" value={opt.text} onChange={e => {
                        const newOpts = [...options];
                        newOpts[i].text = e.target.value;
                        setOptions(newOpts);
                      }} className="flex-1 p-2.5 bg-[#141416] border border-[#333] text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" placeholder={`Option text`} />
                      
                      <label className="cursor-pointer text-zinc-400 hover:text-[#8692f7] p-2 transition-colors">
                        <ImageIcon size={18} />
                        <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                          if (e.target.files && e.target.files[0]) {
                            const loadingToastId = Date.now().toString();
                            setToast({ message: 'Uploading option image...', type: 'success' });
                            try {
                              const fd = new FormData();
                              fd.append('image', e.target.files[0]);
                              const res = await fetch('/api/upload-image', { method: 'POST', body: fd });
                              const data = await res.json();
                              if (data.error) throw new Error(data.error);
                              
                              const newOpts = [...options];
                              newOpts[i].image_url = data.url;
                              setOptions(newOpts);
                              setToast({ message: 'Option image added!', type: 'success' });
                            } catch (err: any) {
                              setToast({ message: err.message, type: 'error' });
                            }
                            e.target.value = '';
                          }
                        }} />
                      </label>

                      <button type="button" onClick={() => setOptions(options.filter((_, idx) => idx !== i))} className="text-rose-400 hover:bg-rose-400/10 p-2 rounded-lg transition-colors">✕</button>
                    </div>
                    {opt.image_url && (
                      <div className="ml-16 relative w-fit">
                        <WatermarkImage src={opt.image_url} alt="Option image" className="h-16 rounded border border-[#333] object-contain" />
                        <button type="button" onClick={() => {
                          const newOpts = [...options];
                          delete newOpts[i].image_url;
                          setOptions(newOpts);
                        }} className="absolute -top-2 -right-2 bg-rose-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">✕</button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {(formData.format === 'integer' || formData.format === 'numerical') && (
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">Correct Answer</label>
            <input required type="text" value={formData.correct_answer} onChange={e => {
              // Optionally validate input if it's integer vs numeric
              let val = e.target.value;
              if (formData.format === 'integer') val = val.replace(/[^0-9-]/g, '');
              else val = val.replace(/[^0-9.-]/g, '');
              setFormData({...formData, correct_answer: val})
            }} className="w-full p-2.5 bg-[#141416] border border-[#333] text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" placeholder={formData.format === 'integer' ? "e.g. 5" : "e.g. 5.25"} />
            <p className="text-xs text-zinc-500 mt-2">
              {formData.format === 'integer' ? "Must be a whole number (e.g. 42 or -5)." : "Can include decimals (e.g. 3.14 or -0.5)."}
            </p>
          </div>
        )}

        {formData.format === 'matrix' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Column 1 Builder */}
              <div>
                <div className="flex justify-between items-center mb-3">
                  <label className="block text-sm font-medium text-zinc-400">Column 1 (Left)</label>
                  <button type="button" onClick={() => setMatrixLeft([...matrixLeft, { id: String.fromCharCode(65 + matrixLeft.length), text: '' }])} className="text-sm text-[#8692f7] hover:text-[#6a78f2]">
                    + Add Item
                  </button>
                </div>
                <div className="space-y-2">
                  {matrixLeft.map((item, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <span className="w-6 text-center font-bold text-zinc-500">{item.id}</span>
                      <input type="text" value={item.text} onChange={e => {
                        const next = [...matrixLeft];
                        next[i].text = e.target.value;
                        setMatrixLeft(next);
                      }} className="flex-1 p-2 bg-[#141416] border border-[#333] text-white rounded-lg text-sm" placeholder="Text..." />
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Column 2 Builder */}
              <div>
                <div className="flex justify-between items-center mb-3">
                  <label className="block text-sm font-medium text-zinc-400">Column 2 (Right)</label>
                  <button type="button" onClick={() => setMatrixRight([...matrixRight, { id: String.fromCharCode(80 + matrixRight.length), text: '' }])} className="text-sm text-[#8692f7] hover:text-[#6a78f2]">
                    + Add Item
                  </button>
                </div>
                <div className="space-y-2">
                  {matrixRight.map((item, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <span className="w-6 text-center font-bold text-zinc-500">{item.id}</span>
                      <input type="text" value={item.text} onChange={e => {
                        const next = [...matrixRight];
                        next[i].text = e.target.value;
                        setMatrixRight(next);
                      }} className="flex-1 p-2 bg-[#141416] border border-[#333] text-white rounded-lg text-sm" placeholder="Text..." />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Matrix Mapping Grid */}
            <div className="mt-6 border border-[#262626] rounded-xl overflow-hidden bg-[#1a1a1c]">
              <div className="bg-[#262626] p-3 border-b border-[#333] font-medium text-sm text-zinc-300">Select Correct Matches</div>
              <div className="p-4 overflow-x-auto">
                <table className="w-full text-center">
                  <thead>
                    <tr>
                      <th className="p-2 text-zinc-500 font-medium"></th>
                      {matrixRight.map(r => (
                        <th key={r.id} className="p-2 text-zinc-400 font-bold">{r.id}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {matrixLeft.map(l => (
                      <tr key={l.id} className="border-t border-[#262626]">
                        <td className="p-2 text-zinc-400 font-bold">{l.id}</td>
                        {matrixRight.map(r => {
                          const isMatched = matrixMatches[l.id]?.includes(r.id);
                          return (
                            <td key={r.id} className="p-2">
                              <input 
                                type="checkbox" 
                                checked={isMatched}
                                onChange={(e) => {
                                  const matches = { ...matrixMatches };
                                  if (!matches[l.id]) matches[l.id] = [];
                                  if (e.target.checked) matches[l.id].push(r.id);
                                  else matches[l.id] = matches[l.id].filter(id => id !== r.id);
                                  setMatrixMatches(matches);
                                }}
                                className="w-5 h-5 text-primary bg-[#141416] border-[#333] rounded focus:ring-primary/20 cursor-pointer"
                              />
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-2">Solution</label>
          <textarea rows={4} value={formData.solution} onBlur={() => pushHistory(formData, options)} onChange={e => setFormData({...formData, solution: e.target.value})} className="w-full p-4 bg-[#141416] border border-[#333] text-white rounded-xl font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" placeholder="Write solution here..."></textarea>
        </div>

        <div className="flex items-center gap-3">
          <input type="checkbox" id="published" checked={formData.published} onChange={e => setFormData({...formData, published: e.target.checked})} className="w-5 h-5 bg-[#141416] border-[#333] text-primary rounded focus:ring-primary/20" />
          <label htmlFor="published" className="text-sm font-medium text-zinc-300">Publish immediately</label>
        </div>

        <div className="pt-6 border-t border-[#262626] flex justify-between items-center">
          <div className="flex items-center gap-4 text-xs text-zinc-500 font-medium hidden md:flex">
             <span className="flex items-center gap-1.5"><kbd className="px-2 py-1 bg-[#222] border border-[#333] rounded-md text-zinc-300 font-mono">⌘ S</kbd> Save</span>
             <span className="flex items-center gap-1.5"><kbd className="px-2 py-1 bg-[#222] border border-[#333] rounded-md text-zinc-300 font-mono">⌘ Z</kbd> Undo</span>
             <span className="flex items-center gap-1.5"><kbd className="px-2 py-1 bg-[#222] border border-[#333] rounded-md text-zinc-300 font-mono">⌘ ⇧ Z</kbd> Redo</span>
          </div>
          <div className="flex justify-end flex-1">
            <button type="button" onClick={() => router.back()} className="px-6 py-2.5 text-zinc-400 hover:text-white mr-4 transition-colors">Cancel</button>
            <button type="submit" disabled={!initialConceptId && !editId && chapters.length === 0} className="bg-primary hover:bg-primary-hover disabled:bg-primary/50 text-white px-8 py-2.5 rounded-xl font-bold transition-colors shadow-sm">
              {editId ? 'Save Changes' : 'Save Question'}
            </button>
          </div>
        </div>
      </form>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}

export default function NewQuestionPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-zinc-500">Loading form...</div>}>
      <NewQuestionForm />
    </Suspense>
  );
}
