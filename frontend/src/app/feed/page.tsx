'use client';
/**
 * Feed Page — Main Instagram-style infinite scroll feed
 * Shows posts from followed creators + own posts
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import AppLayout from '@/components/layout/AppLayout';
import PostCard from '@/components/feed/PostCard';
import { api } from '@/lib/api';
import type { Post } from '@/types';

export default function FeedPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [posts, setPosts] = useState<Post[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [fetching, setFetching] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [user, loading, router]);

  const loadPosts = useCallback(async (pageNum: number) => {
    if (fetching || !hasMore) return;
    setFetching(true);
    try {
      const res = await api.get<{ posts: Post[]; hasMore: boolean }>(`/api/posts/feed?page=${pageNum}&limit=10`);
      setPosts(prev => pageNum === 1 ? res.posts : [...prev, ...res.posts]);
      setHasMore(res.hasMore);
    } catch (err) {
      console.error('Failed to load feed:', err);
    } finally {
      setFetching(false);
    }
  }, [fetching, hasMore]);

  // Initial load
  useEffect(() => {
    if (user) loadPosts(1);
  }, [user]);

  // Intersection Observer for infinite scroll
  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore && !fetching) {
          setPage(prev => {
            const next = prev + 1;
            loadPosts(next);
            return next;
          });
        }
      },
      { threshold: 0.1 }
    );

    if (sentinelRef.current) observerRef.current.observe(sentinelRef.current);
    return () => observerRef.current?.disconnect();
  }, [hasMore, fetching]);

  if (loading) return null;

  return (
    <AppLayout>
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '24px 16px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800 }}>Your Feed</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginTop: 2 }}>Posts from creators you follow</p>
          </div>
        </div>

        {/* Empty state */}
        {!fetching && posts.length === 0 && (
          <div style={{ textAlign: 'center', padding: '80px 20px' }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>🌟</div>
            <h2 style={{ fontSize: 22, marginBottom: 8 }}>Nothing here yet</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>
              Follow some creators to see their posts in your feed.
            </p>
            <a href="/explore" className="btn btn-primary">
              Explore Creators
            </a>
          </div>
        )}

        {/* Posts */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {posts.map(post => (
            <PostCard key={post._id} post={post} />
          ))}
        </div>

        {/* Sentinel for infinite scroll */}
        <div ref={sentinelRef} style={{ height: 1 }} />

        {/* Loading skeleton */}
        {fetching && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20, marginTop: 20 }}>
            {[1, 2].map(i => (
              <div key={i} className="post-card">
                <div style={{ display: 'flex', gap: 12, padding: '14px 16px' }}>
                  <div className="skeleton" style={{ width: 44, height: 44, borderRadius: '50%' }} />
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div className="skeleton" style={{ height: 14, width: '40%' }} />
                    <div className="skeleton" style={{ height: 12, width: '25%' }} />
                  </div>
                </div>
                <div className="skeleton" style={{ height: 300 }} />
                <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div className="skeleton" style={{ height: 14, width: '70%' }} />
                  <div className="skeleton" style={{ height: 12, width: '90%' }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* End of feed */}
        {!hasMore && posts.length > 0 && (
          <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)', fontSize: 14 }}>
            ✦ You&apos;ve seen all posts. <a href="/explore" style={{ color: 'var(--accent-secondary)' }}>Explore more creators →</a>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
