'use client';
import { useState, useRef, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard, BookOpen, PenTool, Share2, CheckSquare, Users,
  ChevronLeft, ChevronRight, X, LogOut, GraduationCap, AlertTriangle
} from 'lucide-react';
import Image from 'next/image';
import { useAuth } from './AuthProvider';

const NAV_ITEMS = [
  { label: 'Overview', href: '/', icon: LayoutDashboard, group: 'main' },
  { label: 'Chapters', href: '/chapters', icon: BookOpen, group: 'content' },
  { label: 'Questions', href: '/questions', icon: PenTool, group: 'content' },
  { label: 'Concepts', href: '/topics', icon: Share2, group: 'content' },
  { label: 'Review Queue', href: '/review', icon: CheckSquare, group: 'review', badge: true },
  { label: 'Reports', href: '/reports', icon: AlertTriangle, group: 'review' },
  { label: 'User Monitoring', href: '/users', icon: GraduationCap, group: 'management' },
  { label: 'Team Management', href: '/team', icon: Users, group: 'management' },
];

const GROUP_LABELS: Record<string, string> = {
  main: '',
  content: 'CONTENT',
  review: 'REVIEW',
  management: 'MANAGEMENT',
  system: 'SYSTEM',
};

export default function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const pathname = usePathname();
  const { profile, signOut } = useAuth();

  useEffect(() => {
    async function fetchPendingCount() {
      try {
        const res = await fetch('/api/questions?published=false');
        const data = await res.json();
        if (Array.isArray(data)) {
          setPendingCount(data.length);
        }
      } catch (e) {
        console.error("Failed to fetch pending count:", e);
      }
    }
    fetchPendingCount();
    const interval = setInterval(fetchPendingCount, 15000);
    return () => clearInterval(interval);
  }, []);

  const isActive = (href: string) => {
    if (href === '#') return false;
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  const visibleNavItems = NAV_ITEMS.filter(item => {
    if (item.href === '/team') {
      return profile?.role === 'superadmin';
    }
    return true;
  });

  const groups = ['main', 'content', 'review', 'management', 'system'];

  return (
    <aside className={`${isCollapsed ? 'md:w-20' : 'md:w-64'} w-full shrink-0 border-t md:border-t-0 md:border-r border-[#222] bg-[#111] flex flex-row md:flex-col h-16 md:h-full select-none transition-all duration-300 z-50`}>
      <div className="p-4 items-center justify-between mb-2 hidden md:flex">
        {!isCollapsed && (
          <div className="flex flex-col ml-2">
            <Image src="/logo.png" alt="HUDJEE CMS" width={150} height={40} className="object-contain" priority />
          </div>
        )}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-2 text-zinc-400 hover:text-white hover:bg-[#222]/50 rounded-lg transition-colors mx-auto"
        >
          {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto md:overflow-y-auto overflow-x-auto md:overflow-x-hidden px-2 md:px-3 flex flex-row md:flex-col space-x-2 md:space-x-0 space-y-0 md:space-y-1 items-center md:items-stretch py-2 md:py-0">
        {groups.map(group => {
          const items = visibleNavItems.filter(i => i.group === group);
          if (items.length === 0) return null;
          return (
            <div key={group} className="flex flex-row md:flex-col items-center md:items-stretch gap-2 md:gap-0">
              {GROUP_LABELS[group] && !isCollapsed && (
                <div className="px-3 pt-4 pb-2 text-[10px] font-bold text-zinc-600 uppercase tracking-widest hidden md:block">
                  {GROUP_LABELS[group]}
                </div>
              )}
              {items.map(item => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    className={`shrink-0 md:w-full flex flex-col md:flex-row items-center ${isCollapsed ? 'md:justify-center' : 'md:gap-3'} px-3 py-1.5 md:py-2 rounded-lg transition-all duration-150 ${active
                      ? 'md:bg-[#222] text-white md:border md:border-[#333]'
                      : 'text-zinc-400 hover:text-white hover:bg-[#222]/50 border border-transparent'
                      }`}
                  >
                    <Icon size={18} className={`shrink-0 mb-1 md:mb-0 ${active ? 'text-white' : 'text-zinc-500'}`} />
                    {!isCollapsed && (
                      <span className="font-medium text-[10px] md:text-sm truncate flex-1 text-center md:text-left">{item.label}</span>
                    )}
                    {item.badge && pendingCount > 0 && (
                      <span className="px-1.5 py-0.5 rounded-full bg-amber-500 text-black text-[10px] font-bold min-w-[18px] text-center hidden md:block">
                        {pendingCount}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          );
        })}
      </div>

      <div className="mt-auto border-t border-[#262626] p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#8692f7] to-purple-500 flex items-center justify-center text-white font-bold text-sm">
            {profile?.username?.charAt(0).toUpperCase() || 'U'}
          </div>
          {!isCollapsed && (
            <div>
              <p className="text-sm font-semibold text-white leading-tight">{profile?.username || 'User'}</p>
              <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">{profile?.role || 'Staff'}</p>
            </div>
          )}
        </div>
        <button 
          onClick={signOut}
          className="p-2 text-zinc-500 hover:text-white hover:bg-[#222] rounded-lg transition-colors"
          title="Sign Out"
        >
          <LogOut size={18} />
        </button>
      </div>
    </aside>
  );
}
