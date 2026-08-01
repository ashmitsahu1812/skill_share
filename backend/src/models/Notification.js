/**
 * Notification Model
 * In-app notification system
 */

const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  sender:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // null for system notifications

  type: {
    type: String,
    enum: [
      'follow',           // someone followed you
      'like',             // someone liked your post
      'comment',          // someone commented on your post
      'session_booked',   // someone booked a session with you
      'session_confirmed',// your session was confirmed
      'session_reminder', // upcoming session reminder
      'session_cancelled',// session was cancelled
      'session_completed',// session completed - rate it
      'certificate',      // you earned a certificate
      'new_post',         // someone you follow posted
      'test_available',   // a new test is available for a skill
    ],
    required: true,
  },

  // Dynamic references to linked content
  refModel: { type: String, enum: ['Post', 'Session', 'Certificate', 'Test', 'User'] },
  refId:    { type: mongoose.Schema.Types.ObjectId },

  // Content
  title:   { type: String, required: true, maxlength: 100 },
  message: { type: String, maxlength: 300 },

  isRead: { type: Boolean, default: false },
}, { timestamps: true });

notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
