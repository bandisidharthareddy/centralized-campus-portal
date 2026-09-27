const express = require('express');
const { getMyNotifications, markAllRead } = require('../controllers/notificationController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.get('/', getMyNotifications);
// Support both camelCase endpoint and backward compatibility
router.patch('/markRead', markAllRead);
router.patch('/mark-read', markAllRead);

module.exports = router;
