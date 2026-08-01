'use client';
/**
 * Skill Swap Matches Page
 */

import { useState, useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';

interface MatchUser {
  _id: string;
  username: string;
  displayName: string;
  avatar: string;
  bio: string;
  skillsToTeach: string[];
  skillsToLearn: string[];
  isCreator: boolean;
  canTeachMeScore: number;
  wantToLearnFromMeScore: number;
  isPerfectMatch: boolean;
}

export default function MatchesPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [matches, setMatches] = useState<MatchUser[]>([]);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    setFetching(true);
    api.get<MatchUser[]>('/api/users/matches')
      .then(setMatches)
      .catch(() => toast.error('Failed to load matches'))
      .finally(() => setFetching(false));
  }, [user]);

  if (loading) return null;

  return (
    <AppLayout>
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '24px 16px' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>🤝</div>
          <h1 style={{ fontSize: 28, fontWeight: 800 }}>Skill Swap Matches</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: 8 }}>
            People who want to learn what you teach, and can teach what you want to learn!
          </p>
        </div>

        {fetching ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 160, borderRadius: 'var(--radius-lg)' }} />)}
          </div>
        ) : matches.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)' }}>
            <h2 style={{ fontSize: 20, marginBottom: 8 }}>No matches found yet</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>
              Try adding more skills to your profile to find better matches!
            </p>
            <Link href="/settings" className="btn btn-primary">Edit Skills</Link>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
            {matches.map(match => (
              <div key={match._id} className="glass-card" style={{ padding: 20, position: 'relative', overflow: 'hidden' }}>
                {match.isPerfectMatch && (
                  <div style={{
                    position: 'absolute', top: 0, right: 0, background: 'var(--accent-success)', 
                    color: 'var(--bg-main)', fontSize: 11, fontWeight: 800, padding: '4px 12px',
                    borderBottomLeftRadius: 'var(--radius-sm)'
                  }}>
                    PERFECT MATCH ✨
                  </div>
                )}
                
                <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', marginBottom: 16 }}>
                  {match.avatar ? (
                    <img src={match.avatar} alt={match.displayName} className="avatar avatar-lg" />
                  ) : (
                    <div className="avatar avatar-lg" style={{ background: 'var(--gradient-brand)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 800 }}>
                      {match.displayName[0]}
                    </div>
                  )}
                  <div>
                    <Link href={`/profile/${match.username}`} style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-main)', textDecoration: 'none' }}>
                      {match.displayName}
                    </Link>
                    <div style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 4 }}>@{match.username}</div>
                    {match.bio && <div style={{ fontSize: 13, color: 'var(--text-secondary)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{match.bio}</div>}
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {match.wantToLearnFromMeScore > 0 && (
                    <div style={{ background: 'rgba(167, 139, 250, 0.1)', padding: '8px 12px', borderRadius: 'var(--radius-sm)' }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent-primary)', marginBottom: 4 }}>Wants to learn from you:</div>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {match.skillsToLearn.filter(s => user?.skillsToTeach.includes(s)).map(s => (
                          <span key={s} className="badge" style={{ background: 'var(--accent-primary)', color: '#fff', fontSize: 11 }}>{s}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {match.canTeachMeScore > 0 && (
                    <div style={{ background: 'rgba(52, 211, 153, 0.1)', padding: '8px 12px', borderRadius: 'var(--radius-sm)' }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent-success)', marginBottom: 4 }}>Can teach you:</div>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {match.skillsToTeach.filter(s => user?.skillsToLearn.includes(s)).map(s => (
                          <span key={s} className="badge" style={{ background: 'var(--accent-success)', color: '#fff', fontSize: 11 }}>{s}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                
                <Link href={`/profile/${match.username}?book=true`} className="btn btn-secondary" style={{ width: '100%', marginTop: 16 }}>
                  View & Book
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
