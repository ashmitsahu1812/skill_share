/**
 * Certificate Routes
 * GET /api/certificates/:id          — get certificate by ID
 * GET /api/certificates/verify/:code — public verification endpoint
 */

const express = require('express');
const router = express.Router();
const Certificate = require('../models/Certificate');
const { requireAuth } = require('../middleware/auth');

/**
 * GET /api/certificates/verify/:code — publicly verify a certificate
 */
router.get('/verify/:code', async (req, res, next) => {
  try {
    const cert = await Certificate.findOne({ verificationCode: req.params.code.toUpperCase() })
      .populate('holder', 'username displayName avatar')
      .populate('issuer', 'username displayName')
      .lean();

    if (!cert) return res.status(404).json({ error: 'Certificate not found or invalid code' });

    res.json({
      valid: cert.isValid,
      certificate: {
        holder: cert.holder,
        issuer: cert.issuer,
        skill: cert.skill,
        category: cert.category,
        score: cert.score,
        issuedAt: cert.issuedAt,
        expiresAt: cert.expiresAt,
        verificationCode: cert.verificationCode,
        pdfUrl: cert.pdfUrl,
      },
    });
  } catch (err) { next(err); }
});

/**
 * GET /api/certificates/:id — get a specific certificate (owner only)
 */
router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const cert = await Certificate.findById(req.params.id)
      .populate('holder', 'username displayName avatar')
      .populate('issuer', 'username displayName avatar')
      .populate('test', 'title skill')
      .lean();

    if (!cert) return res.status(404).json({ error: 'Certificate not found' });
    res.json(cert);
  } catch (err) { next(err); }
});

module.exports = router;
