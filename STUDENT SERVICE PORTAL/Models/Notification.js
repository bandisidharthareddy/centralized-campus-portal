const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.ObjectId,
    ref: 'User'
  },
  recipientRole: {
    type: String,
    enum: ['student', 'clubCoordinator', 'deptHead', 'facultyCoordinator', 'adminStaff', 'executiveAdmin', 'all']
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['requestSubmitted', 'inReview', 'approved', 'rejected', 'cancelled', 'completed', 'system'],
    default: 'system'
  },
  requestId: {
    type: mongoose.Schema.ObjectId,
    ref: 'Request'
  },
  isRead: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

const notification = mongoose.model('Notification', notificationSchema);
module.exports = notification;
