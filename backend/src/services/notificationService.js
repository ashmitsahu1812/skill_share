/**
 * Notification Service
 * Helper to create in-app notifications
 */

const Notification = require('../models/Notification');

/**
 * Create a new notification
 * @param {object} params - notification fields
 */
async function createNotification({ recipient, sender, type, title, message, refModel, refId }) {
  try {
    await Notification.create({ recipient, sender, type, title, message, refModel, refId });
  } catch (err) {
    // Notifications are non-critical — don't bubble up errors
    console.error('Failed to create notification:', err.message);
  }
}

module.exports = { createNotification };
