'use client';
/**
 * AI Skill Test Page
 * Timed multiple-choice test with auto-grading and certificate issuance
 */

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import type { Test } from '@/types';
import toast from 'react-hot-toast';
import Link from 'next/link';

interface GradeResult {
  score: number;
  correct: number;
  total: number;
  passed: boolean;
  results: {
    question: string;
    userAnswer: number;
    correctAnswer: number;
    isCorrect: boolean;
    explanation: string;
  }[];
  certificate?: { _id: string; verificationCode: string; pdfUrl?: string };
}

export default function TestPage() {
  const { id } = useParams<{ id: string }>();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [test, setTest] = useState<Test | null>(null);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<GradeResult | null>(null);
  const [startTime] = useState(Date.now());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!authLoading && !user) router.replace('/login');
  }, [user, authLoading, router]);

  useEffect(() => {
    api.get<Test>(`/api/tests/${id}`)
      .then(t => {
        setTest(t);
        setAnswers(new Array(t.questions.length).fill(null));
        setTimeLeft(t.timeLimit);

        if (t.myAttempt?.passed) {
          // Already passed — show results
        } else {
          // Start timer
          timerRef.current = setInterval(() => {
            setTimeLeft(prev => {
              if (prev <= 1) {
                clearInterval(timerRef.current!);
                handleSubmit(t, new Array(t.questions.length).fill(null));
                return 0;
              }
              return prev - 1;
            });
          }, 1000);
        }
      })
      .catch(() => toast.error('Test not found'))
      .finally(() => setLoading(false));

    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [id]);

  const handleSubmit = async (t: Test = test!, ans: (number | null)[] = answers) => {
    if (timerRef.current) clearInterval(timerRef.current);
    setSubmitting(true);
    try {
      const res = await api.post<GradeResult>(`/api/tests/${id}/submit`, {
        answers: ans.map(a => a ?? -1),
        timeTaken: Math.floor((Date.now() - startTime) / 1000),
      });
      setResult(res);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  const formatTime = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  if (loading || authLoading) {
    return (
      <AppLayout>
        <div style={{ maxWidth: 680, margin: '0 auto', padding: '24px 16px' }}>
          <div className="skeleton" style={{ height: 400, borderRadius: 'var(--radius-lg)' }} />
        </div>
      </AppLayout>
    );
  }

  if (!test) return <AppLayout><div style={{ textAlign: 'center', padding: 80 }}>Test not found</div></AppLayout>;

  // Already passed
  if (test.myAttempt?.passed) {
    return (
      <AppLayout>
        <div style={{ maxWidth: 520, margin: '0 auto', padding: '24px 16px', textAlign: 'center' }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>🏆</div>
          <h1 style={{ fontSize: 26, fontWeight: 800, marginBottom: 8 }}>Already Certified!</h1>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>
            You passed this test with <strong>{test.myAttempt.score}%</strong>.
          </p>
          <Link href={`/profile/${user?.username}`} className="btn btn-primary">View Certificate</Link>
        </div>
      </AppLayout>
    );
  }

  // Results view
  if (result) {
    return (
      <AppLayout>
        <div style={{ maxWidth: 640, margin: '0 auto', padding: '24px 16px' }}>
          <div className="glass-card" style={{ padding: 32, textAlign: 'center', marginBottom: 24 }}>
            <div style={{ fontSize: 64, marginBottom: 12 }}>{result.passed ? '🎉' : '😔'}</div>
            <h1 style={{ fontSize: 26, fontWeight: 800, marginBottom: 8 }}>
              {result.passed ? 'You Passed!' : 'Not Quite'}
            </h1>
            <div style={{ fontSize: 48, fontWeight: 900, color: result.passed ? 'var(--accent-success)' : 'var(--accent-danger)', margin: '16px 0' }}>
              {result.score}%
            </div>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 16 }}>
              {result.correct} / {result.total} correct · Passing score: {test.passingScore}%
            </p>

            {result.passed && result.certificate && (
              <div style={{ background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.3)', borderRadius: 'var(--radius-md)', padding: 16, marginBottom: 20 }}>
                <div style={{ fontSize: 20, marginBottom: 8 }}>🎓</div>
                <p style={{ fontWeight: 700, marginBottom: 4 }}>Certificate Issued!</p>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>Code: {result.certificate.verificationCode}</p>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
                  {result.certificate.pdfUrl && (
                    <a href={result.certificate.pdfUrl} target="_blank" rel="noreferrer" className="btn btn-primary btn-sm">
                      📄 Download PDF
                    </a>
                  )}
                  <Link href={`/verify/${result.certificate.verificationCode}`} className="btn btn-secondary btn-sm">
                    Verify →
                  </Link>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              {!result.passed && <button className="btn btn-primary" onClick={() => window.location.reload()}>Try Again</button>}
              <Link href={`/profile/${user?.username}`} className="btn btn-secondary">My Profile</Link>
            </div>
          </div>

          {/* Review answers */}
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Question Review</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {result.results.map((r, i) => (
              <div key={i} className="glass-card" style={{ padding: 20, borderLeft: `4px solid ${r.isCorrect ? 'var(--accent-success)' : 'var(--accent-danger)'}` }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 12 }}>
                  <span style={{ color: r.isCorrect ? 'var(--accent-success)' : 'var(--accent-danger)', fontSize: 18, flexShrink: 0 }}>
                    {r.isCorrect ? '✓' : '✗'}
                  </span>
                  <p style={{ fontWeight: 600, fontSize: 15 }}>Q{i+1}: {r.question}</p>
                </div>
                {test.questions[i] && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
                    {test.questions[i].options.map((opt, j) => (
                      <div
                        key={j}
                        style={{
                          padding: '8px 12px',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: 13,
                          background: j === r.correctAnswer ? 'rgba(52,211,153,0.15)' : j === r.userAnswer && !r.isCorrect ? 'rgba(248,113,113,0.15)' : 'var(--bg-secondary)',
                          border: `1px solid ${j === r.correctAnswer ? 'rgba(52,211,153,0.4)' : j === r.userAnswer && !r.isCorrect ? 'rgba(248,113,113,0.4)' : 'var(--border-subtle)'}`,
                          color: j === r.correctAnswer ? 'var(--accent-success)' : j === r.userAnswer && !r.isCorrect ? 'var(--accent-danger)' : 'var(--text-secondary)',
                        }}
                      >
                        {opt}
                      </div>
                    ))}
                  </div>
                )}
                {r.explanation && (
                  <p style={{ fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic' }}>💡 {r.explanation}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </AppLayout>
    );
  }

  const q = test.questions[currentQ];
  const progress = ((currentQ) / test.questions.length) * 100;
  const answeredCount = answers.filter(a => a !== null).length;

  return (
    <AppLayout>
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '24px 16px' }}>
        {/* Test header */}
        <div className="glass-card" style={{ padding: 20, marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
            <div>
              <h1 style={{ fontSize: 18, fontWeight: 800, marginBottom: 4 }}>{test.title}</h1>
              <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>by {test.creator?.displayName}</p>
            </div>
            <div style={{
              fontSize: 18, fontWeight: 800,
              color: timeLeft < 300 ? 'var(--accent-danger)' : 'var(--accent-secondary)',
              background: 'var(--bg-secondary)',
              padding: '8px 14px',
              borderRadius: 'var(--radius-md)',
              fontVariantNumeric: 'tabular-nums',
            }}>
              ⏱ {formatTime(timeLeft)}
            </div>
          </div>

          {/* Progress bar */}
          <div style={{ height: 6, background: 'var(--bg-secondary)', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${progress}%`, background: 'var(--gradient-brand)', transition: 'width var(--transition-normal)', borderRadius: 3 }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 12, color: 'var(--text-muted)' }}>
            <span>Q{currentQ + 1} of {test.questions.length}</span>
            <span>{answeredCount} answered</span>
          </div>
        </div>

        {/* Question */}
        <div className="glass-card" style={{ padding: 28, marginBottom: 20 }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <span className={`badge ${q.difficulty === 'easy' ? 'badge-success' : q.difficulty === 'medium' ? 'badge-warning' : 'badge-danger'}`}>
              {q.difficulty}
            </span>
          </div>
          <p style={{ fontSize: 17, fontWeight: 600, lineHeight: 1.6, marginBottom: 24 }}>{q.question}</p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {q.options.map((option, i) => (
              <button
                key={i}
                className={`option-btn ${answers[currentQ] === i ? 'selected' : ''}`}
                onClick={() => setAnswers(prev => { const n = [...prev]; n[currentQ] = i; return n; })}
              >
                <span style={{ fontWeight: 700, marginRight: 8, color: 'var(--accent-primary)' }}>
                  {['A', 'B', 'C', 'D'][i]}.
                </span>
                {option}
              </button>
            ))}
          </div>
        </div>

        {/* Navigation */}
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <button
            className="btn btn-ghost"
            onClick={() => setCurrentQ(prev => Math.max(0, prev - 1))}
            disabled={currentQ === 0}
          >
            ← Prev
          </button>

          {/* Question pills */}
          <div style={{ flex: 1, display: 'flex', gap: 4, flexWrap: 'wrap', justifyContent: 'center' }}>
            {test.questions.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentQ(i)}
                style={{
                  width: 28, height: 28,
                  borderRadius: '50%',
                  border: `1px solid ${i === currentQ ? 'var(--accent-primary)' : answers[i] !== null ? 'var(--accent-success)' : 'var(--border-subtle)'}`,
                  background: i === currentQ ? 'var(--gradient-brand)' : answers[i] !== null ? 'rgba(52,211,153,0.2)' : 'var(--bg-secondary)',
                  color: '#fff',
                  fontSize: 11, fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {i + 1}
              </button>
            ))}
          </div>

          {currentQ < test.questions.length - 1 ? (
            <button className="btn btn-primary" onClick={() => setCurrentQ(prev => Math.min(test.questions.length - 1, prev + 1))}>
              Next →
            </button>
          ) : (
            <button
              className="btn btn-primary"
              onClick={() => handleSubmit()}
              disabled={submitting}
            >
              {submitting ? 'Grading...' : `Submit (${answeredCount}/${test.questions.length})`}
            </button>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
