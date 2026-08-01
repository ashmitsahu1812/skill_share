'use client';
/**
 * Booking Modal
 * Shows creator availability calendar and time slot selection for booking a session
 */

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import type { User } from '@/types';
import toast from 'react-hot-toast';
import { format, addDays, startOfDay, parseISO } from 'date-fns';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import CheckoutForm from '../CheckoutForm';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '');

interface BookingModalProps {
  creator: User;
  onClose: () => void;
  onBooked: () => void;
}

interface AvailabilityData {
  availability: { day: string; slots: { start: string; end: string }[] }[];
  bookedSlots: { scheduledAt: string; duration: number }[];
  sessionDuration: number;
}

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function BookingModal({ creator, onClose, onBooked }: BookingModalProps) {
  const { user } = useAuth();
  const [availability, setAvailability] = useState<AvailabilityData | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [skillTopic, setSkillTopic] = useState('');
  const [notes, setNotes] = useState('');
  const [booking, setBooking] = useState(false);
  const [step, setStep] = useState<'date' | 'slot' | 'confirm' | 'payment'>('date');
  const [clientSecret, setClientSecret] = useState('');
  const [createdSessionId, setCreatedSessionId] = useState('');

  // Show 14 days from tomorrow
  const dates = Array.from({ length: 14 }, (_, i) => addDays(startOfDay(new Date()), i + 1));

  useEffect(() => {
    api.get<AvailabilityData>(`/api/users/${creator._id}/availability`)
      .then(setAvailability)
      .catch(() => toast.error('Could not load availability'));
  }, [creator._id]);

  const getSlotsForDate = (date: Date) => {
    if (!availability) return [];
    const dayName = DAYS[date.getDay()];
    const dayAvail = availability.availability.find(a => a.day === dayName);
    if (!dayAvail) return [];

    // Generate hourly slots within each availability range
    const slots: string[] = [];
    for (const range of dayAvail.slots) {
      const [sh, sm] = range.start.split(':').map(Number);
      const [eh, em] = range.end.split(':').map(Number);
      let cur = sh * 60 + sm;
      const end = eh * 60 + em - availability.sessionDuration;

      while (cur <= end) {
        const h = Math.floor(cur / 60);
        const m = cur % 60;
        const timeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        const dt = new Date(date);
        dt.setHours(h, m, 0, 0);

        // Check if slot is already booked
        const isBooked = availability.bookedSlots.some(bs => {
          const bsDate = new Date(bs.scheduledAt);
          return Math.abs(bsDate.getTime() - dt.getTime()) < bs.duration * 60000;
        });

        if (!isBooked) slots.push(timeStr);
        cur += availability.sessionDuration;
      }
    }
    return slots;
  };

  const handleBook = async () => {
    if (!selectedDate || !selectedSlot || !skillTopic.trim()) {
      toast.error('Please fill in all fields');
      return;
    }

    const [h, m] = selectedSlot.split(':').map(Number);
    const scheduledAt = new Date(selectedDate);
    scheduledAt.setHours(h, m, 0, 0);

    setBooking(true);
    try {
      const { session } = await api.post<{ session: { _id: string } }>('/api/sessions', {
        creatorId: creator._id,
        scheduledAt: scheduledAt.toISOString(),
        skillTopic: skillTopic.trim(),
        notes: notes.trim(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });

      if (creator.sessionRate > 0) {
        // Fetch payment intent client secret
        const { clientSecret: secret } = await api.post<{ clientSecret: string }>('/api/payments/create-intent', {
          sessionId: session._id,
        });
        setClientSecret(secret);
        setCreatedSessionId(session._id);
        setStep('payment');
      } else {
        onBooked();
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Booking failed');
    } finally {
      setBooking(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()} role="dialog" aria-modal="true" aria-labelledby="booking-title">
      <div className="modal" style={{ maxWidth: 520 }}>
        {/* Header */}
        <div style={{ padding: '24px 24px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 id="booking-title" style={{ fontSize: 20, fontWeight: 800 }}>Book a Session</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>
              with <strong>{creator.displayName}</strong>
              {creator.sessionRate > 0 ? ` · $${(creator.sessionRate / 100).toFixed(0)}/session` : ' · Free'}
            </p>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div style={{ padding: 24 }}>
          {/* Step indicator */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
            {(['date', 'slot', 'confirm', ...(creator.sessionRate > 0 ? ['payment'] : [])] as const).map((s, i, arr) => (
              <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%',
                  background: step === s ? 'var(--gradient-brand)' : (i < arr.indexOf(step as any) ? 'var(--accent-success)' : 'var(--bg-secondary)'),
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 13, fontWeight: 700, color: '#fff',
                }}>
                  {i < arr.indexOf(step as any) ? '✓' : i + 1}
                </div>
                <span style={{ fontSize: 13, color: step === s ? 'var(--text-primary)' : 'var(--text-muted)', textTransform: 'capitalize' }}>{s}</span>
                {i < arr.length - 1 && <div style={{ width: 24, height: 1, background: 'var(--border-subtle)' }} />}
              </div>
            ))}
          </div>

          {/* Step 1: Date */}
          {step === 'date' && (
            <div>
              <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>Select a date</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6 }}>
                {dates.map(date => {
                  const slots = getSlotsForDate(date);
                  const hasSlots = slots.length > 0;
                  const isSelected = selectedDate?.toDateString() === date.toDateString();
                  return (
                    <button
                      key={date.toISOString()}
                      disabled={!hasSlots}
                      onClick={() => { setSelectedDate(date); setStep('slot'); }}
                      style={{
                        padding: '10px 6px',
                        background: isSelected ? 'var(--gradient-brand)' : hasSlots ? 'var(--bg-secondary)' : 'transparent',
                        border: `1px solid ${isSelected ? 'transparent' : hasSlots ? 'var(--border-subtle)' : 'var(--border-subtle)'}`,
                        borderRadius: 'var(--radius-md)',
                        cursor: hasSlots ? 'pointer' : 'not-allowed',
                        opacity: hasSlots ? 1 : 0.3,
                        textAlign: 'center',
                        transition: 'all var(--transition-fast)',
                      }}
                    >
                      <div style={{ fontSize: 10, color: isSelected ? 'rgba(255,255,255,0.7)' : 'var(--text-muted)', textTransform: 'uppercase' }}>
                        {format(date, 'EEE')}
                      </div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: isSelected ? '#fff' : 'var(--text-primary)' }}>
                        {format(date, 'd')}
                      </div>
                      <div style={{ fontSize: 9, color: isSelected ? 'rgba(255,255,255,0.6)' : 'var(--accent-success)', marginTop: 2 }}>
                        {hasSlots ? `${slots.length} slots` : '—'}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 2: Time slot */}
          {step === 'slot' && selectedDate && (
            <div>
              <button className="btn btn-ghost btn-sm" onClick={() => setStep('date')} style={{ marginBottom: 12 }}>
                ← {format(selectedDate, 'MMMM d')}
              </button>
              <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>Choose a time slot</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                {getSlotsForDate(selectedDate).map(slot => (
                  <button
                    key={slot}
                    onClick={() => { setSelectedSlot(slot); setStep('confirm'); }}
                    className={selectedSlot === slot ? 'btn btn-primary' : 'btn btn-ghost'}
                    style={{ justifyContent: 'center' }}
                  >
                    {slot}
                  </button>
                ))}
              </div>
              {availability && (
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 12 }}>
                  Duration: {availability.sessionDuration} minutes per session
                </p>
              )}
            </div>
          )}

          {/* Step 3: Confirm */}
          {step === 'confirm' && selectedDate && selectedSlot && (
            <div>
              <button className="btn btn-ghost btn-sm" onClick={() => setStep('slot')} style={{ marginBottom: 16 }}>
                ← Change time
              </button>

              <div style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', padding: 16, marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ color: 'var(--text-muted)' }}>Date</span>
                  <strong>{format(selectedDate, 'MMMM d, yyyy')}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ color: 'var(--text-muted)' }}>Time</span>
                  <strong>{selectedSlot}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Price</span>
                  <strong>{creator.sessionRate > 0 ? `$${(creator.sessionRate/100).toFixed(2)}` : 'Free'}</strong>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label className="input-label">Skill Topic *</label>
                  <input
                    className="input"
                    type="text"
                    placeholder="What do you want to learn?"
                    value={skillTopic}
                    onChange={e => setSkillTopic(e.target.value)}
                    maxLength={200}
                    required
                  />
                </div>
                <div>
                  <label className="input-label">Notes (optional)</label>
                  <textarea
                    className="input"
                    placeholder="Any specific questions or goals..."
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    maxLength={1000}
                    rows={3}
                    style={{ resize: 'vertical' }}
                  />
                </div>
                <button
                  className="btn btn-primary btn-lg"
                  onClick={handleBook}
                  disabled={booking || !skillTopic.trim()}
                  style={{ marginTop: 8 }}
                >
                  {booking ? 'Processing...' : creator.sessionRate > 0 ? `Continue to Payment ($${(creator.sessionRate/100).toFixed(2)})` : 'Confirm Booking (Free)'}
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Payment */}
          {step === 'payment' && clientSecret && (
            <div>
              <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>Complete Payment</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 16 }}>
                You are paying ${ (creator.sessionRate / 100).toFixed(2) } to book this session.
              </p>
              <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: 'night' } }}>
                <CheckoutForm onSuccess={onBooked} />
              </Elements>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
