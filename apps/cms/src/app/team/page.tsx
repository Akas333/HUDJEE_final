'use client';

import { useState, useEffect } from 'react';
import { Users, UserPlus, X, Trash2 } from 'lucide-react';
import { Toast } from '@/components/Toast';
import { useAuth } from '@/components/AuthProvider';

interface TeamMember {
  id: string;
  username: string;
  role: string;
  joined_at: string;
  total_questions_added: number;
}

export default function TeamManagementPage() {
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

  // Form State
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('employee');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { profile } = useAuth();

  useEffect(() => {
    if (profile && profile.role === 'superadmin') {
      fetchTeam();
    }
  }, [profile]);

  if (profile && profile.role !== 'superadmin') {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-2">Access Restricted</h2>
          <p className="text-zinc-400">Only Super Admins can manage the team.</p>
        </div>
      </div>
    );
  }

  const fetchTeam = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/team');
      const data = await res.json();
      if (Array.isArray(data)) {
        setTeam(data);
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, username, password, role }),
      });
      const data = await res.json();
      
      if (res.ok) {
        setToast({ message: 'Team member added successfully', type: 'success' });
        setIsModalOpen(false);
        // Reset form
        setEmail('');
        setUsername('');
        setPassword('');
        setRole('employee');
        // Refresh list
        fetchTeam();
      } else {
        setToast({ message: data.error || 'Failed to add member', type: 'error' });
      }
    } catch (e) {
      setToast({ message: 'An unexpected error occurred', type: 'error' });
    }
    setIsSubmitting(false);
  };

  const handleRemoveUser = async (id: string, username: string) => {
    if (!confirm(`Are you sure you want to remove ${username}? This action cannot be undone.`)) return;
    
    try {
      const res = await fetch(`/api/team/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setToast({ message: 'User removed successfully', type: 'success' });
        fetchTeam();
      } else {
        const data = await res.json();
        setToast({ message: data.error || 'Failed to remove user', type: 'error' });
      }
    } catch (e) {
      setToast({ message: 'An unexpected error occurred', type: 'error' });
    }
  };

  return (
    <div className="p-8 max-w-[1200px] mx-auto min-h-screen">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black text-white mb-2 tracking-tight">Team Management</h1>
          <p className="text-zinc-400">Monitor employee performance and manage access roles.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-[#8692f7] hover:bg-[#6a78f2] text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-[0_0_20px_rgba(134,146,247,0.2)]"
        >
          <UserPlus size={18} />
          Add Employee
        </button>
      </div>

      <div className="bg-[#161618] border border-[#262626] rounded-2xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#262626] bg-[#1a1a1c]">
                <th className="p-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Member Name</th>
                <th className="p-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Role</th>
                <th className="p-4 text-xs font-bold text-zinc-500 uppercase tracking-wider text-center">Questions Added</th>
                <th className="p-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Joined At</th>
                <th className="p-4 text-xs font-bold text-zinc-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-zinc-500">Loading team data...</td>
                </tr>
              ) : team.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-zinc-500">
                    <Users size={32} className="mx-auto mb-3 opacity-20" />
                    No team members found. Start by adding one!
                  </td>
                </tr>
              ) : (
                team.map((member) => (
                  <tr key={member.id} className="border-b border-[#262626] hover:bg-[#1a1a1c] transition-colors group">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#8692f7] to-purple-500 flex items-center justify-center text-white font-bold text-sm">
                          {member.username.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-white font-medium">{member.username}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`inline-block px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest ${
                        member.role === 'superadmin' ? 'bg-rose-500/10 text-rose-400' :
                        member.role === 'admin' ? 'bg-amber-500/10 text-amber-400' :
                        'bg-[#8692f7]/10 text-[#8692f7]'
                      }`}>
                        {member.role}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-[#222] border border-[#333] text-white font-mono font-bold">
                        {member.total_questions_added || 0}
                      </span>
                    </td>
                    <td className="p-4 text-zinc-400 text-sm">
                      {new Date(member.joined_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                    </td>
                    <td className="p-4 text-right">
                      <button 
                        onClick={() => handleRemoveUser(member.id, member.username)}
                        disabled={member.id === profile?.id}
                        className="p-2 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-zinc-500"
                        title={member.id === profile?.id ? "You cannot remove yourself" : "Remove user"}
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#161618] border border-[#262626] rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-6 border-b border-[#262626]">
              <h2 className="text-xl font-bold text-white">Add Team Member</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-zinc-500 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleCreateUser} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">Username</label>
                <input
                  required
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  className="w-full p-3 bg-[#0a0a0b] border border-[#333] text-white rounded-xl focus:outline-none focus:border-[#8692f7] transition-colors"
                  placeholder="e.g. johndoe"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">Email</label>
                <input
                  required
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full p-3 bg-[#0a0a0b] border border-[#333] text-white rounded-xl focus:outline-none focus:border-[#8692f7] transition-colors"
                  placeholder="john@hudjee.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">Temporary Password</label>
                <input
                  required
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full p-3 bg-[#0a0a0b] border border-[#333] text-white rounded-xl focus:outline-none focus:border-[#8692f7] transition-colors"
                  placeholder="Min 6 characters"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">Role</label>
                <select
                  value={role}
                  onChange={e => setRole(e.target.value)}
                  className="w-full p-3 bg-[#0a0a0b] border border-[#333] text-white rounded-xl focus:outline-none focus:border-[#8692f7] transition-colors"
                >
                  <option value="employee">Employee</option>
                  <option value="admin">Admin</option>
                  <option value="superadmin">Super Admin</option>
                </select>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-3 bg-[#222] hover:bg-[#333] text-white rounded-xl font-bold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-3 bg-[#8692f7] hover:bg-[#6a78f2] disabled:opacity-50 text-white rounded-xl font-bold transition-colors"
                >
                  {isSubmitting ? 'Creating...' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
