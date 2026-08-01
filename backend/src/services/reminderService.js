/**
 * Session Reminder Cron Job
 * Runs every hour to send reminder emails for upcoming sessions.
 * Import and call startReminderCron() in index.js
 */

const cron = require('node-cron');
const Session = require('../models/Session');
const User = require('../models/User');
const { sendSessionEmail } = require('./emailService');
const { createNotification } = require('./notificationService');

function startReminderCron() {
  // Run every 30 minutes
  cron.schedule('*/30 * * * *', async () => {
    try {
      const now = new Date();

      // Find sessions needing 24h reminder
      const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const sessions24h = await Session.find({
        scheduledAt: { $gte: in24h, $lte: new Date(in24h.getTime() + 30 * 60 * 1000) },
        status: 'confirmed',
        reminder24hSent: false,
      }).populate('creator learner');

      for (const s of sessions24h) {
        await sendSessionEmail('reminder_24h', s, s.creator, s.learner);
        await createNotification({
          recipient: s.creator._id,
          type: 'session_reminder',
          title: `Session tomorrow: ${s.skillTopic}`,
          refModel: 'Session',
          refId: s._id,
        });
        await createNotification({
          recipient: s.learner._id,
          type: 'session_reminder',
          title: `Session tomorrow with ${s.creator.displayName}`,
          refModel: 'Session',
          refId: s._id,
        });
        s.reminder24hSent = true;
        await s.save();
      }

      // Find sessions needing 1h reminder
      const in1h = new Date(now.getTime() + 60 * 60 * 1000);
      const sessions1h = await Session.find({
        scheduledAt: { $gte: in1h, $lte: new Date(in1h.getTime() + 30 * 60 * 1000) },
        status: 'confirmed',
        reminder1hSent: false,
      }).populate('creator learner');

      for (const s of sessions1h) {
        await sendSessionEmail('reminder_1h', s, s.creator, s.learner);
        await createNotification({
          recipient: s.creator._id,
          type: 'session_reminder',
          title: `Session in 1 hour: ${s.skillTopic}`,
          refModel: 'Session',
          refId: s._id,
        });
        await createNotification({
          recipient: s.learner._id,
          type: 'session_reminder',
          title: `Session in 1 hour with ${s.creator.displayName}`,
          refModel: 'Session',
          refId: s._id,
        });
        s.reminder1hSent = true;
        await s.save();
      }

      // Mark completed sessions
      const completedSessions = await Session.find({
        scheduledAt: { $lte: now },
        status: 'confirmed',
      });

      for (const s of completedSessions) {
        const endTime = new Date(s.scheduledAt.getTime() + s.duration * 60000);
        if (now > endTime) {
          s.status = 'completed';
          await s.save();
          await User.findByIdAndUpdate(s.creator, { $inc: { totalSessions: 1 } });
        }
      }

      if (sessions24h.length > 0 || sessions1h.length > 0) {
        console.log(`⏰ Sent ${sessions24h.length} 24h reminders, ${sessions1h.length} 1h reminders`);
      }
    } catch (err) {
      console.error('Cron job error:', err.message);
    }
  });

  console.log('⏰ Session reminder cron job started');
}

module.exports = { startReminderCron };
