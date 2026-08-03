'use client';
import { useState, useEffect } from 'react';
import { motion, useAnimation, PanInfo } from 'framer-motion';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import toast from 'react-hot-toast';

interface MatchUser {
  _id: string;
  displayName: string;
  username: string;
  avatar: string;
  bio: string;
  skillsToTeach: string[];
  skillsToLearn: string[];
  isCreator: boolean;
  canTeachMeScore: number;
  wantToLearnFromMeScore: number;
  isPerfectMatch: boolean;
}

export default function DiscoverPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [cards, setCards] = useState<MatchUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMatches = async () => {
      try {
        const data = await api.get<MatchUser[]>('/api/users/matches');
        // Reverse so the best matches are at the END of the array (top of stack visually)
        setCards(data.reverse());
      } catch (err) {
        toast.error('Could not load matches');
      } finally {
        setLoading(false);
      }
    };
    if (user) fetchMatches();
  }, [user]);

  const removeCard = (id: string, swipe: 'left' | 'right') => {
    setCards((prev) => prev.filter((c) => c._id !== id));
    
    if (swipe === 'right') {
      const match = cards.find(c => c._id === id);
      if (match) {
        toast.success(`It's a match with ${match.displayName}!`);
        api.post('/api/messages/conversations', { targetUserId: id })
          .then(() => router.push('/messages'))
          .catch(() => toast.error('Could not start conversation'));
      }
    }
  };

  return (
    <AppLayout>
      <div style={{ maxWidth: 600, margin: '0 auto', padding: '40px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <h1 style={{ fontSize: 32, marginBottom: 8 }}>Skill Discover 🔥</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Swipe right to swap skills, swipe left to pass.</p>
        </div>

        <div style={{ position: 'relative', width: '100%', height: 480, display: 'flex', justifyContent: 'center' }}>
          {loading ? (
            <div className="skeleton" style={{ width: 340, height: 460, borderRadius: 'var(--radius-lg)' }} />
          ) : cards.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 80, color: 'var(--text-muted)' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>🤷‍♂️</div>
              No more matches right now.<br/>Update your skills to find more!
            </div>
          ) : (
            cards.map((card, index) => {
              const isTop = index === cards.length - 1;
              return (
                <SwipeCard 
                  key={card._id} 
                  card={card} 
                  isTop={isTop} 
                  onRemove={(swipe) => removeCard(card._id, swipe)} 
                />
              );
            })
          )}
        </div>
      </div>
    </AppLayout>
  );
}

function SwipeCard({ card, isTop, onRemove }: { card: MatchUser, isTop: boolean, onRemove: (swipe: 'left'|'right') => void }) {
  const controls = useAnimation();
  const [exitX, setExitX] = useState(0);

  const handleDragEnd = (event: any, info: PanInfo) => {
    const swipeThreshold = 100;
    if (info.offset.x > swipeThreshold) {
      setExitX(400);
      onRemove('right');
    } else if (info.offset.x < -swipeThreshold) {
      setExitX(-400);
      onRemove('left');
    } else {
      controls.start({ x: 0, y: 0, rotate: 0 });
    }
  };

  return (
    <motion.div
      drag={isTop ? 'x' : false}
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      onDragEnd={handleDragEnd}
      animate={controls}
      exit={{ x: exitX, opacity: 0, transition: { duration: 0.2 } }}
      style={{
        position: 'absolute',
        width: 340,
        height: 460,
        background: 'var(--bg-card)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: '0 20px 40px -12px rgba(0,0,0,0.15)',
        border: '1px solid var(--border-subtle)',
        overflow: 'hidden',
        cursor: isTop ? 'grab' : 'auto',
        display: 'flex',
        flexDirection: 'column',
        zIndex: isTop ? 10 : 1
      }}
      whileDrag={{ scale: 1.05, cursor: 'grabbing' }}
    >
      <div style={{ height: 220, position: 'relative', background: 'var(--bg-primary)' }}>
        {card.avatar ? (
          <img src={card.avatar} alt={card.displayName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} draggable={false} />
        ) : (
          <div style={{ width: '100%', height: '100%', background: 'var(--gradient-brand)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 64, fontWeight: 800, color: '#fff' }}>
            {card.displayName[0]}
          </div>
        )}
        {card.isPerfectMatch && (
          <div style={{ position: 'absolute', top: 12, right: 12, background: 'var(--accent-warning)', color: '#fff', padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700, boxShadow: 'var(--shadow-sm)' }}>
            ✨ Perfect Match
          </div>
        )}
      </div>

      <div style={{ padding: 20, flex: 1, display: 'flex', flexDirection: 'column' }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>{card.displayName}</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 16 }}>@{card.username}</p>
        
        {card.bio && <p className="truncate-2" style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 16 }}>{card.bio}</p>}

        <div style={{ flex: 1 }}>
          {card.skillsToTeach && card.skillsToTeach.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase' }}>Can Teach</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {card.skillsToTeach.slice(0, 3).map(s => <span key={s} className="badge badge-primary" style={{ fontSize: 11 }}>{s}</span>)}
              </div>
            </div>
          )}
          {card.skillsToLearn && card.skillsToLearn.length > 0 && (
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase' }}>Wants to Learn</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {card.skillsToLearn.slice(0, 3).map(s => <span key={s} className="badge badge-secondary" style={{ fontSize: 11 }}>{s}</span>)}
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
