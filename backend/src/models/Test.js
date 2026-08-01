/**
 * Test Model
 * AI-generated skill tests linked to creator posts
 */

const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  question:      { type: String, required: true },
  options:       [{ type: String, required: true }], // 4 options
  correctAnswer: { type: Number, required: true, min: 0, max: 3 }, // index into options
  explanation:   { type: String },
  difficulty:    { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },
});

const attemptSchema = new mongoose.Schema({
  user:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  answers:   [{ type: Number }], // user's selected option indexes
  score:     { type: Number, required: true }, // 0-100
  passed:    { type: Boolean, required: true },
  timeTaken: { type: Number }, // seconds
  completedAt: { type: Date, default: Date.now },
});

const testSchema = new mongoose.Schema({
  // Who created this test (via AI from their posts)
  creator:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  skill:    { type: String, required: true, trim: true },
  category: { type: String, required: true },

  // Source posts used for AI context
  sourcePosts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Post' }],

  // Test content
  title:       { type: String, required: true },
  description: { type: String, maxlength: 500 },
  questions:   [questionSchema],
  timeLimit:   { type: Number, default: 1800 }, // seconds (30 min)
  passingScore: { type: Number, default: 70 },  // percentage

  // Attempts by learners
  attempts: [attemptSchema],

  // Status
  isPublished: { type: Boolean, default: true },
  version:     { type: Number, default: 1 },
}, { timestamps: true });

testSchema.index({ creator: 1, skill: 1 });

module.exports = mongoose.model('Test', testSchema);
