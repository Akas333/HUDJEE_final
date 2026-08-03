'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';
import { Toast } from '@/components/Toast';

interface Profile {
  id: string;
  username: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // Login form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, username, role')
      .eq('id', userId)
      .single();
    
    if (!error && data) {
      setProfile(data as Profile);
    }
    setLoading(false);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setToast(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setToast({ message: error.message, type: 'error' });
      setIsLoggingIn(false);
    }
    // If successful, onAuthStateChange will trigger and set user
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#0a0a0b]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // If no user, show login screen instead of children
  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0a0a0b] p-4">
        <div className="w-full max-w-md bg-[#161618] border border-[#262626] rounded-2xl p-8 shadow-2xl animate-in fade-in zoom-in-95 duration-300">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-[#8692f7]/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-[#8692f7]/20">
              <span className="text-3xl font-black text-[#8692f7]">H</span>
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">Hudjee CMS</h1>
            <p className="text-zinc-500 mt-2 text-sm">Sign in with your staff account to continue</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">Email</label>
              <input
                required
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full p-3.5 bg-[#0a0a0b] border border-[#333] text-white rounded-xl focus:outline-none focus:border-[#8692f7] transition-colors"
                placeholder="you@hudjee.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">Password</label>
              <input
                required
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full p-3.5 bg-[#0a0a0b] border border-[#333] text-white rounded-xl focus:outline-none focus:border-[#8692f7] transition-colors"
                placeholder="••••••••"
              />
            </div>
            
            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full py-3.5 bg-[#8692f7] hover:bg-[#6a78f2] disabled:opacity-50 text-white rounded-xl font-bold transition-all shadow-[0_0_20px_rgba(134,146,247,0.15)] mt-4"
            >
              {isLoggingIn ? 'Authenticating...' : 'Sign In'}
            </button>
          </form>
        </div>
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      </div>
    );
  }

  // If user doesn't have an allowed role, block them
  if (profile && !['employee', 'admin', 'superadmin'].includes(profile.role)) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0a0a0b] p-4 text-center">
        <div className="bg-[#161618] border border-red-500/20 p-8 rounded-2xl max-w-md">
          <h2 className="text-xl font-bold text-red-400 mb-2">Access Denied</h2>
          <p className="text-zinc-400 mb-6">Your account ({profile.role}) does not have permission to access the CMS.</p>
          <button onClick={signOut} className="px-6 py-2 bg-[#222] hover:bg-[#333] text-white rounded-xl font-bold">Sign Out</button>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
