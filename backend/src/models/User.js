/**
 * User Model
 * Represents a registered platform user (creator or learner)
 */

const mongoose = require('mongoose');

const availabilitySlotSchema = new mongoose.Schema({
  day: {
    type: String,
    enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
    required: true,
  },
  slots: [{
    start: { type: String, required: true }, // "09:00"
    end:   { type: String, required: true }, // "10:00"
  }],
});

const userSchema = new mongoose.Schema({
  firebaseUid: { type: String, required: true, unique: true, index: true },
  username:    { type: String, required: true, unique: true, trim: true, lowercase: true, minlength: 3, maxlength: 30 },
  displayName: { type: String, required: true, trim: true, maxlength: 60 },
  email:       { type: String, required: true, unique: true, lowercase: true },
  avatar:      { type: String, default: '' },
  bio:         { type: String, maxlength: 300, default: '' },

  // Skills & categories the user teaches/showcases
  skillsToTeach: [{ type: String, trim: true }],
  skillsToLearn: [{ type: String, trim: true }],
  categories: [{
    type: String,
    enum: [
      'Programming & Tech',
      'Design & Creative Arts',
      'Music & Audio Production',
      'Cooking & Culinary',
      'Fitness & Wellness',
      'Languages & Communication',
      'Finance & Business',
      'Photography & Videography',
      'Other',
    ],
  }],

  // Social graph
  followers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  following: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

  // Creator settings
  isCreator:    { type: Boolean, default: false },
  sessionRate:  { type: Number, default: 0, min: 0 },   // 0 = free, > 0 = price in USD cents
  sessionDuration: { type: Number, default: 60 },        // minutes
  availability: [availabilitySlotSchema],

  // Gamification
  certificates: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Certificate' }],
  totalSessions: { type: Number, default: 0 },
  rating: { type: Number, default: 0, min: 0, max: 5 },
  ratingCount: { type: Number, default: 0 },

  // Account
  isVerified: { type: Boolean, default: false },
  stripeCustomerId: { type: String },
  stripeAccountId:  { type: String }, // for creators receiving payments
}, { timestamps: true });

// Virtual: follower count
userSchema.virtual('followerCount').get(function () {
  return this.followers.length;
});

// Virtual: following count
userSchema.virtual('followingCount').get(function () {
  return this.following.length;
});

userSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('User', userSchema);
