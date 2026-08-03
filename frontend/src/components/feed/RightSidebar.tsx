'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import type { User, Session } from '@/types';
import { format, isToday, isTomorrow } from 'date-fns';

export default function RightSidebar() {
  const [creators, setCreators] = useState<User[]>([]);
  const [upcomingSessions, setUpcomingSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch suggested creators
        const creatorsRes = await api.get<User[]>('/api/users/discover?limit=4');
        setCreators(creatorsRes);

        // Fetch upcoming sessions
        const sessionsRes = await api.get<Session[]>('/api/sessions/mine?status=confirmed');
        const upcoming = sessionsRes
          .filter(s => new Date(s.scheduledAt) > new Date())
          .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())
          .slice(0, 2);
        setUpcomingSessions(upcoming);
      } catch (err) {
        console.error('Failed to load right sidebar data', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const trendingSkills = [
    { name: 'React', count: 1240 },
    { name: 'UI/UX Design', count: 980 },
    { name: 'Figma', count: 850 },
    { name: 'Machine Learning', count: 720 },
    { name: 'Marketing', count: 560 },
  ];

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div className="skeleton" style={{ height: 200, borderRadius: 'var(--radius-lg)' }} />
        <div className="skeleton" style={{ height: 200, borderRadius: 'var(--radius-lg)' }} />
      </div>
    );
  }

  const formatSessionTime = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) return `Today at ${format(date, 'p')}`;
    if (isTomorrow(date)) return `Tomorrow at ${format(date, 'p')}`;
    return format(date, 'MMM d, p');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, position: 'sticky', top: 24 }}>
      
      {/* Upcoming Sessions */}
      {upcomingSessions.length > 0 && (
        <div className="card" style={{ padding: 20 }}>
          <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>🗓</span> Upcoming Sessions
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {upcomingSessions.map(session => (
              <div key={session._id} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', background: 'var(--bg-primary)', padding: 12, borderRadius: 'var(--radius-md)' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{session.skillTopic}</div>
                  <div style={{ fontSize: 12, color: 'var(--accent-primary-dark)', fontWeight: 600, marginTop: 4 }}>
                    {formatSessionTime(session.scheduledAt)}
                  </div>
                </div>
                <Link href="/sessions" className="btn btn-primary" style={{ padding: '6px 12px', fontSize: 12, minWidth: 'auto' }}>
                  Join
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Suggested Creators */}
      <div className="card" style={{ padding: 20 }}>
        <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span>✨</span> Suggested Creators
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {creators.map(creator => (
            <div key={creator._id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Link href={`/profile/${creator.username}`}>
                {creator.avatar ? (
                  <img src={creator.avatar} alt={creator.displayName} className="avatar avatar-sm" />
                ) : (
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--gradient-brand)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                    {creator.displayName[0]}
                  </div>
                )}
              </Link>
              <div style={{ flex: 1, minWidth: 0 }}>
                <Link href={`/profile/${creator.username}`} style={{ display: 'block', fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {creator.displayName}
                </Link>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {creator.headline || `@${creator.username}`}
                </div>
              </div>
              <Link href={`/profile/${creator.username}`} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: 12, minWidth: 'auto' }}>
                View
              </Link>
            </div>
          ))}
        </div>
      </div>

      {/* Trending Skills */}
      <div className="card" style={{ padding: 20 }}>
        <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span>🔥</span> Trending Skills
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {trendingSkills.map((skill, index) => (
            <Link key={skill.name} href={`/explore?search=${skill.name}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', textDecoration: 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-muted)', width: 16 }}>{index + 1}</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>#{skill.name}</span>
              </div>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{skill.count} posts</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Footer Links */}
      <div style={{ padding: '0 8px', display: 'flex', flexWrap: 'wrap', gap: '8px 16px', fontSize: 12, color: 'var(--text-muted)' }}>
        <a href="#" style={{ color: 'inherit', textDecoration: 'none' }}>About</a>
        <a href="#" style={{ color: 'inherit', textDecoration: 'none' }}>Help Center</a>
        <a href="#" style={{ color: 'inherit', textDecoration: 'none' }}>Privacy Policy</a>
        <a href="#" style={{ color: 'inherit', textDecoration: 'none' }}>Terms of Service</a>
        <span>© 2026 SkillShare Inc.</span>
      </div>

    </div>
  );
}
