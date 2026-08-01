import type { Metadata, Viewport } from 'next';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from '@/context/AuthContext';
import './globals.css';

export const metadata: Metadata = {
  title: 'SkillShare — Learn, Teach, Get Certified',
  description: 'A platform to showcase your skills, book live 1v1 sessions with creators, and earn AI-powered certifications.',
  keywords: ['skill sharing', 'online learning', '1v1 sessions', 'certification', 'creators'],
  authors: [{ name: 'SkillShare' }],
  openGraph: {
    title: 'SkillShare — Learn, Teach, Get Certified',
    description: 'Showcase skills, book live sessions, earn certifications.',
    type: 'website',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#6c63ff',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: '#1a1a2e',
                color: '#f0f0ff',
                border: '1px solid rgba(108,99,255,0.3)',
                borderRadius: '12px',
              },
              success: { iconTheme: { primary: '#34d399', secondary: '#0a0a14' } },
              error:   { iconTheme: { primary: '#f87171', secondary: '#0a0a14' } },
            }}
          />
        </AuthProvider>
      </body>
    </html>
  );
}
