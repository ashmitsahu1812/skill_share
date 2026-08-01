'use client';

import { useState, useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import toast from 'react-hot-toast';
import type { User } from '@/types';
import { useRouter } from 'next/navigation';

export default function SettingsPage() {
  const { user, refreshUser } = useAuth();
  const router = useRouter();
  
  const [sessionRate, setSessionRate] = useState('0');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setSessionRate((user.sessionRate / 100).toString());
    }
  }, [user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put('/api/users/me', {
        sessionRate: parseFloat(sessionRate) * 100
      });
      await refreshUser();
      toast.success('Settings saved!');
      router.push(`/profile/${user?.username}`);
    } catch (error) {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (!user) return <AppLayout><div style={{ padding: 40, textAlign: 'center' }}>Loading...</div></AppLayout>;

  return (
    <AppLayout>
      <div style={{ maxWidth: 600, margin: '0 auto', padding: '32px 16px' }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 24 }}>Profile Settings</h1>
        
        <form onSubmit={handleSave} className="glass-card" style={{ padding: 24 }}>
          {user.isCreator && (
            <div style={{ marginBottom: 20 }}>
              <label className="input-label">Hourly Rate ($)</label>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>
                How much do you charge for a 1-on-1 session? Set to 0 to offer free sessions.
              </p>
              <input
                type="number"
                step="0.01"
                min="0"
                className="input"
                value={sessionRate}
                onChange={e => setSessionRate(e.target.value)}
              />
            </div>
          )}
          
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </form>
      </div>
    </AppLayout>
  );
}
