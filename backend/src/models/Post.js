/**
 * Post Model
 * Skill showcase posts with media, likes, and comments
 */

const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  user:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text:    { type: String, required: true, maxlength: 500 },
  likes:   [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
}, { timestamps: true });

const postSchema = new mongoose.Schema({
  author:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title:     { type: String, required: true, trim: true, maxlength: 100 },
  description: { type: String, maxlength: 2000, default: '' },

  // Media
  mediaUrl:  { type: String, required: true },
  mediaType: { type: String, enum: ['image', 'video'], required: true },
  thumbnailUrl: { type: String, default: '' }, // for video thumbnails

  // Categorisation
  category: {
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
    required: true,
  },
  tags: [{ type: String, trim: true, lowercase: true }],
  skillLevel: {
    type: String,
    enum: ['Beginner', 'Intermediate', 'Advanced', 'Expert'],
    default: 'Beginner',
  },

  // Engagement
  likes:    [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  comments: [commentSchema],
  views:    { type: Number, default: 0 },
  saves:    [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

  // AI Test linkage
  hasTest: { type: Boolean, default: false },
  testId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Test' },
}, { timestamps: true });

// Text search index
postSchema.index({ title: 'text', description: 'text', tags: 'text' });
postSchema.index({ category: 1, createdAt: -1 });
postSchema.index({ author: 1, createdAt: -1 });

// Virtual: like count
postSchema.virtual('likeCount').get(function () {
  return this.likes.length;
});

// Virtual: comment count
postSchema.virtual('commentCount').get(function () {
  return this.comments.length;
});

postSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Post', postSchema);
