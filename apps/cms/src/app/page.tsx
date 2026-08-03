'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileQuestion, BookOpen, ListTree, CheckCircle, Activity, PenTool, LayoutDashboard } from 'lucide-react';

export default function Dashboard() {
  const router = useRouter();
  const [stats, setStats] = useState({ questions: 0, chapters: 0, topics: 0, published: 0 });

  useEffect(() => {
    fetch('/api/stats')
      .then(res => res.json())
      .then(data => setStats(data));
  }, []);

  const statCards = [
    { label: 'Total Questions', value: stats.questions, icon: FileQuestion, color: 'text-purple-400', bg: 'bg-purple-400/10', trend: 'In database' },
    { label: 'Total Chapters', value: stats.chapters, icon: BookOpen, color: 'text-cyan-400', bg: 'bg-cyan-400/10', trend: 'Structured content' },
    { label: 'Total Concepts', value: stats.topics, icon: ListTree, color: 'text-emerald-400', bg: 'bg-emerald-400/10', trend: 'Granular topics' },
    { label: 'Published', value: stats.published, icon: CheckCircle, color: 'text-amber-400', bg: 'bg-amber-400/10', trend: 'Live to students' },
  ];

  const quickLinks = [
    { label: 'Add Question', icon: PenTool, href: '/questions/new', color: 'from-purple-600 to-purple-400' },
    { label: 'Manage Chapters', icon: BookOpen, href: '/chapters', color: 'from-cyan-600 to-cyan-400' },
    { label: 'Manage Concepts', icon: ListTree, href: '/topics', color: 'from-emerald-600 to-emerald-400' },
    { label: 'All Questions', icon: FileQuestion, href: '/questions', color: 'from-amber-600 to-amber-400' },
  ];

  return (
    <div className="max-w-[1200px] mx-auto space-y-8 pb-10">
      {/* Hero */}
      <div className="relative bg-[#161618] border border-[#262626] rounded-[24px] p-8 overflow-hidden">
        <div className="relative z-10">
          <span className="px-3 py-1.5 rounded-full bg-[#1e2030] text-[#8692f7] text-[10px] font-bold uppercase tracking-widest">
            HUDJEE CMS
          </span>
          <h2 className="text-3xl font-black text-white mt-4 mb-2">Content Management</h2>
          <p className="text-zinc-400 text-sm max-w-lg">
            Manage your practice questions, chapters, and granular concepts from one unified dashboard.
          </p>
        </div>
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-[#8692f7]/5 to-transparent" />
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(stat => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="bg-[#161618] border border-[#262626] rounded-[20px] p-5 hover:border-[#333] transition-colors">
              <div className="flex items-start justify-between mb-3">
                <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center`}>
                  <Icon size={20} className={stat.color} />
                </div>
                <Activity size={14} className="text-zinc-600" />
              </div>
              <div className="text-3xl font-bold text-white mb-1">{stat.value}</div>
              <div className="text-xs font-medium text-zinc-500">{stat.label}</div>
              <div className="text-[10px] text-zinc-600 mt-1">{stat.trend}</div>
            </div>
          );
        })}
      </div>

      {/* Quick Links */}
      <div>
        <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {quickLinks.map(link => {
            const Icon = link.icon;
            return (
              <button
                key={link.label}
                onClick={() => router.push(link.href)}
                className="group bg-[#141416] border border-[#222] rounded-xl p-5 text-center hover:border-[#333] transition-all"
              >
                <div className={`w-12 h-12 mx-auto rounded-xl bg-gradient-to-br ${link.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <Icon size={20} className="text-white" />
                </div>
                <div className="text-sm font-medium text-zinc-300 group-hover:text-white transition-colors">{link.label}</div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
