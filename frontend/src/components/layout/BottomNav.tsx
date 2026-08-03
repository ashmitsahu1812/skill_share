'use client';
/**
 * Bottom Navigation (Mobile)
 * Fixed bottom bar for small screens
 */

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const items = [
  { href: '/feed',          icon: '🏠', label: 'Feed' },
  { href: '/reels',         icon: '🎬', label: 'Reels' },
  { href: '/discover',      icon: '🔥', label: 'Discover' },
  { href: '/post/create',   icon: '➕', label: 'Create' },
  { href: '/sessions',      icon: '📅', label: 'Sessions' },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="bottom-nav" aria-label="Mobile navigation">
      {items.map(item => {
        const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
        return (
          <Link
            key={item.href}
            href={item.href}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 2,
              padding: '4px 12px',
              borderRadius: 'var(--radius-sm)',
              color: isActive ? 'var(--accent-secondary)' : 'var(--text-muted)',
              textDecoration: 'none',
              fontSize: 11,
              fontWeight: 600,
              transition: 'color var(--transition-fast)',
              minWidth: 44,
            }}
            aria-current={isActive ? 'page' : undefined}
          >
            <span style={{ fontSize: 22 }}>{item.icon}</span>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
