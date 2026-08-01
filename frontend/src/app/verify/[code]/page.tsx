'use client';
/**
 * Certificate Verification Page — Public
 * Anyone can verify a certificate using its unique code
 */

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import Link from 'next/link';

interface VerifyResponse {
  valid: boolean;
  certificate: {
    holder: { username: string; displayName: string; avatar: string };
    issuer: { username: string; displayName: string };
    skill: string;
    category: string;
    score: number;
    issuedAt: string;
    expiresAt?: string;
    verificationCode: string;
    pdfUrl?: string;
  };
}

export default function VerifyPage() {
  const { code } = useParams<{ code: string }>();
  const [result, setResult] = useState<VerifyResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get<VerifyResponse>(`/api/certificates/verify/${code}`)
      .then(setResult)
      .catch(() => setError('Certificate not found or invalid verification code'))
      .finally(() => setLoading(false));
  }, [code]);

  return (
    <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', background: 'var(--bg-primary)' }}>
      <div style={{
        position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse at 50% 30%, rgba(108,99,255,0.1) 0%, transparent 70%)',
      }} />

      <div className="glass-card" style={{ maxWidth: 540, width: '100%', padding: '40px 32px', position: 'relative', zIndex: 1 }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <Link href="/" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
            <span style={{ fontSize: 24 }}>✦</span>
            <span className="gradient-text" style={{ fontSize: 20, fontWeight: 800 }}>SkillShare</span>
          </Link>
          <h1 style={{ fontSize: 20, fontWeight: 700 }}>Certificate Verification</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 4 }}>Code: <code style={{ color: 'var(--accent-secondary)', fontFamily: 'monospace' }}>{code}</code></p>
        </div>

        {loading && (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <div className="spin" style={{ fontSize: 32, display: 'inline-block' }}>⟳</div>
          </div>
        )}

        {error && (
          <div style={{ textAlign: 'center', padding: '32px 20px' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>❌</div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--accent-danger)', marginBottom: 8 }}>Invalid Certificate</h2>
            <p style={{ color: 'var(--text-secondary)' }}>{error}</p>
          </div>
        )}

        {result && (
          <div>
            {/* Valid/Invalid banner */}
            <div style={{
              textAlign: 'center',
              padding: '12px 20px',
              borderRadius: 'var(--radius-md)',
              marginBottom: 24,
              background: result.valid ? 'rgba(52,211,153,0.1)' : 'rgba(248,113,113,0.1)',
              border: `1px solid ${result.valid ? 'rgba(52,211,153,0.3)' : 'rgba(248,113,113,0.3)'}`,
              color: result.valid ? 'var(--accent-success)' : 'var(--accent-danger)',
              fontWeight: 700,
              fontSize: 15,
            }}>
              {result.valid ? '✅ This certificate is valid and authentic' : '❌ This certificate has been revoked'}
            </div>

            {result.valid && (
              <>
                {/* Certificate display */}
                <div className="certificate-card" style={{ marginBottom: 20 }}>
                  <div style={{ textAlign: 'center', marginBottom: 20 }}>
                    <div style={{ fontSize: 48 }}>🎓</div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                    {result.certificate.holder.avatar ? (
                      <img src={result.certificate.holder.avatar} alt="" className="avatar avatar-lg" />
                    ) : (
                      <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'var(--gradient-brand)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, fontWeight: 700 }}>
                        {result.certificate.holder.displayName[0]}
                      </div>
                    )}
                    <div>
                      <div style={{ fontSize: 20, fontWeight: 800 }}>{result.certificate.holder.displayName}</div>
                      <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>@{result.certificate.holder.username}</div>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                    {[
                      { label: 'Skill', value: result.certificate.skill },
                      { label: 'Category', value: result.certificate.category },
                      { label: 'Score', value: `${result.certificate.score}%` },
                      { label: 'Issued By', value: result.certificate.issuer.displayName },
                    ].map(item => (
                      <div key={item.label} style={{ background: 'var(--bg-secondary)', padding: '10px 12px', borderRadius: 'var(--radius-sm)' }}>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{item.label}</div>
                        <div style={{ fontWeight: 700, fontSize: 15 }}>{item.value}</div>
                      </div>
                    ))}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div style={{ background: 'var(--bg-secondary)', padding: '10px 12px', borderRadius: 'var(--radius-sm)' }}>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Issued</div>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>
                        {new Date(result.certificate.issuedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                      </div>
                    </div>
                    {result.certificate.expiresAt && (
                      <div style={{ background: 'var(--bg-secondary)', padding: '10px 12px', borderRadius: 'var(--radius-sm)' }}>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Expires</div>
                        <div style={{ fontWeight: 700, fontSize: 14 }}>
                          {new Date(result.certificate.expiresAt).toLocaleDateString()}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {result.certificate.pdfUrl && (
                  <a href={result.certificate.pdfUrl} target="_blank" rel="noreferrer" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
                    📄 Download Original Certificate
                  </a>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
