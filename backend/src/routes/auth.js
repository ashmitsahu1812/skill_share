/**
 * Auth Routes
 * POST /api/auth/sync — Sync Firebase user to MongoDB after login/signup
 */

const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { requireAuth } = require('../middleware/auth');
const { createNotification } = require('../services/notificationService');

/**
 * POST /api/auth/sync
 * Called by frontend after Firebase login/signup to ensure MongoDB user exists.
 * Also used to update auth profile data.
 */
router.post('/sync', requireAuth, async (req, res) => {
  const { uid, email, name, picture } = req.firebaseUser;
  const { username, displayName, bio, skills, categories } = req.body;

  try {
    let user = await User.findOne({ firebaseUid: uid });

    if (!user) {
      // New user — need a username
      if (!username) {
        return res.status(400).json({ error: 'Username required for new users', requiresUsername: true });
      }

      // Check username availability
      const taken = await User.findOne({ username: username.toLowerCase() });
      if (taken) {
        return res.status(409).json({ error: 'Username already taken' });
      }

      user = await User.create({
        firebaseUid: uid,
        username: username.toLowerCase(),
        displayName: displayName || name || username,
        email,
        avatar: picture || '',
        bio: bio || '',
        skills: skills || [],
        categories: categories || [],
      });

      return res.status(201).json({ user, isNew: true });
    }

    // Existing user — return their data
    return res.json({ user, isNew: false });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: 'Username or email already in use' });
    }
    next(err);
  }
});

/**
 * GET /api/auth/check-username/:username
 * Check if a username is available
 */
router.get('/check-username/:username', async (req, res) => {
  const { username } = req.params;

  if (username.length < 3 || !/^[a-z0-9_\.]+$/.test(username)) {
    return res.json({ available: false, reason: 'Must be 3+ chars, lowercase letters, numbers, _ or . only' });
  }

  const taken = await User.findOne({ username: username.toLowerCase() });
  res.json({ available: !taken });
});

module.exports = router;
