/**
 * Session Routes
 * POST   /api/sessions              — book a session
 * GET    /api/sessions/mine         — my sessions (as creator or learner)
 * GET    /api/sessions/:id          — single session details
 * PUT    /api/sessions/:id/confirm  — creator confirms a booking
 * DELETE /api/sessions/:id          — cancel session
 * GET    /api/sessions/:id/join     — get Jitsi room URL to join
 * POST   /api/sessions/:id/review   — post-session review
 */

const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const Session = require('../models/Session');
const User = require('../models/User');
const { requireAuth } = require('../middleware/auth');
const { createNotification } = require('../services/notificationService');
const { sendSessionEmail } = require('../services/emailService');

/**
 * Generate a Jitsi Meet room — no API key needed, just a unique room name
 */
function createJitsiRoom() {
  const roomId = `skillshare-${uuidv4().replace(/-/g, '').slice(0, 16)}`;
  const roomUrl = `https://meet.jit.si/${roomId}`;
  return { roomId, roomUrl };
}

/**
 * POST /api/sessions — book a new session
 */
router.post('/', requireAuth, async (req, res, next) => {
  try {
    const { creatorId, scheduledAt, skillTopic, notes, timezone } = req.body;

    const [learner, creator] = await Promise.all([
      User.findOne({ firebaseUid: req.firebaseUser.uid }),
      User.findById(creatorId),
    ]);

    if (!learner || !creator) return res.status(404).json({ error: 'User not found' });
    if (learner._id.equals(creator._id)) return res.status(400).json({ error: 'Cannot book yourself' });

    // Validate scheduled time is in the future
    const sessionDate = new Date(scheduledAt);
    if (sessionDate <= new Date()) return res.status(400).json({ error: 'Session must be scheduled in the future' });

    // Check for conflicts (creator already has a session at this time)
    const conflict = await Session.findOne({
      creator: creatorId,
      scheduledAt: {
        $gte: new Date(sessionDate.getTime() - creator.sessionDuration * 60000),
        $lte: new Date(sessionDate.getTime() + creator.sessionDuration * 60000),
      },
      status: { $in: ['pending', 'confirmed'] },
    });
    if (conflict) return res.status(409).json({ error: 'Creator is not available at this time' });

    const { roomId, roomUrl } = createJitsiRoom();

    const session = await Session.create({
      creator: creator._id,
      learner: learner._id,
      scheduledAt: sessionDate,
      duration: creator.sessionDuration,
      timezone: timezone || 'UTC',
      skillTopic,
      notes: notes || '',
      jitsiRoomId: roomId,
      jitsiRoomUrl: roomUrl,
      price: creator.sessionRate,
      paymentStatus: creator.sessionRate > 0 ? 'pending' : 'free',
    });

    await session.populate(['creator', 'learner']);

    // Notify creator
    await createNotification({
      recipient: creator._id,
      sender: learner._id,
      type: 'session_booked',
      title: `${learner.displayName} booked a session with you`,
      message: `Topic: ${skillTopic}`,
      refModel: 'Session',
      refId: session._id,
    });

    // Send confirmation emails
    await sendSessionEmail('booked', session, creator, learner);

    res.status(201).json(session);
  } catch (err) { next(err); }
});

/**
 * GET /api/sessions/mine?role=creator|learner&status=
 */
router.get('/mine', requireAuth, async (req, res, next) => {
  try {
    const { role, status } = req.query;
    const me = await User.findOne({ firebaseUid: req.firebaseUser.uid }).select('_id').lean();
    if (!me) return res.status(404).json({ error: 'User not found' });

    const query = {};
    if (role === 'creator') query.creator = me._id;
    else if (role === 'learner') query.learner = me._id;
    else query.$or = [{ creator: me._id }, { learner: me._id }];

    if (status) query.status = status;

    const sessions = await Session.find(query)
      .populate('creator', 'username displayName avatar sessionRate')
      .populate('learner', 'username displayName avatar')
      .sort({ scheduledAt: 1 })
      .lean();

    res.json(sessions);
  } catch (err) { next(err); }
});

/**
 * GET /api/sessions/:id
 */
router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const session = await Session.findById(req.params.id)
      .populate('creator', 'username displayName avatar bio sessionRate')
      .populate('learner', 'username displayName avatar');

    if (!session) return res.status(404).json({ error: 'Session not found' });

    const me = await User.findOne({ firebaseUid: req.firebaseUser.uid }).select('_id').lean();
    const isParticipant = session.creator._id.equals(me._id) || session.learner._id.equals(me._id);
    if (!isParticipant) return res.status(403).json({ error: 'Access denied' });

    res.json(session);
  } catch (err) { next(err); }
});

/**
 * PUT /api/sessions/:id/confirm — creator confirms session
 */
router.put('/:id/confirm', requireAuth, async (req, res, next) => {
  try {
    const me = await User.findOne({ firebaseUid: req.firebaseUser.uid });
    const session = await Session.findById(req.params.id).populate('learner creator');

    if (!session) return res.status(404).json({ error: 'Session not found' });
    if (!session.creator._id.equals(me._id)) return res.status(403).json({ error: 'Only the creator can confirm' });
    if (session.status !== 'pending') return res.status(400).json({ error: 'Session is not pending' });

    session.status = 'confirmed';
    await session.save();

    await createNotification({
      recipient: session.learner._id,
      sender: me._id,
      type: 'session_confirmed',
      title: `Your session with ${me.displayName} is confirmed!`,
      message: `Scheduled for ${session.scheduledAt.toLocaleString()}`,
      refModel: 'Session',
      refId: session._id,
    });

    await sendSessionEmail('confirmed', session, session.creator, session.learner);
    res.json(session);
  } catch (err) { next(err); }
});

/**
 * DELETE /api/sessions/:id — cancel session
 */
router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    const me = await User.findOne({ firebaseUid: req.firebaseUser.uid });
    const session = await Session.findById(req.params.id).populate('creator learner');

    if (!session) return res.status(404).json({ error: 'Session not found' });

    const isParticipant = session.creator._id.equals(me._id) || session.learner._id.equals(me._id);
    if (!isParticipant) return res.status(403).json({ error: 'Access denied' });

    session.status = 'cancelled';
    await session.save();

    // Notify the other party
    const other = session.creator._id.equals(me._id) ? session.learner : session.creator;
    await createNotification({
      recipient: other._id,
      sender: me._id,
      type: 'session_cancelled',
      title: `Session cancelled by ${me.displayName}`,
      refModel: 'Session',
      refId: session._id,
    });

    await sendSessionEmail('cancelled', session, session.creator, session.learner);
    res.json({ message: 'Session cancelled' });
  } catch (err) { next(err); }
});

/**
 * GET /api/sessions/:id/join — get the Jitsi room URL
 */
router.get('/:id/join', requireAuth, async (req, res, next) => {
  try {
    const me = await User.findOne({ firebaseUid: req.firebaseUser.uid }).select('_id displayName').lean();
    const session = await Session.findById(req.params.id);

    if (!session) return res.status(404).json({ error: 'Session not found' });

    const isParticipant = session.creator.equals(me._id) || session.learner.equals(me._id);
    if (!isParticipant) return res.status(403).json({ error: 'Access denied' });
    if (session.status === 'cancelled') return res.status(400).json({ error: 'Session is cancelled' });

    // Allow joining 15 min before scheduled time
    const now = new Date();
    const canJoinAt = new Date(session.scheduledAt.getTime() - 15 * 60000);
    if (now < canJoinAt) {
      return res.status(400).json({
        error: 'Too early to join. You can join 15 minutes before the session.',
        canJoinAt,
      });
    }

    res.json({ roomUrl: session.jitsiRoomUrl, roomId: session.jitsiRoomId });
  } catch (err) { next(err); }
});

/**
 * POST /api/sessions/:id/review — submit post-session review
 */
router.post('/:id/review', requireAuth, async (req, res, next) => {
  try {
    const { rating, review } = req.body;
    const me = await User.findOne({ firebaseUid: req.firebaseUser.uid });
    const session = await Session.findById(req.params.id);

    if (!session) return res.status(404).json({ error: 'Session not found' });
    if (session.status !== 'completed') return res.status(400).json({ error: 'Session not completed' });

    const isCreator = session.creator.equals(me._id);
    const isLearner = session.learner.equals(me._id);

    if (isCreator) {
      session.creatorRating = rating;
      session.creatorReview = review;
    } else if (isLearner) {
      session.learnerRating = rating;
      session.learnerReview = review;

      // Update creator's average rating
      const creator = await User.findById(session.creator);
      if (creator) {
        const total = creator.ratingCount * creator.rating + Number(rating);
        creator.ratingCount += 1;
        creator.rating = Math.round((total / creator.ratingCount) * 10) / 10;
        await creator.save();
      }
    } else {
      return res.status(403).json({ error: 'Access denied' });
    }

    await session.save();
    res.json({ message: 'Review submitted' });
  } catch (err) { next(err); }
});

module.exports = router;
