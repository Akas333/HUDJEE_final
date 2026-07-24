'use client'

import { useState } from 'react'
import TipTapEditor from '@/components/TipTapEditor'
import { PlusCircle, Save, X } from 'lucide-react'

export default function Dashboard() {
  const [isAdding, setIsAdding] = useState(false)
  const [questionHtml, setQuestionHtml] = useState('')
  const [solutionHtml, setSolutionHtml] = useState('')
  const [subject, setSubject] = useState('physics')
  const [difficulty, setDifficulty] = useState('medium')

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    // Here we will call our Next.js API route to save to Supabase
    const payload = {
      subject,
      difficulty,
      question_body: questionHtml,
      solution: solutionHtml,
      format: 'mcq_single',
      chapter: 'General',
      topic: 'General',
      source_type: 'pyq',
      correct_answer: 'A'
    }

    try {
      const res = await fetch('/api/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      if (res.ok) {
        alert("Question saved successfully!")
        setIsAdding(false)
        setQuestionHtml('')
        setSolutionHtml('')
      } else {
        alert("Failed to save question.")
      }
    } catch (err) {
      console.error(err)
      alert("Error saving question.")
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Question Bank</h2>
          <p className="text-slate-500 mt-1">Manage JEE Previous Year Questions (PYQs)</p>
        </div>
        {!isAdding && (
          <button 
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            <PlusCircle size={20} />
            Add New Question
          </button>
        )}
      </div>

      {isAdding && (
        <form onSubmit={handleSave} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-6 animate-in fade-in slide-in-from-top-4">
          <div className="flex justify-between items-center border-b border-slate-100 pb-4">
            <h3 className="text-xl font-semibold text-slate-800">New Question</h3>
            <button type="button" onClick={() => setIsAdding(false)} className="text-slate-400 hover:text-slate-600">
              <X size={24} />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700">Subject</label>
              <select 
                value={subject} 
                onChange={(e) => setSubject(e.target.value)}
                className="w-full border border-slate-300 rounded-lg p-2.5 bg-slate-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              >
                <option value="physics">Physics</option>
                <option value="chemistry">Chemistry</option>
                <option value="maths">Mathematics</option>
              </select>
            </div>
            
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700">Difficulty</label>
              <select 
                value={difficulty} 
                onChange={(e) => setDifficulty(e.target.value)}
                className="w-full border border-slate-300 rounded-lg p-2.5 bg-slate-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700">Question Content (LaTeX supported)</label>
            <TipTapEditor content={questionHtml} onChange={setQuestionHtml} />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700">Solution Explanation</label>
            <TipTapEditor content={solutionHtml} onChange={setSolutionHtml} />
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-100">
            <button type="submit" className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-6 py-2.5 rounded-lg font-medium transition-colors">
              <Save size={20} />
              Save Question
            </button>
          </div>
        </form>
      )}

      {/* Placeholder for question list */}
      {!isAdding && (
        <div className="bg-white p-12 text-center rounded-xl border border-slate-200 border-dashed">
          <p className="text-slate-500">No questions added yet. Click "Add New Question" to get started.</p>
        </div>
      )}
    </div>
  )
}
