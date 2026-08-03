'use client';

import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, MessageSquare, ChevronDown, CheckSquare } from 'lucide-react';

interface ContentVersion {
  id: string;
  content_type: string;
  change_type: string;
  before_state: any;
  after_state: any;
  status: string;
  created_by_name: string;
  submitted_at: string;
}

export default function ReviewQueuePage() {
  const [pending, setPending] = useState<ContentVersion[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [rejectNotes, setRejectNotes] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPending();
  }, []);

  const fetchPending = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/review');
      const data = await res.json();
      if (Array.isArray(data)) setPending(data);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const handleApprove = async (id: string) => {
    try {
      const res = await fetch(`/api/review/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve' }),
      });
      if (res.ok) {
        setPending(prev => prev.filter(v => v.id !== id));
      } else {
        const error = await res.json();
        alert('Error approving: ' + error.error);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleReject = async (id: string) => {
    if (!rejectNotes[id]) {
      alert('Please provide a reason for rejection.');
      return;
    }
    try {
      const res = await fetch(`/api/review/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject', notes: rejectNotes[id] }),
      });
      if (res.ok) {
        setPending(prev => prev.filter(v => v.id !== id));
      } else {
        const error = await res.json();
        alert('Error rejecting: ' + error.error);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const timeAgo = (date: string) => {
    if (!date) return '';
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  return (
    <div className="p-8 max-w-[1000px] mx-auto min-h-screen">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">Review Queue</h1>
          <p className="text-zinc-400">Review and approve changes made by contributors before they go live.</p>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-zinc-500">Loading queue...</div>
      ) : pending.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-zinc-500 bg-[#0A0A0B] border border-[#1E1E22] rounded-2xl shadow-xl">
          <CheckCircle size={48} className="text-emerald-500/20 mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">All Caught Up!</h2>
          <p>There are no pending changes in the review queue.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {pending.map((version) => {
            const isExpanded = expandedId === version.id;
            
            return (
              <div key={version.id} className="bg-[#121214] border border-[#1E1E22] rounded-xl overflow-hidden shadow-md">
                <button
                  onClick={() => setExpandedId(isExpanded ? null : version.id)}
                  className="w-full flex items-center gap-4 px-6 py-4 text-left hover:bg-[#18181A] transition-colors"
                >
                  <div className="flex-1 min-w-0 flex items-center gap-3">
                    <span className="px-2 py-1 rounded bg-[#2A2A35] text-[#8692F7] text-xs font-bold uppercase tracking-wider">
                      {version.content_type}
                    </span>
                    <span className={`px-2 py-1 rounded text-xs font-bold uppercase tracking-wider ${
                      version.change_type === 'create' ? 'bg-emerald-500/10 text-emerald-400' :
                      version.change_type === 'update' ? 'bg-amber-500/10 text-amber-400' :
                      'bg-rose-500/10 text-rose-400'
                    }`}>
                      {version.change_type}
                    </span>
                    <span className="text-sm font-medium text-white truncate ml-2">
                      {version.after_state?.question_body?.substring(0, 80) || 'Unknown Content'}
                      {version.after_state?.question_body?.length > 80 ? '...' : ''}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-4 text-xs text-zinc-500 shrink-0">
                    <span>by {version.created_by_name}</span>
                    <span>{timeAgo(version.submitted_at)}</span>
                    <ChevronDown size={18} className={`transition-transform duration-200 ${isExpanded ? 'rotate-180 text-white' : ''}`} />
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-[#1E1E22] bg-[#0A0A0B] p-6">
                    <div className="mb-6">
                      <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-3">Diff View</h4>
                      <VersionDiff version={version} />
                    </div>

                    <div className="flex gap-4">
                      <div className="flex-1">
                        <input
                          type="text"
                          value={rejectNotes[version.id] || ''}
                          onChange={e => setRejectNotes(prev => ({ ...prev, [version.id]: e.target.value }))}
                          placeholder="Add review notes (required if rejecting)..."
                          className="w-full px-4 py-2.5 rounded-lg bg-[#121214] border border-[#2A2A35] text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#8692F7] transition-colors"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleApprove(version.id)}
                          className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 font-medium text-sm transition-colors border border-emerald-500/20"
                        >
                          <CheckCircle size={16} /> Approve
                        </button>
                        <button
                          onClick={() => handleReject(version.id)}
                          className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-rose-600/20 text-rose-400 hover:bg-rose-600/30 font-medium text-sm transition-colors border border-rose-500/20"
                        >
                          <XCircle size={16} /> Reject
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function VersionDiff({ version }: { version: ContentVersion }) {
  const before = version.before_state || {};
  const after = version.after_state || {};
  const allKeys = Array.from(new Set([...Object.keys(before), ...Object.keys(after)]));

  if (version.change_type === 'create') {
    return (
      <div className="bg-[#121214] rounded-lg border border-[#1E1E22] overflow-hidden">
        {Object.entries(after).map(([key, value]) => (
          <div key={key} className="flex border-b border-[#1E1E22] last:border-0">
            <div className="w-1/3 p-3 bg-[#1A1A1E] text-xs text-zinc-400 font-medium border-r border-[#1E1E22]">{key}</div>
            <div className="w-2/3 p-3 text-xs text-emerald-400 font-mono break-words whitespace-pre-wrap">
              + {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="bg-[#121214] rounded-lg border border-[#1E1E22] overflow-hidden">
      {allKeys.map(key => {
        const bVal = before[key];
        const aVal = after[key];
        const changed = JSON.stringify(bVal) !== JSON.stringify(aVal);
        
        if (!changed) return null;
        
        return (
          <div key={key} className="flex border-b border-[#1E1E22] last:border-0">
            <div className="w-1/3 p-3 bg-[#1A1A1E] text-xs text-zinc-400 font-medium border-r border-[#1E1E22]">{key}</div>
            <div className="w-2/3 p-3 text-xs font-mono break-words whitespace-pre-wrap">
              {bVal !== undefined && (
                <div className="text-rose-400 mb-1">- {typeof bVal === 'object' ? JSON.stringify(bVal, null, 2) : String(bVal)}</div>
              )}
              {aVal !== undefined && (
                <div className="text-emerald-400">+ {typeof aVal === 'object' ? JSON.stringify(aVal, null, 2) : String(aVal)}</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
