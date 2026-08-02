import './globals.css';
import Link from 'next/link';
import { LayoutDashboard, FileQuestion, BookOpen, ListTree } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Hudjee CMS',
  description: 'Admin panel for Hudjee Practice Daily',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="flex h-screen bg-gray-50">
        <aside className="w-64 bg-sidebar text-white flex flex-col">
          <div className="p-6">
            <h1 className="text-2xl font-bold text-white">Hudjee CMS</h1>
          </div>
          <nav className="flex-1 px-4 space-y-2">
            <Link href="/" className="flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-sidebar-hover hover:text-white rounded-lg transition-colors">
              <LayoutDashboard size={20} />
              <span>Dashboard</span>
            </Link>
            <Link href="/questions" className="flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-sidebar-hover hover:text-white rounded-lg transition-colors">
              <FileQuestion size={20} />
              <span>Questions</span>
            </Link>
            <Link href="/chapters" className="flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-sidebar-hover hover:text-white rounded-lg transition-colors">
              <BookOpen size={20} />
              <span>Chapters</span>
            </Link>
            <Link href="/topics" className="flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-sidebar-hover hover:text-white rounded-lg transition-colors">
              <ListTree size={20} />
              <span>Topics</span>
            </Link>
          </nav>
        </aside>
        <main className="flex-1 overflow-auto bg-gray-50 p-8">
          {children}
        </main>
      </body>
    </html>
  );
}
