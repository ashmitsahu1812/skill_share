/**
 * Payment Routes — Stripe Integration
 * POST /api/payments/create-intent   — create a payment intent for a session
 * POST /api/payments/webhook         — Stripe webhook handler
 */

const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Session = require('../models/Session');
const User = require('../models/User');
const { requireAuth } = require('../middleware/auth');
const { createNotification } = require('../services/notificationService');

/**
 * POST /api/payments/create-intent
 * Creates a Stripe payment intent for a session booking
 */
router.post('/create-intent', requireAuth, async (req, res, next) => {
  try {
    const { sessionId } = req.body;
    const session = await Session.findById(sessionId).populate('creator learner');

    if (!session) return res.status(404).json({ error: 'Session not found' });
    if (session.price === 0) return res.status(400).json({ error: 'Session is free' });
    if (session.paymentStatus === 'paid') return res.status(400).json({ error: 'Already paid' });

    const me = await User.findOne({ firebaseUid: req.firebaseUser.uid });
    if (!session.learner._id.equals(me._id)) return res.status(403).json({ error: 'Not the learner' });

    const paymentIntent = await stripe.paymentIntents.create({
      amount: session.price, // already in cents
      currency: 'usd',
      metadata: {
        sessionId: session._id.toString(),
        learnerId: session.learner._id.toString(),
        creatorId: session.creator._id.toString(),
      },
      description: `SkillShare session: ${session.skillTopic}`,
    });

    // Save payment intent ID
    session.stripePaymentIntentId = paymentIntent.id;
    await session.save();

    res.json({ clientSecret: paymentIntent.client_secret });
  } catch (err) { next(err); }
});

/**
 * POST /api/payments/webhook — Stripe webhook events
 * Note: must use express.raw() for this route (configured in index.js)
 */
router.post('/webhook', async (req, res) => {
  const sig = req.headers['stripe-signature'];

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Stripe webhook signature verification failed:', err.message);
    return res.status(400).json({ error: err.message });
  }

  switch (event.type) {
    case 'payment_intent.succeeded': {
      const { sessionId } = event.data.object.metadata;
      const session = await Session.findByIdAndUpdate(
        sessionId,
        { paymentStatus: 'paid', status: 'confirmed' },
        { new: true }
      ).populate('creator learner');

      if (session) {
        await createNotification({
          recipient: session.creator._id,
          type: 'session_confirmed',
          title: `Payment received for session with ${session.learner.displayName}`,
          refModel: 'Session',
          refId: session._id,
        });
      }
      break;
    }

    case 'payment_intent.payment_failed': {
      const { sessionId } = event.data.object.metadata;
      await Session.findByIdAndUpdate(sessionId, { status: 'cancelled' });
      break;
    }
  }

  res.json({ received: true });
});

module.exports = router;
