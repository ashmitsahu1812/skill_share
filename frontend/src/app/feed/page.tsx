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
import RightSidebar from '@/components/feed/RightSidebar';
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
      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '24px 16px', paddingBottom: 'calc(var(--bottom-nav-h) + 24px)', display: 'grid', gridTemplateColumns: '1fr', gap: 32 }}>
        {/* We use a CSS grid that falls back to 1fr on mobile, but uses two columns on desktop */}
        <style dangerouslySetInnerHTML={{__html: `
          @media (min-width: 1024px) {
            .feed-grid { grid-template-columns: minmax(0, 1fr) 320px !important; }
            .right-sidebar-wrapper { display: block !important; }
          }
          .right-sidebar-wrapper { display: none; }
        `}} />
        
        <div className="feed-grid" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 32, alignItems: 'start' }}>
          
          {/* Main Feed Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>

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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
          {posts.map(post => (
            <PostCard key={post._id} post={post} />
          ))}
        </div>

        {/* Sentinel for infinite scroll */}
        <div ref={sentinelRef} style={{ height: 1 }} />

        {/* Loading skeleton */}
        {fetching && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 32, marginTop: posts.length ? 32 : 0 }}>
            {[1, 2].map(i => (
              <div key={i} className="skeleton" style={{ width: '100%', height: 400, borderRadius: 'var(--radius-lg)' }} />
            ))}
          </div>
        )}

        {/* End of feed */}
        {!hasMore && posts.length > 0 && (
          <div style={{ textAlign: 'center', padding: '32px', color: 'rgba(255,255,255,0.5)', fontSize: 14, scrollSnapAlign: 'start', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div>
              ✦ You&apos;ve seen all posts.<br/> 
              <a href="/explore" style={{ color: 'var(--accent-primary)', marginTop: 12, display: 'inline-block' }}>Explore more creators →</a>
            </div>
          </div>
        )}
          </div>
          
          {/* Right Sidebar Column */}
          <div className="right-sidebar-wrapper">
            <RightSidebar />
          </div>

        </div>
      </div>
    </AppLayout>
  );
}
