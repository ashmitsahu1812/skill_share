'use client';
/**
 * Notifications Page
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import type { Notification } from '@/types';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';

const NOTIF_ICONS: Record<string, string> = {
  follow: '👤', like: '❤️', comment: '💬',
  session_booked: '📅', session_confirmed: '✅', session_reminder: '⏰',
  session_cancelled: '❌', session_completed: '🎉', certificate: '🎓',
  new_post: '📸', test_available: '🧪',
};

export default function NotificationsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    api.get<{ notifications: Notification[]; unreadCount: number }>('/api/notifications')
      .then(res => { setNotifications(res.notifications); setUnreadCount(res.unreadCount); })
      .catch(() => toast.error('Failed to load notifications'))
      .finally(() => setFetching(false));
  }, [user]);

  const markAllRead = async () => {
    await api.put('/api/notifications/read');
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    setUnreadCount(0);
    toast.success('All notifications marked as read');
  };

  if (loading) return null;

  return (
    <AppLayout>
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '24px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h1 style={{ fontSize: 22, fontWeight: 800 }}>Notifications</h1>
          {unreadCount > 0 && (
            <button className="btn btn-ghost btn-sm" onClick={markAllRead}>
              Mark all read ({unreadCount})
            </button>
          )}
        </div>

        {fetching ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[1,2,3,4,5].map(i => (
              <div key={i} style={{ display: 'flex', gap: 12, padding: 16, background: 'var(--bg-card)', borderRadius: 'var(--radius-md)' }}>
                <div className="skeleton" style={{ width: 44, height: 44, borderRadius: '50%', flexShrink: 0 }} />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div className="skeleton" style={{ height: 14, width: '70%' }} />
                  <div className="skeleton" style={{ height: 12, width: '40%' }} />
                </div>
              </div>
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 20px' }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>🔔</div>
            <p style={{ color: 'var(--text-secondary)' }}>No notifications yet</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {notifications.map(n => (
              <div
                key={n._id}
                style={{
                  display: 'flex',
                  gap: 14,
                  padding: '14px 16px',
                  background: n.isRead ? 'var(--bg-card)' : 'rgba(108,99,255,0.08)',
                  borderRadius: 'var(--radius-md)',
                  border: `1px solid ${n.isRead ? 'var(--border-subtle)' : 'rgba(108,99,255,0.25)'}`,
                  transition: 'all var(--transition-fast)',
                }}
                onClick={async () => {
                  if (!n.isRead) {
                    await api.put(`/api/notifications/${n._id}/read`);
                    setNotifications(prev => prev.map(x => x._id === n._id ? { ...x, isRead: true } : x));
                    setUnreadCount(prev => Math.max(0, prev - 1));
                  }
                }}
              >
                {/* Icon */}
                <div style={{
                  width: 40, height: 40, borderRadius: '50%',
                  background: 'var(--bg-secondary)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 18, flexShrink: 0,
                }}>
                  {NOTIF_ICONS[n.type] || '📬'}
                </div>

                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 14, fontWeight: n.isRead ? 400 : 600, marginBottom: 2 }}>{n.title}</p>
                  {n.message && <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 4 }}>{n.message}</p>}
                  <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>{formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}</p>
                </div>

                {!n.isRead && (
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent-primary)', flexShrink: 0, marginTop: 6 }} />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
