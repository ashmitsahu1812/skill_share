/**
 * Notification Routes
 * GET  /api/notifications        — get my notifications
 * PUT  /api/notifications/read   — mark all as read
 * PUT  /api/notifications/:id/read — mark one as read
 */

const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const User = require('../models/User');
const { requireAuth } = require('../middleware/auth');

/**
 * GET /api/notifications?page=1&limit=20
 */
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const me = await User.findOne({ firebaseUid: req.firebaseUser.uid }).select('_id').lean();
    if (!me) return res.status(404).json({ error: 'User not found' });

    const skip = (Number(page) - 1) * Number(limit);

    const [notifications, unreadCount] = await Promise.all([
      Notification.find({ recipient: me._id })
        .populate('sender', 'username displayName avatar')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Notification.countDocuments({ recipient: me._id, isRead: false }),
    ]);

    res.json({ notifications, unreadCount });
  } catch (err) { next(err); }
});

/**
 * PUT /api/notifications/read — mark all notifications as read
 */
router.put('/read', requireAuth, async (req, res, next) => {
  try {
    const me = await User.findOne({ firebaseUid: req.firebaseUser.uid }).select('_id').lean();
    await Notification.updateMany({ recipient: me._id, isRead: false }, { isRead: true });
    res.json({ message: 'All notifications marked as read' });
  } catch (err) { next(err); }
});

/**
 * PUT /api/notifications/:id/read — mark one as read
 */
router.put('/:id/read', requireAuth, async (req, res, next) => {
  try {
    const me = await User.findOne({ firebaseUid: req.firebaseUser.uid }).select('_id').lean();
    await Notification.findOneAndUpdate(
      { _id: req.params.id, recipient: me._id },
      { isRead: true }
    );
    res.json({ message: 'Notification marked as read' });
  } catch (err) { next(err); }
});

module.exports = router;
