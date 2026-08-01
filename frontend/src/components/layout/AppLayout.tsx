'use client';
/**
 * Main App Layout
 * Wraps all authenticated pages with sidebar + bottom nav
 */

import Sidebar from './Sidebar';
import BottomNav from './BottomNav';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <main
        className="main-layout"
        style={{
          flex: 1,
          marginLeft: 'var(--sidebar-width)',
          minHeight: '100vh',
          overflow: 'hidden',
        }}
      >
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
