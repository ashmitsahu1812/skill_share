/**
 * Email Service — Resend Integration
 * Handles session confirmation, reminder, and cancellation emails
 */

const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.EMAIL_FROM || 'noreply@skillshare.app';

/**
 * Send session-related emails
 * @param {string} type - 'booked' | 'confirmed' | 'cancelled' | 'reminder_24h' | 'reminder_1h'
 */
async function sendSessionEmail(type, session, creator, learner) {
  if (!process.env.RESEND_API_KEY) {
    console.log(`📧 Email skipped (no RESEND_API_KEY): ${type}`);
    return;
  }

  const sessionDate = new Date(session.scheduledAt);
  const dateStr = sessionDate.toLocaleString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long',
    day: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  const joinUrl = `${process.env.FRONTEND_URL}/sessions/${session._id}/join`;

  const templates = {
    booked: {
      to: [creator.email, learner.email],
      subject: `New session booked: ${session.skillTopic}`,
      html: emailTemplate({
        title: '🎓 Session Booked!',
        body: `
          <p>A new 1v1 session has been booked.</p>
          <p><strong>Topic:</strong> ${session.skillTopic}</p>
          <p><strong>Creator:</strong> ${creator.displayName}</p>
          <p><strong>Learner:</strong> ${learner.displayName}</p>
          <p><strong>Date:</strong> ${dateStr}</p>
          <p><strong>Duration:</strong> ${session.duration} minutes</p>
          ${session.notes ? `<p><strong>Notes:</strong> ${session.notes}</p>` : ''}
        `,
        cta: { label: 'View Session', url: `${process.env.FRONTEND_URL}/sessions/${session._id}` },
      }),
    },
    confirmed: {
      to: [learner.email],
      subject: `Your session is confirmed! 🎉`,
      html: emailTemplate({
        title: '✅ Session Confirmed',
        body: `
          <p>Your session with <strong>${creator.displayName}</strong> has been confirmed.</p>
          <p><strong>Date:</strong> ${dateStr}</p>
          <p>You'll receive a reminder 24 hours and 1 hour before the session.</p>
        `,
        cta: { label: 'Join Session', url: joinUrl },
      }),
    },
    cancelled: {
      to: [creator.email, learner.email],
      subject: `Session cancelled`,
      html: emailTemplate({
        title: '❌ Session Cancelled',
        body: `
          <p>The session <strong>"${session.skillTopic}"</strong> scheduled for ${dateStr} has been cancelled.</p>
        `,
      }),
    },
    reminder_24h: {
      to: [creator.email, learner.email],
      subject: `Reminder: Session tomorrow — ${session.skillTopic}`,
      html: emailTemplate({
        title: '⏰ Session Tomorrow',
        body: `<p>You have a session tomorrow at ${dateStr}.</p><p><strong>Topic:</strong> ${session.skillTopic}</p>`,
        cta: { label: 'Join Session', url: joinUrl },
      }),
    },
    reminder_1h: {
      to: [creator.email, learner.email],
      subject: `Your session starts in 1 hour!`,
      html: emailTemplate({
        title: '🚀 Session in 1 Hour',
        body: `<p>Your session starts in 1 hour at ${dateStr}.</p><p><strong>Topic:</strong> ${session.skillTopic}</p>`,
        cta: { label: 'Join Now', url: joinUrl },
      }),
    },
  };

  const tpl = templates[type];
  if (!tpl) return;

  try {
    await resend.emails.send({ from: FROM, to: tpl.to, subject: tpl.subject, html: tpl.html });
    console.log(`📧 Email sent: ${type} to ${tpl.to.join(', ')}`);
  } catch (err) {
    console.error(`📧 Email failed: ${type}`, err.message);
  }
}

/**
 * Send certificate award email
 */
async function sendCertificateEmail(holder, certificate, skill) {
  if (!process.env.RESEND_API_KEY) return;

  await resend.emails.send({
    from: FROM,
    to: [holder.email],
    subject: `🎓 You've earned a certificate in ${skill}!`,
    html: emailTemplate({
      title: '🎓 Certificate Earned!',
      body: `
        <p>Congratulations, <strong>${holder.displayName}</strong>!</p>
        <p>You've successfully passed the <strong>${skill}</strong> certification test with a score of <strong>${certificate.score}%</strong>.</p>
        <p>Your verification code: <code>${certificate.verificationCode}</code></p>
      `,
      cta: {
        label: 'View & Download Certificate',
        url: `${process.env.FRONTEND_URL}/certificates/${certificate._id}`,
      },
    }),
  });
}

/**
 * Simple HTML email template
 */
function emailTemplate({ title, body, cta }) {
  return `
<!DOCTYPE html>
<html>
<body style="font-family: -apple-system, sans-serif; background: #0f0f1a; color: #e0e0ff; padding: 40px 20px; margin: 0;">
  <div style="max-width: 560px; margin: 0 auto; background: #1a1a2e; border-radius: 16px; overflow: hidden; border: 1px solid #333366;">
    <div style="background: linear-gradient(135deg, #6c63ff, #a78bfa); padding: 32px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 24px;">${title}</h1>
    </div>
    <div style="padding: 32px;">
      <div style="color: #c0c0e0; line-height: 1.7; font-size: 15px;">${body}</div>
      ${cta ? `
      <div style="text-align: center; margin-top: 32px;">
        <a href="${cta.url}" style="display: inline-block; background: linear-gradient(135deg, #6c63ff, #a78bfa); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 15px;">${cta.label}</a>
      </div>
      ` : ''}
    </div>
    <div style="padding: 16px 32px; border-top: 1px solid #222244; text-align: center; color: #666688; font-size: 12px;">
      SkillShare Platform — <a href="${process.env.FRONTEND_URL}" style="color: #6c63ff;">Visit Platform</a>
    </div>
  </div>
</body>
</html>
  `;
}

module.exports = { sendSessionEmail, sendCertificateEmail };
