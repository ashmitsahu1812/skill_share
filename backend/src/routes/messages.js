const express = require('express');
const router = express.Router();
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const { requireAuth } = require('../middleware/auth');
const User = require('../models/User');

// Get all conversations for a user
router.get('/conversations', requireAuth, async (req, res, next) => {
  try {
    const me = await User.findOne({ firebaseUid: req.firebaseUser.uid });
    const conversations = await Conversation.find({ participants: me._id })
      .populate('participants', 'displayName photoURL headline')
      .populate('lastMessage.sender', 'displayName')
      .sort({ updatedAt: -1 });
    
    res.json(conversations);
  } catch (err) {
    next(err);
  }
});

// Get or create a conversation with a specific user
router.post('/conversations', requireAuth, async (req, res, next) => {
  try {
    const { targetUserId } = req.body;
    const me = await User.findOne({ firebaseUid: req.firebaseUser.uid });

    if (me._id.toString() === targetUserId) {
      return res.status(400).json({ error: "Cannot message yourself" });
    }

    let conversation = await Conversation.findOne({
      participants: { $all: [me._id, targetUserId] }
    }).populate('participants', 'displayName photoURL headline');

    if (!conversation) {
      conversation = await Conversation.create({
        participants: [me._id, targetUserId]
      });
      conversation = await conversation.populate('participants', 'displayName photoURL headline');
    }

    res.json(conversation);
  } catch (err) {
    next(err);
  }
});

// Get messages for a conversation
router.get('/:conversationId', requireAuth, async (req, res, next) => {
  try {
    const { conversationId } = req.params;
    const me = await User.findOne({ firebaseUid: req.firebaseUser.uid });

    const conversation = await Conversation.findById(conversationId);
    if (!conversation || !conversation.participants.includes(me._id)) {
      return res.status(403).json({ error: "Unauthorized or not found" });
    }

    const messages = await Message.find({ conversationId })
      .sort({ createdAt: 1 })
      .populate('sender', 'displayName photoURL');

    res.json(messages);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
