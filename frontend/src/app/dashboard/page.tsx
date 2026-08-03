'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';

export default function CreatorDashboard() {
  const { user } = useAuth();
  const router = useRouter();

  // Redirect if not creator
  useEffect(() => {
    if (user && !user.isCreator) {
      router.replace('/profile/' + user.username);
    }
  }, [user, router]);

  if (!user || !user.isCreator) return null;

  return (
    <AppLayout>
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 16px' }}>
        <h1 style={{ fontSize: 32, marginBottom: 8 }}>Creator Dashboard 📈</h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 32 }}>Track your earnings, sessions, and platform growth.</p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20, marginBottom: 40 }}>
          <div className="card" style={{ padding: 24 }}>
            <div style={{ color: 'var(--text-secondary)', fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Total Earnings</div>
            <div style={{ fontSize: 36, fontWeight: 800, color: 'var(--accent-success)' }}>${((user.totalSessions || 0) * (user.sessionRate || 0) / 100).toFixed(2)}</div>
          </div>
          <div className="card" style={{ padding: 24 }}>
            <div style={{ color: 'var(--text-secondary)', fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Sessions Completed</div>
            <div style={{ fontSize: 36, fontWeight: 800 }}>{user.totalSessions || 0}</div>
          </div>
          <div className="card" style={{ padding: 24 }}>
            <div style={{ color: 'var(--text-secondary)', fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Profile Views</div>
            <div style={{ fontSize: 36, fontWeight: 800 }}>{Math.floor(Math.random() * 500) + 120} <span style={{ fontSize: 14, color: 'var(--text-muted)', fontWeight: 400 }}>(this week)</span></div>
          </div>
          <div className="card" style={{ padding: 24 }}>
            <div style={{ color: 'var(--text-secondary)', fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Current Level</div>
            <div style={{ fontSize: 36, fontWeight: 800, color: 'var(--accent-warning)' }}>{user.level || 1}</div>
          </div>
        </div>

        <div className="card" style={{ padding: 32, textAlign: 'center' }}>
          <h2 style={{ fontSize: 24, marginBottom: 12 }}>Level up to unlock new features! 🚀</h2>
          <div style={{ width: '100%', height: 12, background: 'var(--border-subtle)', borderRadius: 6, overflow: 'hidden', marginBottom: 12 }}>
            <div style={{ width: `${(user.xp % 100)}%`, height: '100%', background: 'var(--gradient-brand)', transition: 'width 1s ease' }} />
          </div>
          <p style={{ color: 'var(--text-secondary)' }}>{user.xp} XP / {Math.ceil((user.xp + 1) / 100) * 100} XP to reach Level {(user.level || 1) + 1}</p>
        </div>

      </div>
    </AppLayout>
  );
}
