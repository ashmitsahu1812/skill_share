/**
 * Session Model
 * 1v1 booking sessions between creators and learners
 */

const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
  creator:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  learner:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },

  // Scheduling
  scheduledAt: { type: Date, required: true },
  duration:    { type: Number, required: true, default: 60 }, // minutes
  timezone:    { type: String, default: 'UTC' },

  // Status lifecycle: pending → confirmed → completed | cancelled
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'completed', 'cancelled', 'no_show'],
    default: 'pending',
  },

  // Video call
  jitsiRoomId:  { type: String }, // unique room name for Jitsi Meet
  jitsiRoomUrl: { type: String }, // full URL for the room

  // Content
  skillTopic: { type: String, required: true, maxlength: 200 },
  notes:      { type: String, maxlength: 1000 },

  // Payment
  price:         { type: Number, default: 0 }, // USD cents
  paymentStatus: { type: String, enum: ['free', 'pending', 'paid', 'refunded'], default: 'free' },
  stripePaymentIntentId: { type: String },

  // Post-session
  creatorRating:  { type: Number, min: 1, max: 5 },
  learnerRating:  { type: Number, min: 1, max: 5 },
  creatorReview:  { type: String, maxlength: 500 },
  learnerReview:  { type: String, maxlength: 500 },

  // Reminders sent
  reminder24hSent: { type: Boolean, default: false },
  reminder1hSent:  { type: Boolean, default: false },
}, { timestamps: true });

sessionSchema.index({ scheduledAt: 1, status: 1 });

module.exports = mongoose.model('Session', sessionSchema);
