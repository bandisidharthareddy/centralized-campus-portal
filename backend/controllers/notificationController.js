const notificationModel = require('../models/Notification');

// @desc    Get user notifications (Works for both student and deptHead)
// @route   GET /api/v1/notifications
// @access  Private
exports.getMyNotifications = async (req, res) => {
  try {
    const notifications = await notificationModel.find({
      $or: [
        { recipient: req.user.id },
        { recipientRole: req.user.role },
        { recipientRole: 'all' },
        { recipientRole: 'ALL' }
      ]
    })
      .sort({ createdAt: -1 })
      .limit(30);

    res.status(200).json({
      success: true,
      count: notifications.length,
      data: notifications
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Mark all user notifications as read
// @route   PATCH /api/v1/notifications/markRead
// @access  Private
exports.markAllRead = async (req, res) => {
  try {
    await notificationModel.updateMany(
      {
        $or: [
          { recipient: req.user.id },
          { recipientRole: req.user.role }
        ]
      },
      { isRead: true }
    );

    res.status(200).json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
