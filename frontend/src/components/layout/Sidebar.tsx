'use client';
/**
 * Sidebar Navigation Component
 * Desktop left sidebar with all main navigation links
 */

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useState } from 'react';

const navItems = [
  { href: '/feed',          icon: '🏠', label: 'Feed' },
  { href: '/reels',         icon: '🎬', label: 'Reels' },
  { href: '/explore',       icon: '🔍', label: 'Explore' },
  { href: '/discover',      icon: '🔥', label: 'Discover' },
  { href: '/sessions',      icon: '📅', label: 'Sessions' },
  { href: '/notifications', icon: '🔔', label: 'Notifications' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [showCreate, setShowCreate] = useState(false);

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  return (
    <aside className="sidebar" aria-label="Main navigation">
      {/* Logo */}
      <div style={{ padding: '24px 20px 16px', borderBottom: '1px solid var(--border-subtle)' }}>
        <Link href="/feed" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 24 }}>✦</span>
          <span className="gradient-text" style={{ fontSize: 20, fontWeight: 800 }}>SkillShare</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav style={{ padding: '16px 12px', flex: 1 }}>
        {navItems.map(item => (
          <Link
            key={item.href}
            href={item.href}
            className={`nav-link ${pathname === item.href || pathname.startsWith(item.href + '/') ? 'active' : ''}`}
          >
            <span style={{ fontSize: 18 }}>{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        ))}

        {user?.isCreator && (
          <Link
            href="/dashboard"
            className={`nav-link ${pathname.startsWith('/dashboard') ? 'active' : ''}`}
          >
            <span style={{ fontSize: 18 }}>📈</span>
            <span>Dashboard</span>
          </Link>
        )}

        <div className="divider" style={{ margin: '12px 4px' }} />

        {/* Create Post */}
        <Link href="/post/create" className="nav-link">
          <span style={{ fontSize: 18 }}>➕</span>
          <span>Create Post</span>
        </Link>

        {/* Profile */}
        {user && (
          <Link
            href={`/profile/${user.username}`}
            className={`nav-link ${pathname.startsWith('/profile/' + user.username) ? 'active' : ''}`}
          >
            {user.avatar
              ? <img src={user.avatar} alt="" className="avatar avatar-sm" />
              : <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--gradient-brand)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700 }}>{user.displayName[0]}</div>
            }
            <span>Profile</span>
          </Link>
        )}
      </nav>

      {/* Bottom: logout */}
      <div style={{ padding: '12px 12px 24px', borderTop: '1px solid var(--border-subtle)' }}>
        <button className="nav-link" onClick={handleLogout} style={{ color: 'var(--accent-danger)', width: '100%' }}>
          <span style={{ fontSize: 18 }}>🚪</span>
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
