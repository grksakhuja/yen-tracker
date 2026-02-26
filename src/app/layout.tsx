import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Link from 'next/link';
import AlertsBanner from '@/components/alerts/AlertsBanner';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Yen Tracker',
  description: 'GBP/JPY currency conversion strategy tracker',
};

const navLinks = [
  { href: '/', label: 'Dashboard' },
  { href: '/conversions', label: 'Conversions' },
  { href: '/projections', label: 'Projections' },
  { href: '/settings', label: 'Settings' },
];

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.className}>
      <body className="bg-gray-950 text-gray-100 min-h-screen antialiased">
        <nav className="border-b border-gray-800 bg-gray-950/80 backdrop-blur-sm sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <Link href="/" className="flex items-center gap-2">
                <span className="text-2xl font-bold text-emerald-400">
                  &#xa5;
                </span>
                <span className="text-lg font-semibold tracking-tight">
                  Yen Tracker
                </span>
              </Link>
              <div className="flex items-center gap-1">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="px-3 py-2 rounded-lg text-sm font-medium text-gray-400 hover:text-gray-100 hover:bg-gray-800/60 transition-colors"
                  >
                    {link.label}
                  </Link>
                ))}
                <AlertsBanner />
              </div>
            </div>
          </div>
        </nav>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>
      </body>
    </html>
  );
}
