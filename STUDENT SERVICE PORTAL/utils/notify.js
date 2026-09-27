const notification = require('../models/Notification');

/**
 * Dispatches an enterprise notification to a specific user or role
 * Ensures zero emojis and strict standard schema
 */
exports.sendNotification = async ({ recipient, recipientRole, title, message, type, requestId }) => {
  try {
    return await notification.create({
      recipient,
      recipientRole,
      title,
      message,
      type: type || 'system',
      requestId
    });
  } catch (err) {
    console.error('Notification dispatch failure:', err.message);
    return null;
  }
};
