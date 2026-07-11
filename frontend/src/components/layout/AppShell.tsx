import type { ReactNode } from 'react';
import Header from './Header';

interface AppShellProps {
  children: ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  return (
    <div className="relative min-h-screen bg-bg-1 overflow-x-hidden">
      {/* Background Decorative Gradient Blobs */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
        {/* Top-left purple blob */}
        <div
          className="absolute -left-40 -top-40 h-[600px] w-[600px] rounded-full opacity-15"
          style={{
            background:
              'radial-gradient(circle, rgba(130, 81, 238, 0.4) 0%, rgba(130, 81, 238, 0) 70%)',
          }}
        />
        {/* Bottom-right blue blob */}
        <div
          className="absolute -bottom-40 -right-40 h-[500px] w-[500px] rounded-full opacity-10"
          style={{
            background:
              'radial-gradient(circle, rgba(59, 130, 246, 0.4) 0%, rgba(59, 130, 246, 0) 70%)',
          }}
        />
        {/* Center-right accent blob */}
        <div
          className="absolute right-1/4 top-1/3 h-[300px] w-[300px] rounded-full opacity-8"
          style={{
            background:
              'radial-gradient(circle, rgba(130, 81, 238, 0.2) 0%, transparent 70%)',
          }}
        />
      </div>

      {/* Header */}
      <Header />

      {/* Main Content */}
      <main className="relative z-10 mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}
