import type { ReactNode } from 'react';
import Header from './Header';

interface AppShellProps {
  children: ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  return (
    <div className="relative min-h-screen bg-bg-1 overflow-x-hidden">
      {/* Clean Dark Mode Background */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-bg-1" aria-hidden="true" />

      {/* Header */}
      <Header />

      {/* Main Content */}
      <main className="relative z-10 mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}
