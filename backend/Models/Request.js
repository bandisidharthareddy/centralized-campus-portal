const mongoose = require('mongoose');

const requestSchema = new mongoose.Schema({
  service: {
    type: mongoose.Schema.ObjectId,
    ref: 'Service',
    required: true
  },
  submittedBy: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true
  },
  payload: {
    type: mongoose.Schema.Types.Mixed, 
    required: [true, 'Please provide request metadata']
  },
  status: {
    type: String,
    enum: ['pending', 'inReview', 'approved', 'rejected', 'cancelled', 'completed'],
    default: 'pending'
  },
  processedBy: {
    type: mongoose.Schema.ObjectId,
    ref: 'User'
  },
  adminRemarks: {
    type: String,
    trim: true
  }
}, { timestamps: true });

const request = mongoose.model('Request', requestSchema);
module.exports = request;