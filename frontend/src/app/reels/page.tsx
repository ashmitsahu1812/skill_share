'use client';
/**
 * Reels Page — TikTok-style infinite scroll video feed
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import AppLayout from '@/components/layout/AppLayout';
import PostCard from '@/components/feed/PostCard';
import { api } from '@/lib/api';
import type { Post } from '@/types';

export default function ReelsPage() {
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
      const res = await api.get<{ posts: Post[]; hasMore: boolean }>(`/api/posts/feed?page=${pageNum}&limit=10&mediaType=video`);
      setPosts(prev => pageNum === 1 ? res.posts : [...prev, ...res.posts]);
      setHasMore(res.hasMore);
    } catch (err) {
      console.error('Failed to load reels:', err);
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
      <div 
        style={{ 
          height: '100vh', 
          overflowY: 'scroll', 
          scrollSnapType: 'y mandatory',
          scrollBehavior: 'smooth',
          background: '#000', // Dark mode specific to feed
          paddingBottom: 'var(--bottom-nav-h)'
        }}
        className="hide-scrollbar"
      >
        {/* Empty state */}
        {!fetching && posts.length === 0 && (
          <div style={{ textAlign: 'center', padding: '80px 20px', color: '#fff', scrollSnapAlign: 'start', height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>🎬</div>
            <h2 style={{ fontSize: 22, marginBottom: 8 }}>No videos yet</h2>
            <p style={{ color: 'rgba(255,255,255,0.7)', marginBottom: 24 }}>
              Follow creators who post videos to see them here!
            </p>
            <a href="/explore" className="btn btn-primary">
              Explore Creators
            </a>
          </div>
        )}

        {/* Posts */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {posts.map(post => (
            <div key={post._id} style={{ height: '100vh', scrollSnapAlign: 'start', position: 'relative' }}>
              <PostCard post={post} isFullscreen />
            </div>
          ))}
        </div>

        {/* Sentinel for infinite scroll */}
        <div ref={sentinelRef} style={{ height: 1 }} />

        {/* Loading skeleton */}
        {fetching && (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {[1, 2].map(i => (
              <div key={i} style={{ height: '100vh', scrollSnapAlign: 'start', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div className="skeleton" style={{ width: '100%', maxWidth: 460, height: '80%', borderRadius: 'var(--radius-lg)' }} />
              </div>
            ))}
          </div>
        )}

        {/* End of feed */}
        {!hasMore && posts.length > 0 && (
          <div style={{ textAlign: 'center', padding: '32px', color: 'rgba(255,255,255,0.5)', fontSize: 14, scrollSnapAlign: 'start', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div>
              ✦ You&apos;ve seen all reels.<br/> 
              <a href="/explore" style={{ color: 'var(--accent-primary)', marginTop: 12, display: 'inline-block' }}>Explore more creators →</a>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
