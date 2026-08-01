'use client';
/**
 * Main App Layout
 * Wraps all authenticated pages with sidebar + bottom nav
 */

import Sidebar from './Sidebar';
import BottomNav from './BottomNav';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      if (!user.skillsToLearn || user.skillsToLearn.length === 0) {
        router.replace('/onboarding');
      }
    }
  }, [user, loading, router]);

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
