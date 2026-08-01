'use client';
/**
 * Create Post Page
 * Upload skill showcase posts (image/video) with category and tags
 */

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { SKILL_CATEGORIES, type SkillCategory } from '@/types';
import toast from 'react-hot-toast';

const SKILL_LEVELS = ['Beginner', 'Intermediate', 'Advanced', 'Expert'] as const;

export default function CreatePostPage() {
  const { user } = useAuth();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<SkillCategory>(SKILL_CATEGORIES[0]);
  const [skillLevel, setSkillLevel] = useState<typeof SKILL_LEVELS[number]>('Beginner');
  const [tags, setTags] = useState('');
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 100MB limit for video, 10MB for images
    const maxSize = file.type.startsWith('video/') ? 100 * 1024 * 1024 : 10 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error(`File too large. Max ${file.type.startsWith('video/') ? '100MB for video' : '10MB for images'}`);
      return;
    }

    setMediaFile(file);
    const url = URL.createObjectURL(file);
    setPreview(url);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mediaFile) { toast.error('Please select a media file'); return; }
    if (!title.trim()) { toast.error('Title is required'); return; }

    setSubmitting(true);
    const formData = new FormData();
    formData.append('media', mediaFile);
    formData.append('title', title.trim());
    formData.append('description', description.trim());
    formData.append('category', category);
    formData.append('skillLevel', skillLevel);
    formData.append('tags', JSON.stringify(tags.split(',').map(t => t.trim()).filter(Boolean)));

    try {
      const post = await api.post<{ _id: string; author: { username: string } }>('/api/posts', formData);
      toast.success('Post created! 🎉');
      router.push(`/profile/${user?.username}`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to create post');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppLayout>
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '24px 16px' }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 24 }}>Share Your Skill</h1>

        <form onSubmit={handleSubmit}>
          {/* Media upload */}
          <div
            className="glass-card"
            style={{
              padding: 0, overflow: 'hidden', marginBottom: 24,
              border: preview ? '1px solid var(--border-medium)' : '2px dashed var(--border-medium)',
              cursor: 'pointer',
              minHeight: 240,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onClick={() => fileRef.current?.click()}
          >
            {preview && mediaFile ? (
              mediaFile.type.startsWith('video/') ? (
                <video src={preview} controls style={{ width: '100%', maxHeight: 400 }} />
              ) : (
                <img src={preview} alt="Preview" style={{ width: '100%', maxHeight: 400, objectFit: 'contain' }} />
              )
            ) : (
              <div style={{ textAlign: 'center', padding: 40 }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>📸</div>
                <p style={{ color: 'var(--text-secondary)', fontWeight: 600, marginBottom: 6 }}>Click to upload your skill showcase</p>
                <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Images up to 10MB · Videos up to 100MB</p>
                <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>JPG, PNG, GIF, WebP, MP4, MOV</p>
              </div>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*,video/*"
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />

          {preview && (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={e => { e.stopPropagation(); setMediaFile(null); setPreview(null); }}
              style={{ marginBottom: 20, marginTop: -14 }}
            >
              ✕ Remove media
            </button>
          )}

          {/* Form fields */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div>
              <label className="input-label">Title *</label>
              <input
                className="input"
                type="text"
                placeholder="What skill are you showcasing?"
                value={title}
                onChange={e => setTitle(e.target.value)}
                required
                maxLength={100}
              />
            </div>

            <div>
              <label className="input-label">Description</label>
              <textarea
                className="input"
                placeholder="Describe what you're showing, tips, techniques, etc."
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={4}
                maxLength={2000}
                style={{ resize: 'vertical' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label className="input-label">Category *</label>
                <select
                  className="input"
                  value={category}
                  onChange={e => setCategory(e.target.value as SkillCategory)}
                  required
                >
                  {SKILL_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </div>
              <div>
                <label className="input-label">Skill Level</label>
                <select
                  className="input"
                  value={skillLevel}
                  onChange={e => setSkillLevel(e.target.value as typeof SKILL_LEVELS[number])}
                >
                  {SKILL_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="input-label">Tags (comma separated)</label>
              <input
                className="input"
                type="text"
                placeholder="react, javascript, frontend, webdev"
                value={tags}
                onChange={e => setTags(e.target.value)}
              />
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Help people discover your post</p>
            </div>

            <button
              className="btn btn-primary btn-lg"
              type="submit"
              disabled={submitting || !mediaFile || !title.trim()}
              style={{ marginTop: 8 }}
            >
              {submitting ? (
                <><span className="spin" style={{ display: 'inline-block' }}>⟳</span> Uploading...</>
              ) : (
                '✨ Share Skill Post'
              )}
            </button>
          </div>
        </form>
      </div>
    </AppLayout>
  );
}
