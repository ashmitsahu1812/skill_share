'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Tldraw } from '@tldraw/tldraw';
import '@tldraw/tldraw/tldraw.css';
import toast from 'react-hot-toast';

export default function LiveSessionPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (!user) {
      router.replace('/login');
      return;
    }
    setMounted(true);
    toast.success('Joined Live Session');
  }, [user, router]);

  if (!mounted || !user) return null;

  const roomName = `skillshare-session-${id}`;
  const jitsiUrl = `https://meet.jit.si/${roomName}#userInfo.displayName="${encodeURIComponent(user.displayName)}"`;

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden', background: '#0f172a' }}>
      
      {/* Top Bar Overlay */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 48, background: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(10px)', zIndex: 10, display: 'flex', alignItems: 'center', padding: '0 20px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <button 
          onClick={() => router.push('/feed')}
          style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}
        >
          <span>←</span> Leave Session
        </button>
        <div style={{ flex: 1 }} />
        <div style={{ color: '#fff', fontSize: 14, fontWeight: 600 }}>
          Live SkillShare Session
        </div>
      </div>

      {/* Video Sidebar (Jitsi) */}
      <div style={{ width: 320, height: '100%', borderRight: '1px solid rgba(255,255,255,0.1)', background: '#000', paddingTop: 48 }}>
        <iframe
          allow="camera; microphone; display-capture; autoplay; clipboard-write"
          src={jitsiUrl}
          style={{ width: '100%', height: '100%', border: 'none' }}
        />
      </div>

      {/* Whiteboard Area (tldraw) */}
      <div style={{ flex: 1, height: '100%', position: 'relative', paddingTop: 48 }}>
        <Tldraw 
          persistenceKey={roomName}
          autoFocus
        />
      </div>

    </div>
  );
}
