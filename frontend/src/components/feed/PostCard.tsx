'use client';
/**
 * Post Card Component
 * Individual post in the feed with like, comment, bookmark, book session actions
 */

import { useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import type { Post } from '@/types';
import toast from 'react-hot-toast';

interface PostCardProps {
  post: Post;
  onUpdate?: (updated: Post) => void;
}

export default function PostCard({ post: initialPost, onUpdate }: PostCardProps) {
  const { user } = useAuth();
  const [post, setPost] = useState(initialPost);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [addingComment, setAddingComment] = useState(false);

  const handleLike = async () => {
    if (!user) { toast.error('Sign in to like posts'); return; }
    const prev = post;
    // Optimistic update
    const liked = !post.isLiked;
    const currentLikeCount = post.likeCount ?? post.likes?.length ?? 0;
    setPost(p => ({
      ...p,
      isLiked: liked,
      likeCount: liked ? currentLikeCount + 1 : Math.max(0, currentLikeCount - 1),
    }));

    try {
      await api.post(`/api/posts/${post._id}/like`);
    } catch {
      setPost(prev); // rollback
    }
  };

  const handleSave = async () => {
    if (!user) return;
    const saved = !post.isSaved;
    setPost(p => ({ ...p, isSaved: saved }));
    try {
      await api.post(`/api/posts/${post._id}/save`);
    } catch {}
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || !user) return;
    setAddingComment(true);
    try {
      const comment = await api.post<{_id: string; user: typeof user; text: string; createdAt: string}>(
        `/api/posts/${post._id}/comments`,
        { text: commentText }
      );
      setPost(p => ({ 
        ...p, 
        comments: [...(p.comments || []), comment as any], 
        commentCount: (p.commentCount ?? p.comments?.length ?? 0) + 1 
      }));
      setCommentText('');
    } catch (err: unknown) {
      toast.error('Failed to add comment');
    } finally {
      setAddingComment(false);
    }
  };

  const timeAgo = (date: string) => {
    const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
    if (s < 60) return `${s}s`;
    if (s < 3600) return `${Math.floor(s/60)}m`;
    if (s < 86400) return `${Math.floor(s/3600)}h`;
    return `${Math.floor(s/86400)}d`;
  };

  return (
    <article className="post-card" aria-label={`Post: ${post.title}`}>
      {/* Author header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px' }}>
        <Link href={`/profile/${post.author?.username || 'unknown'}`}>
          {post.author?.avatar
            ? <img src={post.author.avatar} alt={post.author?.displayName || 'User'} className="avatar avatar-md" />
            : <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--gradient-brand)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 18 }}>{(post.author?.displayName || post.author?.username || 'U')[0]?.toUpperCase()}</div>
          }
        </Link>
        <div style={{ flex: 1 }}>
          <Link href={`/profile/${post.author?.username || 'unknown'}`} style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: 15 }}>
            {post.author?.displayName || post.author?.username || 'Unknown User'}
          </Link>
          {post.author?.isCreator && (
            <span className="badge badge-primary" style={{ marginLeft: 6, fontSize: 10 }}>Creator</span>
          )}
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
            @{post.author?.username || 'unknown'} · {timeAgo(post.createdAt)}
          </div>
        </div>
        <span className="badge badge-primary" style={{ fontSize: 11 }}>{post.category}</span>
      </div>

      {/* Media */}
      <Link href={`/post/${post._id}`} style={{ display: 'block' }}>
        <div className="post-media">
          {post.mediaType === 'video' ? (
            <video
              src={post.mediaUrl}
              poster={post.thumbnailUrl}
              muted
              playsInline
              preload="metadata"
              onMouseEnter={e => (e.currentTarget as HTMLVideoElement).play()}
              onMouseLeave={e => { const v = e.currentTarget as HTMLVideoElement; v.pause(); v.currentTime = 0; }}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <img
              src={post.mediaUrl}
              alt={post.title}
              loading="lazy"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          )}
          {post.mediaType === 'video' && (
            <div style={{ position: 'absolute', top: 12, right: 12, background: 'rgba(0,0,0,0.6)', borderRadius: 4, padding: '2px 6px', fontSize: 11, color: '#fff' }}>
              ▶ Video
            </div>
          )}
          {post.skillLevel && (
            <div style={{ position: 'absolute', bottom: 12, left: 12 }}>
              <span className="badge badge-warning" style={{ fontSize: 11 }}>{post.skillLevel}</span>
            </div>
          )}
        </div>
      </Link>

      {/* Content */}
      <div style={{ padding: '12px 16px' }}>
        <Link href={`/post/${post._id}`} style={{ textDecoration: 'none' }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>{post.title}</h3>
          {post.description && (
            <p className="truncate-2" style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{post.description}</p>
          )}
        </Link>

        {/* Tags */}
        {post.tags.length > 0 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
            {post.tags.slice(0, 4).map(tag => (
              <span key={tag} style={{ fontSize: 12, color: 'var(--accent-secondary)', opacity: 0.8 }}>#{tag}</span>
            ))}
          </div>
        )}
      </div>

      {/* Action bar */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '8px 16px 14px', gap: 4, borderTop: '1px solid var(--border-subtle)' }}>
        {/* Like */}
        <button className={`like-btn ${post.isLiked ? 'liked' : ''}`} onClick={handleLike} aria-label={post.isLiked ? 'Unlike' : 'Like'}>
          <span style={{ fontSize: 18 }}>{post.isLiked ? '❤️' : '🤍'}</span>
          <span style={{ fontSize: 13 }}>{post.likeCount ?? post.likes?.length ?? 0}</span>
        </button>

        {/* Comments */}
        <button className="like-btn" onClick={() => setShowComments(!showComments)} aria-label="Comments">
          <span style={{ fontSize: 18 }}>💬</span>
          <span style={{ fontSize: 13 }}>{post.commentCount ?? post.comments?.length ?? 0}</span>
        </button>

        {/* Views */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text-muted)', fontSize: 13, padding: '6px 8px' }}>
          <span style={{ fontSize: 16 }}>👁</span>
          <span>{post.views ?? 0}</span>
        </div>

        <div style={{ flex: 1 }} />

        {/* Save */}
        <button className={`like-btn ${post.isSaved ? 'liked' : ''}`} onClick={handleSave} aria-label={post.isSaved ? 'Unsave' : 'Save'}>
          <span style={{ fontSize: 18 }}>{post.isSaved ? '🔖' : '🔖'}</span>
        </button>

        {/* Book session (if post author is a creator) */}
        {post.author?.isCreator && user && post.author?._id !== user._id && (
          <Link
            href={`/profile/${post.author?.username || 'unknown'}?book=true`}
            className="btn btn-primary btn-sm"
            style={{ marginLeft: 4, fontSize: 12 }}
          >
            📅 Book
          </Link>
        )}

        {/* Take test */}
        {post.hasTest && post.testId && (
          <Link
            href={`/test/${post.testId}`}
            className="btn btn-secondary btn-sm"
            style={{ marginLeft: 4, fontSize: 12 }}
          >
            🧪 Test
          </Link>
        )}
      </div>

      {/* Comments section */}
      {showComments && (
        <div style={{ borderTop: '1px solid var(--border-subtle)', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Comment list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 200, overflowY: 'auto' }}>
            {(post.comments || []).slice(-5).map(c => (
              <div key={c._id} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--gradient-brand)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                  {(c.user?.displayName || 'U')[0]}
                </div>
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{c.user?.displayName || 'User'} </span>
                  <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{c.text}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Add comment */}
          {user && (
            <form onSubmit={handleAddComment} style={{ display: 'flex', gap: 8 }}>
              <input
                className="input"
                type="text"
                placeholder="Add a comment..."
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
                style={{ flex: 1, padding: '8px 12px', fontSize: 13 }}
                maxLength={500}
              />
              <button className="btn btn-primary btn-sm" type="submit" disabled={addingComment || !commentText.trim()}>
                Post
              </button>
            </form>
          )}
        </div>
      )}
    </article>
  );
}
