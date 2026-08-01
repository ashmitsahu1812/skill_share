'use client';
/**
 * Sessions Dashboard Page
 * Shows creator's sessions and learner's bookings
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import type { Session } from '@/types';
import toast from 'react-hot-toast';
import { format, formatDistanceToNow } from 'date-fns';
import Link from 'next/link';

const STATUS_COLORS: Record<Session['status'], string> = {
  pending:   'badge-warning',
  confirmed: 'badge-success',
  completed: 'badge-primary',
  cancelled: 'badge-danger',
  no_show:   'badge-danger',
};

export default function SessionsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [fetching, setFetching] = useState(true);
  const [view, setView] = useState<'all' | 'creator' | 'learner'>('all');
  const [statusFilter, setStatusFilter] = useState('');
  const [joiningId, setJoiningId] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    setFetching(true);
    const params = new URLSearchParams();
    if (view !== 'all') params.set('role', view);
    if (statusFilter) params.set('status', statusFilter);
    api.get<Session[]>(`/api/sessions/mine?${params}`)
      .then(setSessions)
      .catch(() => toast.error('Failed to load sessions'))
      .finally(() => setFetching(false));
  }, [user, view, statusFilter]);

  const handleJoin = async (session: Session) => {
    setJoiningId(session._id);
    try {
      const { roomUrl } = await api.get<{ roomUrl: string }>(`/api/sessions/${session._id}/join`);
      window.open(roomUrl, '_blank', 'noopener,noreferrer');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Cannot join session yet');
    } finally {
      setJoiningId(null);
    }
  };

  const handleCancel = async (sessionId: string) => {
    if (!confirm('Are you sure you want to cancel this session?')) return;
    try {
      await api.delete(`/api/sessions/${sessionId}`);
      setSessions(prev => prev.map(s => s._id === sessionId ? { ...s, status: 'cancelled' } : s));
      toast.success('Session cancelled');
    } catch {
      toast.error('Failed to cancel session');
    }
  };

  const handleConfirm = async (sessionId: string) => {
    try {
      await api.put(`/api/sessions/${sessionId}/confirm`);
      setSessions(prev => prev.map(s => s._id === sessionId ? { ...s, status: 'confirmed' } : s));
      toast.success('Session confirmed!');
    } catch {
      toast.error('Failed to confirm');
    }
  };

  if (loading) return null;

  return (
    <AppLayout>
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '24px 16px' }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 20 }}>My Sessions</h1>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
          {(['all', 'creator', 'learner'] as const).map(v => (
            <button key={v} className={`btn btn-sm ${view === v ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setView(v)}>
              {v === 'all' ? 'All' : v === 'creator' ? '👨‍🏫 As Creator' : '📚 As Learner'}
            </button>
          ))}
          <div style={{ flex: 1 }} />
          <select className="input" value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ width: 'auto', padding: '6px 12px', fontSize: 13 }}>
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        {fetching ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 100, borderRadius: 'var(--radius-lg)' }} />)}
          </div>
        ) : sessions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 20px' }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>📅</div>
            <h2 style={{ fontSize: 20, marginBottom: 8 }}>No sessions yet</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>
              {user?.isCreator ? 'Sessions booked with you will appear here.' : 'Book a session with a creator to get started.'}
            </p>
            <Link href="/explore" className="btn btn-primary">Find Creators</Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {sessions.map(session => {
              const isCreator = session.creator._id === user?._id;
              const other = isCreator ? session.learner : session.creator;
              const sessionDate = new Date(session.scheduledAt);
              const isUpcoming = sessionDate > new Date() && session.status !== 'cancelled';
              const canJoin = isUpcoming && session.status === 'confirmed';

              return (
                <div key={session._id} className="glass-card" style={{ padding: 20 }}>
                  <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                    {/* Other party avatar */}
                    {other.avatar
                      ? <img src={other.avatar} alt={other.displayName} className="avatar avatar-md" />
                      : <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--gradient-brand)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, flexShrink: 0 }}>{other.displayName[0]}</div>
                    }

                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 700 }}>
                          {isCreator ? `📚 Learner: ${other.displayName}` : `👨‍🏫 Creator: ${other.displayName}`}
                        </span>
                        <span className={`badge ${STATUS_COLORS[session.status]}`}>{session.status}</span>
                      </div>
                      <div style={{ fontWeight: 600, color: 'var(--accent-secondary)', marginBottom: 4 }}>{session.skillTopic}</div>
                      <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                        📅 {format(sessionDate, 'PPp')} · ⏱ {session.duration} min
                        {isUpcoming && (
                          <span style={{ marginLeft: 8, color: 'var(--accent-warning)' }}>
                            ({formatDistanceToNow(sessionDate, { addSuffix: true })})
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: 8, flexDirection: 'column', alignItems: 'flex-end' }}>
                      {/* Join button */}
                      {canJoin && (
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => handleJoin(session)}
                          disabled={joiningId === session._id}
                        >
                          {joiningId === session._id ? '...' : '🎥 Join'}
                        </button>
                      )}

                      {/* Creator: confirm pending */}
                      {isCreator && session.status === 'pending' && (
                        <button className="btn btn-secondary btn-sm" onClick={() => handleConfirm(session._id)}>
                          ✓ Confirm
                        </button>
                      )}

                      {/* Cancel */}
                      {['pending', 'confirmed'].includes(session.status) && (
                        <button className="btn btn-danger btn-sm" onClick={() => handleCancel(session._id)}>
                          ✕ Cancel
                        </button>
                      )}
                    </div>
                  </div>

                  {session.notes && (
                    <div style={{ marginTop: 12, padding: '8px 12px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', fontSize: 13, color: 'var(--text-secondary)' }}>
                      📝 {session.notes}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
