'use client';
/**
 * Profile Page — Public profile with posts, certificates, follow, and book session
 */

import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import PostCard from '@/components/feed/PostCard';
import BookingModal from '@/components/booking/BookingModal';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import type { User, Post, Certificate } from '@/types';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function ProfilePage() {
  const params = useParams<{ username: string }>();
  const searchParams = useSearchParams();
  const { user: me } = useAuth();

  const [profile, setProfile] = useState<User | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [messaging, setMessaging] = useState(false);
  const [activeTab, setActiveTab] = useState<'posts' | 'certs'>('posts');
  const [showBooking, setShowBooking] = useState(searchParams.get('book') === 'true');
  const router = useRouter();

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      try {
        const data = await api.get<{ user: User; posts: Post[] }>(`/api/users/${params.username}`);
        setProfile(data.user);
        setPosts(data.posts);
        setFollowing(data.user.isFollowing || false);
      } catch {
        toast.error('Profile not found');
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [params.username]);

  const handleFollow = async () => {
    if (!me) { toast.error('Sign in to follow'); return; }
    if (!profile) return;
    setFollowLoading(true);
    const wasFollowing = following;
    setFollowing(!following);
    setProfile(p => p ? {
      ...p,
      followerCount: following ? p.followerCount - 1 : p.followerCount + 1,
    } : null);
    try {
      await api.post(`/api/users/${profile._id}/follow`);
    } catch {
      setFollowing(wasFollowing);
    } finally {
      setFollowLoading(false);
    }
  };

  const handleMessage = async () => {
    if (!me) { toast.error('Sign in to message'); return; }
    if (!profile) return;
    try {
      setMessaging(true);
      await api.post('/api/messages/conversations', { targetUserId: profile._id });
      router.push('/messages');
    } catch (err) {
      toast.error('Could not start conversation');
      setMessaging(false);
    }
  };

  const isOwnProfile = me?.username === params.username;

  if (loading) {
    return (
      <AppLayout>
        <div style={{ maxWidth: 720, margin: '0 auto', padding: '24px 16px' }}>
          <div className="skeleton" style={{ height: 200, borderRadius: 'var(--radius-lg)', marginBottom: 20 }} />
        </div>
      </AppLayout>
    );
  }

  if (!profile) return <AppLayout><div style={{ textAlign: 'center', padding: 80 }}>Profile not found</div></AppLayout>;

  return (
    <AppLayout>
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '24px 16px' }}>
        {/* Profile Header */}
        <div className="glass-card" style={{ padding: 32, marginBottom: 24, position: 'relative', overflow: 'visible' }}>
          {/* Background accent */}
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: 80,
            background: 'var(--gradient-brand)', opacity: 0.15, borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0',
          }} />

          <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', position: 'relative' }}>
            {/* Avatar */}
            {profile.avatar
              ? <img src={profile.avatar} alt={profile.displayName} className="avatar avatar-xl" style={{ border: '3px solid var(--accent-primary)', boxShadow: 'var(--shadow-glow)' }} />
              : <div style={{ width: 120, height: 120, borderRadius: '50%', background: 'var(--gradient-brand)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 48, fontWeight: 800, border: '3px solid var(--accent-primary)', boxShadow: 'var(--shadow-glow)', flexShrink: 0 }}>{profile.displayName[0]}</div>
            }

            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <h1 style={{ fontSize: 24, fontWeight: 800 }}>{profile.displayName}</h1>
                <span className="badge badge-warning">🏆 Lvl {profile.level || 1}</span>
                <span className="badge badge-secondary">✨ {profile.xp || 0} XP</span>
                {profile.isCreator && <span className="badge badge-primary">✦ Creator</span>}
                {profile.isVerified && <span style={{ color: 'var(--accent-tertiary)', fontSize: 18 }}>✔</span>}
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 8 }}>@{profile.username}</p>
              {profile.bio && <p style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.6, marginBottom: 12 }}>{profile.bio}</p>}

              {/* Stats */}
              <div style={{ display: 'flex', gap: 24, marginBottom: 16 }}>
                {[
                  { value: posts.length, label: 'Posts' },
                  { value: profile.followerCount, label: 'Followers' },
                  { value: profile.followingCount, label: 'Following' },
                  profile.isCreator ? { value: profile.totalSessions, label: 'Sessions' } : null,
                ].filter(Boolean).map(stat => (
                  <div key={stat!.label} style={{ textAlign: 'center' }}>
                    <div style={{ fontWeight: 800, fontSize: 18 }}>{stat!.value}</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>{stat!.label}</div>
                  </div>
                ))}
              </div>

              {/* Skills */}
              {((profile.skillsToTeach && profile.skillsToTeach.length > 0) || (profile.skillsToLearn && profile.skillsToLearn.length > 0)) && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                  {profile.skillsToTeach && profile.skillsToTeach.length > 0 && (
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginRight: 4 }}>I know:</span>
                      {profile.skillsToTeach.map(s => <span key={s} className="badge badge-primary">{s}</span>)}
                    </div>
                  )}
                  {profile.skillsToLearn && profile.skillsToLearn.length > 0 && (
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginRight: 4 }}>I want to learn:</span>
                      {profile.skillsToLearn.map(s => <span key={s} className="badge badge-secondary">{s}</span>)}
                    </div>
                  )}
                </div>
              )}

              {/* Actions */}
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {isOwnProfile ? (
                  <Link href="/settings" className="btn btn-secondary">Edit Profile</Link>
                ) : (
                  <>
                    <button
                      className={`btn ${following ? 'btn-secondary' : 'btn-primary'}`}
                      onClick={handleFollow}
                      disabled={followLoading}
                    >
                      {following ? 'Following' : 'Follow'}
                    </button>
                    <button 
                      className="btn btn-secondary" 
                      onClick={handleMessage} 
                      disabled={messaging}
                    >
                      {messaging ? '...' : '💬 Message'}
                    </button>
                    {profile.isCreator && (
                      <button className="btn btn-secondary" onClick={() => setShowBooking(true)}>
                        📅 Book Session {profile.sessionRate > 0 ? `($${(profile.sessionRate/100).toFixed(0)})` : '(Free)'}
                      </button>
                    )}
                  </>
                )}
              </div>

              {/* Creator rating */}
              {profile.isCreator && profile.ratingCount > 0 && (
                <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ color: 'var(--accent-warning)' }}>⭐</span>
                  <span style={{ fontWeight: 700 }}>{profile.rating.toFixed(1)}</span>
                  <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>({profile.ratingCount} reviews)</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-subtle)', marginBottom: 20 }}>
          {(['posts', 'certs'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '12px 20px',
                background: 'none',
                border: 'none',
                borderBottom: `2px solid ${activeTab === tab ? 'var(--accent-primary)' : 'transparent'}`,
                color: activeTab === tab ? 'var(--accent-primary)' : 'var(--text-muted)',
                fontWeight: 600,
                fontSize: 14,
                cursor: 'pointer',
                transition: 'all var(--transition-fast)',
              }}
            >
              {tab === 'posts' ? `Posts (${posts.length})` : `Certificates (${profile.certificates?.length || 0})`}
            </button>
          ))}
        </div>

        {/* Posts tab */}
        {activeTab === 'posts' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {posts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>📸</div>
                <p style={{ color: 'var(--text-secondary)' }}>
                  {isOwnProfile ? 'Share your first skill post!' : 'No posts yet.'}
                </p>
                {isOwnProfile && <Link href="/post/create" className="btn btn-primary" style={{ display: 'inline-flex', marginTop: 16 }}>Create Post</Link>}
              </div>
            ) : (
              posts.map(post => <PostCard key={post._id} post={post} />)
            )}
          </div>
        )}

        {/* Certificates tab */}
        {activeTab === 'certs' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
            {(profile.certificates || []).length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 20px', gridColumn: '1/-1' }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>🎓</div>
                <p style={{ color: 'var(--text-secondary)' }}>No certificates yet. Take a skill test to earn one!</p>
              </div>
            ) : (
              (profile.certificates as unknown as Certificate[]).map(cert => (
                <div key={cert._id} className="certificate-card">
                  <div style={{ fontSize: 32, marginBottom: 8 }}>🎓</div>
                  <h3 style={{ fontWeight: 700, marginBottom: 4 }}>{cert.skill}</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 8 }}>{cert.category}</p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="badge badge-success">Score: {cert.score}%</span>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      {new Date(cert.issuedAt).toLocaleDateString()}
                    </span>
                  </div>
                  {cert.pdfUrl && (
                    <a href={cert.pdfUrl} target="_blank" rel="noreferrer" className="btn btn-secondary btn-sm" style={{ marginTop: 12, width: '100%' }}>
                      📄 Download Certificate
                    </a>
                  )}
                  <Link href={`/verify/${cert.verificationCode}`} style={{ display: 'block', textAlign: 'center', marginTop: 8, fontSize: 12, color: 'var(--text-muted)' }}>
                    Verify →
                  </Link>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Booking Modal */}
      {showBooking && profile.isCreator && (
        <BookingModal
          creator={profile}
          onClose={() => setShowBooking(false)}
          onBooked={() => { setShowBooking(false); toast.success('Session booked! Check your email.'); }}
        />
      )}
    </AppLayout>
  );
}
