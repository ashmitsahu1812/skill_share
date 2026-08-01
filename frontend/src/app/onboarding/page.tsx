'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';

const COMMON_SKILLS = [
  'React', 'Node.js', 'Python', 'UI/UX Design', 'TypeScript', 'Photography', 'SEO', 'Marketing', 'Data Science', 'Guitar'
];

export default function OnboardingPage() {
  const { user } = useAuth();
  const router = useRouter();
  
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [skillsToTeach, setSkillsToTeach] = useState<string[]>([]);
  const [skillsToLearn, setSkillsToLearn] = useState<string[]>([]);
  const [headline, setHeadline] = useState('');

  // If user already has skills, they shouldn't be here
  useEffect(() => {
    if (user && user.skillsToLearn && user.skillsToLearn.length > 0) {
      router.push('/');
    }
  }, [user, router]);

  const toggleSkill = (skill: string, type: 'teach' | 'learn') => {
    const arr = type === 'teach' ? skillsToTeach : skillsToLearn;
    const set = type === 'teach' ? setSkillsToTeach : setSkillsToLearn;
    
    if (arr.includes(skill)) {
      set(arr.filter(s => s !== skill));
    } else {
      if (arr.length >= 5) {
        toast.error('You can select up to 5 skills');
        return;
      }
      set([...arr, skill]);
    }
  };

  const handleComplete = async () => {
    if (skillsToLearn.length === 0) {
      toast.error('Please select at least one skill you want to learn');
      return;
    }

    setLoading(true);
    try {
      await api.put('/api/users/me', {
        headline,
        skillsToTeach,
        skillsToLearn,
        isCreator: skillsToTeach.length > 0
      });
      // Force reload to update user context across app
      window.location.href = '/';
    } catch (err) {
      toast.error('Failed to save profile');
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', background: 'var(--bg-primary)' }}>
      <div className="card" style={{ maxWidth: 560, width: '100%', padding: '40px', background: 'var(--bg-card)' }}>
        
        {/* Step Indicator */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 32 }}>
          {[1, 2, 3].map(s => (
            <div key={s} style={{ flex: 1, height: 4, borderRadius: 2, background: s <= step ? 'var(--accent-primary)' : 'var(--border-subtle)', transition: 'background 0.3s' }} />
          ))}
        </div>

        {step === 1 && (
          <div style={{ animation: 'fade-in 0.3s' }}>
            <h1 style={{ fontSize: 28, marginBottom: 8 }}>Welcome to SkillShare 👋</h1>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>Let's set up your profile so you can connect with the right people.</p>
            
            <label className="input-label">Headline (Optional)</label>
            <input 
              type="text" 
              className="input" 
              placeholder="e.g. Senior Frontend Engineer at TechCorp"
              value={headline}
              onChange={e => setHeadline(e.target.value)}
              style={{ marginBottom: 24 }}
            />
            <button className="btn btn-primary btn-lg" style={{ width: '100%' }} onClick={() => setStep(2)}>Next</button>
          </div>
        )}

        {step === 2 && (
          <div style={{ animation: 'fade-in 0.3s' }}>
            <h1 style={{ fontSize: 28, marginBottom: 8 }}>What do you know? 🧠</h1>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>Select up to 5 skills you're good at and could teach others.</p>
            
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 32 }}>
              {COMMON_SKILLS.map(skill => {
                const isSelected = skillsToTeach.includes(skill);
                return (
                  <button
                    key={skill}
                    onClick={() => toggleSkill(skill, 'teach')}
                    className={`btn ${isSelected ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ borderRadius: 20 }}
                  >
                    {skill}
                  </button>
                );
              })}
            </div>
            
            <div style={{ display: 'flex', gap: 12 }}>
              <button className="btn btn-ghost" onClick={() => setStep(1)}>Back</button>
              <button className="btn btn-primary btn-lg" style={{ flex: 1 }} onClick={() => setStep(3)}>Next</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div style={{ animation: 'fade-in 0.3s' }}>
            <h1 style={{ fontSize: 28, marginBottom: 8 }}>What do you want to learn? 🚀</h1>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>Select the skills you are trying to master right now.</p>
            
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 32 }}>
              {COMMON_SKILLS.map(skill => {
                const isSelected = skillsToLearn.includes(skill);
                return (
                  <button
                    key={skill}
                    onClick={() => toggleSkill(skill, 'learn')}
                    className={`btn ${isSelected ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ borderRadius: 20 }}
                  >
                    {skill}
                  </button>
                );
              })}
            </div>
            
            <div style={{ display: 'flex', gap: 12 }}>
              <button className="btn btn-ghost" onClick={() => setStep(2)}>Back</button>
              <button 
                className="btn btn-primary btn-lg" 
                style={{ flex: 1 }} 
                onClick={handleComplete}
                disabled={loading || skillsToLearn.length === 0}
              >
                {loading ? 'Setting up...' : 'Complete Setup'}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
