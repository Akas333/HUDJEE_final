'use client';

import { useState, useEffect } from 'react';
import { Users, GraduationCap, Flame, Shield, Award } from 'lucide-react';

interface Student {
  id: string;
  username: string;
  cohort: string;
  target_year: number;
  level: number;
  total_xp: number;
  current_streak: number;
  longest_streak: number;
  created_at: string;
}

export default function UserMonitoringPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/users');
      const data = await res.json();
      if (Array.isArray(data)) {
        setStudents(data);
      }
    } catch (e) {
      console.error('Failed to fetch students', e);
    }
    setLoading(false);
  };

  const getCohortColor = (cohort: string) => {
    switch (cohort) {
      case 'class_11': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'class_12': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'dropper': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      default: return 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20';
    }
  };

  const getCohortLabel = (cohort: string) => {
    switch (cohort) {
      case 'class_11': return 'Class 11';
      case 'class_12': return 'Class 12';
      case 'dropper': return 'Dropper';
      default: return cohort || 'Unknown';
    }
  };

  return (
    <div className="p-8 max-w-[1400px] mx-auto min-h-screen">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black text-white mb-2 tracking-tight">Student Monitoring</h1>
          <p className="text-zinc-400">Track engagement, streaks, and XP across all your users.</p>
        </div>
        <div className="flex items-center gap-4 bg-[#161618] border border-[#262626] rounded-xl p-3 shadow-lg">
          <div className="flex flex-col items-center px-4 border-r border-[#333]">
            <span className="text-2xl font-black text-[#8692f7]">{students.length}</span>
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mt-1">Total Users</span>
          </div>
          <div className="flex flex-col items-center px-4 border-r border-[#333]">
            <span className="text-2xl font-black text-amber-400">
              {students.reduce((max, s) => s.current_streak > max ? s.current_streak : max, 0)}
            </span>
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mt-1">Highest Streak</span>
          </div>
          <div className="flex flex-col items-center px-4">
            <span className="text-2xl font-black text-emerald-400">
              {students.reduce((max, s) => s.level > max ? s.level : max, 0)}
            </span>
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mt-1">Max Level</span>
          </div>
        </div>
      </div>

      <div className="bg-[#161618] border border-[#262626] rounded-2xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#262626] bg-[#1a1a1c]">
                <th className="p-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Student</th>
                <th className="p-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Cohort</th>
                <th className="p-4 text-xs font-bold text-zinc-500 uppercase tracking-wider text-center">Level & XP</th>
                <th className="p-4 text-xs font-bold text-zinc-500 uppercase tracking-wider text-center">Current Streak</th>
                <th className="p-4 text-xs font-bold text-zinc-500 uppercase tracking-wider text-center">Max Streak</th>
                <th className="p-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Joined</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-zinc-500">Loading student data...</td>
                </tr>
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-zinc-500">
                    <GraduationCap size={32} className="mx-auto mb-3 opacity-20" />
                    No students found in the database.
                  </td>
                </tr>
              ) : (
                students.map((student) => (
                  <tr key={student.id} className="border-b border-[#262626] hover:bg-[#1a1a1c] transition-colors group">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#222] border border-[#333] flex items-center justify-center text-white font-bold text-sm shadow-sm group-hover:border-[#8692f7]/30 transition-colors">
                          {student.username.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="text-white font-medium">{student.username}</div>
                          <div className="text-xs text-zinc-500">{student.id.split('-')[0]}...</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col items-start gap-1">
                        <span className={`inline-flex px-2 py-1 border rounded-md text-[10px] font-bold uppercase tracking-widest ${getCohortColor(student.cohort)}`}>
                          {getCohortLabel(student.cohort)}
                        </span>
                        {student.target_year && (
                          <span className="text-xs text-zinc-500 font-mono">JEE {student.target_year}</span>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col items-center justify-center gap-1">
                        <span className="inline-flex items-center justify-center min-w-[32px] h-8 rounded-lg bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20">
                          Lv.{student.level || 1}
                        </span>
                        <span className="text-[10px] text-zinc-500 font-mono tracking-wider">{student.total_xp || 0} XP</span>
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      <div className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                        <Flame size={14} className={student.current_streak > 0 ? "text-amber-500" : "text-zinc-600"} />
                        <span className={`font-bold font-mono ${student.current_streak > 0 ? "text-amber-400" : "text-zinc-500"}`}>
                          {student.current_streak || 0}
                        </span>
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      <div className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-[#222] border border-[#333] rounded-lg">
                        <Shield size={14} className="text-zinc-400" />
                        <span className="font-bold font-mono text-zinc-300">
                          {student.longest_streak || 0}
                        </span>
                      </div>
                    </td>
                    <td className="p-4 text-zinc-400 text-sm">
                      {new Date(student.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
