import './globals.css';

import Sidebar from '@/components/Sidebar';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Hudjee CMS',
  description: 'Admin panel for Hudjee Practice Daily',
};

import AuthProvider from '@/components/AuthProvider';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="flex h-screen bg-transparent">
        <AuthProvider>
          <Sidebar />
          <main className="flex-1 overflow-auto p-8">
            {children}
          </main>
        </AuthProvider>
      </body>
    </html>
  );
}
