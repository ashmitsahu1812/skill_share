'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) router.replace('/feed');
  }, [user, loading, router]);

  if (loading) return null;
  if (user) return null;

  return (
    <main style={{ minHeight: '100vh', overflow: 'hidden' }}>
      {/* Background */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 0,
        background: 'radial-gradient(ellipse at 20% 20%, rgba(108,99,255,0.2) 0%, transparent 60%), radial-gradient(ellipse at 80% 80%, rgba(56,189,248,0.1) 0%, transparent 60%)',
      }} />

      {/* Grid pattern overlay */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 0, opacity: 0.04,
        backgroundImage: 'linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)',
        backgroundSize: '60px 60px',
      }} />

      {/* Navigation */}
      <nav style={{ position: 'relative', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '24px 40px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 28 }}>✦</span>
          <span className="gradient-text" style={{ fontSize: 22, fontWeight: 800 }}>SkillShare</span>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <Link href="/login" className="btn btn-ghost">Sign In</Link>
          <Link href="/signup" className="btn btn-primary">Get Started Free</Link>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ position: 'relative', zIndex: 10, textAlign: 'center', padding: '100px 24px 80px' }}>
        <div className="badge badge-primary" style={{ display: 'inline-flex', marginBottom: 20, fontSize: 13 }}>
          ✨ AI-Powered Skill Certification
        </div>
        <h1 style={{ fontSize: 'clamp(40px, 6vw, 72px)', fontWeight: 900, lineHeight: 1.1, marginBottom: 20, letterSpacing: -3 }}>
          Learn Skills.<br />
          <span className="gradient-text">Share Knowledge.</span><br />
          Get Certified.
        </h1>
        <p style={{ fontSize: 18, color: 'var(--text-secondary)', maxWidth: 560, margin: '0 auto 40px', lineHeight: 1.7 }}>
          Connect with expert creators, book live 1v1 sessions, and earn AI-verified certificates to prove your skills to the world.
        </p>
        <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/signup" className="btn btn-primary btn-lg" style={{ minWidth: 180 }}>Start Learning Free →</Link>
          <Link href="/explore" className="btn btn-secondary btn-lg">Browse Skills</Link>
        </div>
      </section>

      {/* Features */}
      <section style={{ position: 'relative', zIndex: 10, maxWidth: 1000, margin: '0 auto', padding: '40px 24px 80px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 20 }}>
          {[
            { icon: '📸', title: 'Skill Showcases', desc: 'Post images and videos demonstrating your expertise across any skill category.' },
            { icon: '📅', title: '1v1 Live Sessions', desc: 'Book real-time video sessions with creators via Jitsi Meet — free and instant.' },
            { icon: '🧪', title: 'AI Skill Tests', desc: 'Take Gemini-powered tests based on real creator content to certify your knowledge.' },
            { icon: '🎓', title: 'Verifiable Certificates', desc: 'Earn beautiful PDF certificates with unique QR codes anyone can verify.' },
          ].map(f => (
            <div key={f.title} className="glass-card" style={{ padding: 28, transition: 'transform var(--transition-normal)' }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>{f.icon}</div>
              <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 8 }}>{f.title}</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.6 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
