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
      .populate('participants', 'displayName avatar bio')
      .populate('lastMessage.sender', 'displayName')
      .sort({ updatedAt: -1 });
    
    res.json(conversations);
  } catch (err) {
    next(err);
  }
});

const mongoose = require('mongoose');

// Get or create a conversation with a specific user
router.post('/conversations', requireAuth, async (req, res, next) => {
  try {
    const { targetUserId } = req.body;
    
    // Validate targetUserId
    if (!mongoose.Types.ObjectId.isValid(targetUserId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }
    const targetObjId = new mongoose.Types.ObjectId(targetUserId);

    const me = await User.findOne({ firebaseUid: req.firebaseUser.uid });

    if (me._id.equals(targetObjId)) {
      return res.status(400).json({ error: "Cannot message yourself" });
    }

    let conversation = await Conversation.findOne({
      participants: { $all: [me._id, targetObjId] }
    }).populate('participants', 'displayName avatar bio');

    if (!conversation) {
      conversation = await Conversation.create({
        participants: [me._id, targetObjId]
      });
      conversation = await conversation.populate('participants', 'displayName avatar bio');
    }

    res.json(conversation);
  } catch (err) {
    console.error('Error in POST /conversations:', err);
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
