'use client';
/**
 * Explore Page — Discover creators and posts by category
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import PostCard from '@/components/feed/PostCard';
import { api } from '@/lib/api';
import type { Post } from '@/types';
import { SKILL_CATEGORIES, type SkillCategory } from '@/types';

export default function ExplorePage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [category, setCategory] = useState<SkillCategory | ''>('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [fetching, setFetching] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const loadPosts = useCallback(async (pageNum: number, reset = false) => {
    if (fetching) return;
    setFetching(true);
    try {
      const params = new URLSearchParams({ page: String(pageNum), limit: '12' });
      if (category) params.set('category', category);
      if (search) params.set('search', search);

      const res = await api.get<{ posts: Post[]; hasMore: boolean }>(`/api/posts/explore?${params}`);
      setPosts(prev => (reset || pageNum === 1) ? res.posts : [...prev, ...res.posts]);
      setHasMore(res.hasMore);
    } catch {}
    finally { setFetching(false); }
  }, [category, search, fetching]);

  // Reset and reload when filters change
  useEffect(() => {
    setPosts([]);
    setPage(1);
    setHasMore(true);
    loadPosts(1, true);
  }, [category, search]);

  // Infinite scroll
  useEffect(() => {
    observerRef.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore && !fetching) {
        setPage(p => { loadPosts(p + 1); return p + 1; });
      }
    }, { threshold: 0.1 });
    if (sentinelRef.current) observerRef.current.observe(sentinelRef.current);
    return () => observerRef.current?.disconnect();
  }, [hasMore, fetching]);

  return (
    <AppLayout>
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 16px' }}>
        {/* Header + search */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 16 }}>Explore</h1>
          <input
            className="input"
            type="search"
            placeholder="🔍 Search skills, posts, creators..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ maxWidth: 480 }}
          />
        </div>

        {/* Category filters */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 24 }}>
          <button
            className={`btn btn-sm ${!category ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setCategory('')}
          >
            All
          </button>
          {SKILL_CATEGORIES.map(cat => (
            <button
              key={cat}
              className={`btn btn-sm ${category === cat ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Posts grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: 20,
        }}>
          {posts.map(post => (
            <PostCard key={post._id} post={post} />
          ))}
        </div>

        {/* Loading skeletons */}
        {fetching && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: 20,
            marginTop: 20,
          }}>
            {[1,2,3].map(i => (
              <div key={i} className="post-card">
                <div className="skeleton" style={{ height: 200 }} />
                <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div className="skeleton" style={{ height: 14, width: '70%' }} />
                  <div className="skeleton" style={{ height: 12, width: '40%' }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {!fetching && posts.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🔍</div>
            <p style={{ color: 'var(--text-secondary)' }}>No posts found. Try a different search or category.</p>
          </div>
        )}

        <div ref={sentinelRef} style={{ height: 1 }} />
      </div>
    </AppLayout>
  );
}
