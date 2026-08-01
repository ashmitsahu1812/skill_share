/**
 * User Routes
 * GET    /api/users/me                 — current user profile
 * PUT    /api/users/me                 — update profile
 * GET    /api/users/:username          — public profile
 * POST   /api/users/:id/follow         — follow/unfollow toggle
 * PUT    /api/users/availability       — update creator availability
 * GET    /api/users/:id/availability   — get creator's available slots
 * GET    /api/users/search?q=          — search users
 * GET    /api/users/creators           — discover creators
 */

const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Post = require('../models/Post');
const { requireAuth, optionalAuth } = require('../middleware/auth');
const { uploadAvatar, uploadToCloudinary } = require('../config/cloudinary');
const { createNotification } = require('../services/notificationService');

/**
 * GET /api/users/me — get authenticated user's full profile
 */
router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const user = await User.findOne({ firebaseUid: req.firebaseUser.uid })
      .populate('certificates', 'skill score issuedAt verificationCode pdfUrl')
      .lean();

    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) { next(err); }
});

/**
 * PUT /api/users/me — update profile
 */
router.put('/me', requireAuth, uploadAvatar.single('avatar'), async (req, res, next) => {
  try {
    const { displayName, bio, skillsToTeach, skillsToLearn, categories, isCreator, sessionRate, sessionDuration } = req.body;

    const updates = {};
    if (displayName !== undefined) updates.displayName = displayName;
    if (bio !== undefined) updates.bio = bio;
    if (skillsToTeach) updates.skillsToTeach = typeof skillsToTeach === 'string' ? JSON.parse(skillsToTeach) : skillsToTeach;
    if (skillsToLearn) updates.skillsToLearn = typeof skillsToLearn === 'string' ? JSON.parse(skillsToLearn) : skillsToLearn;
    if (categories) updates.categories = typeof categories === 'string' ? JSON.parse(categories) : categories;
    if (isCreator !== undefined) updates.isCreator = isCreator === 'true' || isCreator === true;
    if (sessionRate !== undefined) updates.sessionRate = Number(sessionRate);
    if (sessionDuration !== undefined) updates.sessionDuration = Number(sessionDuration);
    if (req.file) {
      const result = await uploadToCloudinary(req.file.buffer, req.file.mimetype, {
        folder: 'skillshare/avatars',
        resource_type: 'image',
        transformation: [{ width: 400, height: 400, crop: 'fill', gravity: 'face' }],
      });
      updates.avatar = result.secure_url;
    }

    const user = await User.findOneAndUpdate(
      { firebaseUid: req.firebaseUser.uid },
      updates,
      { new: true, runValidators: true }
    );

    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) { next(err); }
});

/**
 * GET /api/users/search?q=query — search users by username or displayName
 */
router.get('/search', optionalAuth, async (req, res, next) => {
  try {
    const { q = '', limit = 20 } = req.query;
    const users = await User.find({
      $or: [
        { username: { $regex: q, $options: 'i' } },
        { displayName: { $regex: q, $options: 'i' } },
        { skillsToTeach: { $regex: q, $options: 'i' } },
        { skillsToLearn: { $regex: q, $options: 'i' } },
      ],
    })
      .select('username displayName avatar bio isCreator skillsToTeach skillsToLearn categories followerCount')
      .limit(Number(limit))
      .lean();

    res.json(users);
  } catch (err) { next(err); }
});

/**
 * GET /api/users/matches
 * Find users for Skill Swap barter matching
 */
router.get('/matches', requireAuth, async (req, res, next) => {
  try {
    const me = await User.findOne({ firebaseUid: req.firebaseUser.uid }).select('skillsToTeach skillsToLearn').lean();
    if (!me) return res.status(404).json({ error: 'User not found' });

    const teach = me.skillsToTeach || [];
    const learn = me.skillsToLearn || [];

    if (teach.length === 0 && learn.length === 0) {
      return res.json([]);
    }

    const pipeline = [
      { $match: { _id: { $ne: me._id } } }, // exclude self
      {
        $addFields: {
          canTeachMeScore: {
            $size: { $setIntersection: [{ $ifNull: ["$skillsToTeach", []] }, learn] }
          },
          wantToLearnFromMeScore: {
            $size: { $setIntersection: [{ $ifNull: ["$skillsToLearn", []] }, teach] }
          }
        }
      },
      {
        $addFields: {
          totalMatchScore: { $add: ["$canTeachMeScore", "$wantToLearnFromMeScore"] },
          isPerfectMatch: {
            $and: [
              { $gt: ["$canTeachMeScore", 0] },
              { $gt: ["$wantToLearnFromMeScore", 0] }
            ]
          }
        }
      },
      { $match: { totalMatchScore: { $gt: 0 } } },
      { $sort: { isPerfectMatch: -1, totalMatchScore: -1 } },
      { $limit: 20 },
      {
        $project: {
          username: 1, displayName: 1, avatar: 1, bio: 1,
          skillsToTeach: 1, skillsToLearn: 1, isCreator: 1,
          canTeachMeScore: 1, wantToLearnFromMeScore: 1, isPerfectMatch: 1
        }
      }
    ];

    const matches = await User.aggregate(pipeline);
    res.json(matches);
  } catch (err) { next(err); }
});

/**
 * GET /api/users/creators?category=&page= — paginated creator discovery
 */
router.get('/creators', optionalAuth, async (req, res, next) => {
  try {
    const { category, page = 1, limit = 12 } = req.query;
    const query = { isCreator: true };
    if (category) query.categories = category;

    const creators = await User.find(query)
      .select('username displayName avatar bio skillsToTeach skillsToLearn categories rating ratingCount totalSessions sessionRate')
      .sort({ rating: -1, totalSessions: -1 })
      .skip((page - 1) * Number(limit))
      .limit(Number(limit))
      .lean();

    res.json(creators);
  } catch (err) { next(err); }
});

/**
 * GET /api/users/:username — public profile
 */
router.get('/:username', optionalAuth, async (req, res, next) => {
  try {
    const user = await User.findOne({ username: req.params.username.toLowerCase() })
      .populate('certificates', 'skill score issuedAt verificationCode pdfUrl')
      .lean();

    if (!user) return res.status(404).json({ error: 'User not found' });

    // Get user's posts
    const posts = await Post.find({ author: user._id })
      .sort({ createdAt: -1 })
      .limit(30)
      .lean();

    // Check if requesting user follows this profile
    let isFollowing = false;
    if (req.firebaseUser) {
      const me = await User.findOne({ firebaseUid: req.firebaseUser.uid }).select('_id').lean();
      if (me) {
        isFollowing = user.followers.some(fid => fid.toString() === me._id.toString());
      }
    }

    res.json({ user: { ...user, isFollowing }, posts });
  } catch (err) { next(err); }
});

/**
 * POST /api/users/:id/follow — toggle follow/unfollow
 */
router.post('/:id/follow', requireAuth, async (req, res, next) => {
  try {
    const [me, target] = await Promise.all([
      User.findOne({ firebaseUid: req.firebaseUser.uid }),
      User.findById(req.params.id),
    ]);

    if (!me || !target) return res.status(404).json({ error: 'User not found' });
    if (me._id.equals(target._id)) return res.status(400).json({ error: 'Cannot follow yourself' });

    const isFollowing = me.following.includes(target._id);

    if (isFollowing) {
      // Unfollow
      me.following.pull(target._id);
      target.followers.pull(me._id);
    } else {
      // Follow
      me.following.push(target._id);
      target.followers.push(me._id);

      // Send notification
      await createNotification({
        recipient: target._id,
        sender: me._id,
        type: 'follow',
        title: `${me.displayName} started following you`,
        refModel: 'User',
        refId: me._id,
      });
    }

    await Promise.all([me.save(), target.save()]);
    res.json({ following: !isFollowing, followerCount: target.followers.length });
  } catch (err) { next(err); }
});

/**
 * PUT /api/users/availability — update creator's weekly availability
 */
router.put('/availability', requireAuth, async (req, res, next) => {
  try {
    const { availability } = req.body;

    const user = await User.findOneAndUpdate(
      { firebaseUid: req.firebaseUser.uid },
      { availability },
      { new: true }
    ).select('availability');

    res.json(user);
  } catch (err) { next(err); }
});

/**
 * GET /api/users/:id/availability — get creator's available slots for a date
 */
router.get('/:id/availability', async (req, res, next) => {
  try {
    const creator = await User.findById(req.params.id).select('availability sessionDuration').lean();
    if (!creator) return res.status(404).json({ error: 'Creator not found' });

    const Session = require('../models/Session');

    // Get booked sessions for the next 30 days
    const from = new Date();
    const to = new Date();
    to.setDate(to.getDate() + 30);

    const booked = await Session.find({
      creator: req.params.id,
      scheduledAt: { $gte: from, $lte: to },
      status: { $in: ['pending', 'confirmed'] },
    }).select('scheduledAt duration').lean();

    res.json({ availability: creator.availability, bookedSlots: booked, sessionDuration: creator.sessionDuration });
  } catch (err) { next(err); }
});

module.exports = router;
