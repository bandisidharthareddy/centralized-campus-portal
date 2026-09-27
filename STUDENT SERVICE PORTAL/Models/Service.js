const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a service name'],
    unique: true,
    trim: true
  },
  description: {
    type: String,
    required: [true, 'Please add a description']
  },
  department: {
    type: String,
    required: [true, 'Please specify the handling department'],
    enum: [
      'attendanceAcademic',
      'certificatesCredentials',
      'idCardsExams',
      'feesFinance',
      'transportBus',
      'securityGate',
      'venueFacilities',
      'itNetworking',
      'maintenanceRepairs',
      'miscServices',
      'estateMaintenance'
    ]
  },
  category: {
    type: String,
    enum: ['studentServices', 'campusPermissions', 'miscServices'],
    default: 'studentServices'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  estimatedDays: {
    type: Number,
    default: 1
  }
}, { timestamps: true });

const service = mongoose.model('Service', serviceSchema);
module.exports = service;