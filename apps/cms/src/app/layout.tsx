import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "HUDJEE CMS | PYQ Database Manager",
  description: "Internal tool for managing JEE practice questions.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-slate-50`}>
        <nav className="border-b bg-white">
          <div className="flex h-16 items-center px-4 max-w-7xl mx-auto">
            <h1 className="text-xl font-bold text-slate-800">HUDJEE CMS</h1>
          </div>
        </nav>
        <main className="max-w-7xl mx-auto p-4 md:p-8">
          {children}
        </main>
      </body>
    </html>
  );
}
