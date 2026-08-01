/**
 * Certificate Model
 * Digitally verifiable skill certificates issued after passing tests
 */

const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const certificateSchema = new mongoose.Schema({
  holder:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  issuer:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  test:       { type: mongoose.Schema.Types.ObjectId, ref: 'Test', required: true },

  // Content
  skill:      { type: String, required: true },
  category:   { type: String, required: true },
  score:      { type: Number, required: true }, // 0-100

  // Files
  pdfUrl:     { type: String },    // Cloudinary PDF URL
  pdfPublicId: { type: String },   // For deletion

  // Verification
  verificationCode: { type: String, unique: true, default: () => uuidv4().replace(/-/g, '').toUpperCase().slice(0, 16) },
  isValid:    { type: Boolean, default: true },

  // Dates
  issuedAt:   { type: Date, default: Date.now },
  expiresAt:  { type: Date }, // optional expiry
}, { timestamps: true });

certificateSchema.index({ verificationCode: 1 }, { unique: true });

module.exports = mongoose.model('Certificate', certificateSchema);
