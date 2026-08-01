'use client';
/**
 * Signup Page
 * Create account with email/password, Google, or GitHub
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';

export default function SignupPage() {
  const { signInWithGoogle, signInWithGithub, signUpWithEmail, user, loading, requiresUsername, completeProfile } = useAuth();
  const router = useRouter();

  const [step, setStep] = useState<'signup' | 'username' | 'skills'>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Step 3 State
  const [skillsToTeach, setSkillsToTeach] = useState<string[]>([]);
  const [skillsToLearn, setSkillsToLearn] = useState<string[]>([]);
  const [teachInput, setTeachInput] = useState('');
  const [learnInput, setLearnInput] = useState('');

  useEffect(() => {
    if (!loading) {
      if (requiresUsername) setStep('username');
      else if (user) router.replace('/feed');
    }
  }, [user, loading, requiresUsername, router]);

  // Check username availability with debounce
  useEffect(() => {
    if (!username || username.length < 3) { setUsernameAvailable(null); return; }
    const t = setTimeout(async () => {
      const res = await api.get<{ available: boolean }>(`/api/auth/check-username/${username}`);
      setUsernameAvailable(res.available);
    }, 400);
    return () => clearTimeout(t);
  }, [username]);

  const handleEmailSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await signUpWithEmail(email, password);
      setStep('username');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Signup failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCompleteProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usernameAvailable) { toast.error('Username not available'); return; }
    setSubmitting(true);
    try {
      await completeProfile(username, displayName || username);
      setStep('skills');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to create profile');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveSkills = async () => {
    setSubmitting(true);
    try {
      await api.put('/api/users/me', {
        skillsToTeach: JSON.stringify(skillsToTeach),
        skillsToLearn: JSON.stringify(skillsToLearn),
      });
      toast.success('Profile completed! Welcome to SkillShare 🎉');
      router.push('/feed');
    } catch (err: unknown) {
      toast.error('Failed to save skills');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddTeach = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && teachInput.trim()) {
      e.preventDefault();
      if (!skillsToTeach.includes(teachInput.trim())) setSkillsToTeach([...skillsToTeach, teachInput.trim()]);
      setTeachInput('');
    }
  };

  const handleAddLearn = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && learnInput.trim()) {
      e.preventDefault();
      if (!skillsToLearn.includes(learnInput.trim())) setSkillsToLearn([...skillsToLearn, learnInput.trim()]);
      setLearnInput('');
    }
  };

  if (loading) return null;

  return (
    <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{
        position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse at 70% 30%, rgba(167,139,250,0.12) 0%, transparent 60%)',
      }} />

      <div className="glass-card" style={{ maxWidth: 440, width: '100%', padding: '48px 40px', position: 'relative', zIndex: 1 }}>
        {step === 'signup' ? (
          <>
            <div style={{ textAlign: 'center', marginBottom: 32 }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>✦</div>
              <h1 className="gradient-text" style={{ fontSize: 28, fontWeight: 800 }}>Join SkillShare</h1>
              <p style={{ color: 'var(--text-secondary)', marginTop: 8, fontSize: 15 }}>
                Showcase your skills. Teach what you love.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
              <button className="btn btn-secondary btn-lg" onClick={() => signInWithGoogle().then(() => {})} style={{ width: '100%' }}>
                <svg width="20" height="20" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.35-8.16 2.35-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
                Sign up with Google
              </button>
              <button className="btn btn-secondary btn-lg" onClick={() => signInWithGithub().then(() => {})} style={{ width: '100%' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/></svg>
                Sign up with GitHub
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
              <div className="divider" style={{ flex: 1, margin: 0 }} />
              <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>or email</span>
              <div className="divider" style={{ flex: 1, margin: 0 }} />
            </div>

            <form onSubmit={handleEmailSignup} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label className="input-label">Email</label>
                <input className="input" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required />
              </div>
              <div>
                <label className="input-label">Password</label>
                <input className="input" type="password" placeholder="Min 8 characters" value={password} onChange={e => setPassword(e.target.value)} required minLength={8} />
              </div>
              <button className="btn btn-primary btn-lg" type="submit" disabled={submitting} style={{ marginTop: 8 }}>
                {submitting ? 'Creating account...' : 'Create Account'}
              </button>
            </form>

            <p style={{ textAlign: 'center', marginTop: 24, color: 'var(--text-secondary)', fontSize: 14 }}>
              Already have an account?{' '}
              <Link href="/login" style={{ color: 'var(--accent-secondary)', fontWeight: 600 }}>Sign in</Link>
            </p>
          </>
        ) : step === 'username' ? (
          /* Step 2: Choose username */
          <>
            <div style={{ textAlign: 'center', marginBottom: 32 }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>🎯</div>
              <h2 style={{ fontSize: 24, fontWeight: 800 }}>Set up your profile</h2>
              <p style={{ color: 'var(--text-secondary)', marginTop: 8 }}>Choose a unique username to get started.</p>
            </div>

            <form onSubmit={handleCompleteProfile} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label className="input-label">Username</label>
                <div style={{ position: 'relative' }}>
                  <input
                    className="input"
                    type="text"
                    placeholder="your_username"
                    value={username}
                    onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, ''))}
                    required
                    minLength={3}
                    maxLength={30}
                    style={{ paddingRight: 40 }}
                  />
                  {usernameAvailable !== null && username.length >= 3 && (
                    <span style={{
                      position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                      color: usernameAvailable ? 'var(--accent-success)' : 'var(--accent-danger)',
                      fontSize: 18,
                    }}>
                      {usernameAvailable ? '✓' : '✗'}
                    </span>
                  )}
                </div>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                  Lowercase letters, numbers, _ and . only
                </p>
              </div>
              <div>
                <label className="input-label">Display Name</label>
                <input
                  className="input"
                  type="text"
                  placeholder="Your full name"
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  maxLength={60}
                />
              </div>
              <button className="btn btn-primary btn-lg" type="submit" disabled={submitting || usernameAvailable === false} style={{ marginTop: 8 }}>
                {submitting ? 'Setting up...' : 'Next Step →'}
              </button>
            </form>
          </>
        ) : (
          /* Step 3: Skills */
          <>
            <div style={{ textAlign: 'center', marginBottom: 32 }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>🧠</div>
              <h2 style={{ fontSize: 24, fontWeight: 800 }}>What's your focus?</h2>
              <p style={{ color: 'var(--text-secondary)', marginTop: 8 }}>Add skills you want to learn or teach.</p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              {/* Skills to Teach */}
              <div>
                <label className="input-label">I know (Skills to Teach)</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
                  {skillsToTeach.map(s => (
                    <span key={s} className="badge badge-primary" style={{ cursor: 'pointer' }} onClick={() => setSkillsToTeach(skillsToTeach.filter(x => x !== s))}>
                      {s} ✕
                    </span>
                  ))}
                </div>
                <input
                  className="input"
                  type="text"
                  placeholder="Type a skill and press Enter..."
                  value={teachInput}
                  onChange={e => setTeachInput(e.target.value)}
                  onKeyDown={handleAddTeach}
                />
              </div>

              {/* Skills to Learn */}
              <div>
                <label className="input-label">I want to learn</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
                  {skillsToLearn.map(s => (
                    <span key={s} className="badge badge-secondary" style={{ cursor: 'pointer' }} onClick={() => setSkillsToLearn(skillsToLearn.filter(x => x !== s))}>
                      {s} ✕
                    </span>
                  ))}
                </div>
                <input
                  className="input"
                  type="text"
                  placeholder="Type a skill and press Enter..."
                  value={learnInput}
                  onChange={e => setLearnInput(e.target.value)}
                  onKeyDown={handleAddLearn}
                />
              </div>

              <button className="btn btn-primary btn-lg" onClick={handleSaveSkills} disabled={submitting} style={{ marginTop: 8 }}>
                {submitting ? 'Saving...' : 'Complete Setup 🎉'}
              </button>
              
              <button className="btn btn-ghost btn-sm" onClick={() => {
                toast.success('Welcome to SkillShare 🎉');
                router.push('/feed');
              }} disabled={submitting}>
                Skip for now
              </button>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
