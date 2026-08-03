'use client';
import { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle, ExternalLink, Loader2 } from 'lucide-react';
import Link from 'next/link';
import katex from 'katex';
import 'katex/dist/katex.min.css';

export default function ReportsPage() {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'pending' | 'resolved'>('pending');

  const fetchReports = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/reports?status=${statusFilter}`);
      const data = await res.json();
      setReports(data || []);
    } catch (e) {
      console.error('Failed to fetch reports', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [statusFilter]);

  const handleResolve = async (id: string) => {
    try {
      await fetch(`/api/reports/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'resolved' })
      });
      fetchReports();
    } catch (e) {
      console.error('Failed to resolve report', e);
    }
  };

  const renderContent = (contentObj: any) => {
    if (!contentObj) return null;
    let html = contentObj.html || '';
    
    // Process math if available
    if (contentObj.math) {
      const sortedMath = [...contentObj.math].sort((a, b) => b.id.localeCompare(a.id));
      sortedMath.forEach((m: any) => {
        try {
          const rendered = katex.renderToString(m.latex, {
            displayMode: m.display,
            throwOnError: false,
          });
          html = html.replace(`{{MATH_${m.id}}}`, rendered);
        } catch (e) {
          console.warn('Math render error', e);
        }
      });
    }

    return (
      <div 
        className="prose prose-invert prose-sm max-w-none text-zinc-400 line-clamp-2"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1 flex items-center gap-2">
            <AlertTriangle className="text-amber-500" />
            Question Reports
          </h1>
          <p className="text-zinc-400">Review and resolve issues flagged by students.</p>
        </div>
        
        <div className="flex bg-[#111] p-1 rounded-lg border border-[#222]">
          <button
            onClick={() => setStatusFilter('pending')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${statusFilter === 'pending' ? 'bg-[#222] text-white' : 'text-zinc-400 hover:text-white'}`}
          >
            Pending
          </button>
          <button
            onClick={() => setStatusFilter('resolved')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${statusFilter === 'resolved' ? 'bg-[#222] text-white' : 'text-zinc-400 hover:text-white'}`}
          >
            Resolved
          </button>
        </div>
      </div>

      <div className="bg-[#111] border border-[#222] rounded-xl overflow-hidden flex flex-col min-h-[400px]">
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-zinc-600 animate-spin" />
          </div>
        ) : reports.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
            <CheckCircle className="w-16 h-16 text-emerald-500/50 mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">All Clear!</h3>
            <p className="text-zinc-400">No {statusFilter} reports found.</p>
          </div>
        ) : (
          <div className="divide-y divide-[#222]">
            {reports.map((report) => (
              <div key={report.id} className="p-6 flex flex-col md:flex-row gap-6 hover:bg-[#161616] transition-colors">
                
                {/* Meta Info */}
                <div className="flex-1 space-y-4">
                  <div>
                    <span className="px-2 py-1 bg-amber-500/10 text-amber-500 font-bold text-[10px] rounded uppercase tracking-wider">
                      {report.reason}
                    </span>
                    <span className="text-zinc-500 text-xs ml-3">
                      {new Date(report.created_at).toLocaleString()}
                    </span>
                  </div>
                  
                  {report.questions?.published === false && (
                    <div className="flex items-center gap-2 text-rose-500 bg-rose-500/10 px-3 py-1.5 rounded-lg w-fit">
                      <AlertTriangle size={14} />
                      <span className="text-xs font-bold uppercase tracking-wider">Auto-Suspended</span>
                    </div>
                  )}
                  
                  {report.details && (
                    <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-lg">
                      <p className="text-sm text-zinc-300 font-medium italic">"{report.details}"</p>
                    </div>
                  )}

                  <div className="pt-2 border-t border-[#222]">
                    <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Flagged Question:</p>
                    {renderContent(report.questions?.content)}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col items-end justify-start gap-3 w-48 shrink-0">
                  <Link
                    href={`/questions?edit=${report.question_id}`}
                    className="w-full flex items-center justify-center gap-2 bg-[#222] hover:bg-[#333] text-white px-4 py-2.5 rounded-lg font-semibold text-sm transition-colors border border-[#444]"
                  >
                    <ExternalLink size={16} />
                    Edit Question
                  </Link>
                  
                  {statusFilter === 'pending' && (
                    <button
                      onClick={() => handleResolve(report.id)}
                      className="w-full flex items-center justify-center gap-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 px-4 py-2.5 rounded-lg font-semibold text-sm transition-colors border border-emerald-500/20"
                    >
                      <CheckCircle size={16} />
                      Mark Resolved
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
