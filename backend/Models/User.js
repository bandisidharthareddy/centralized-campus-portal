const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide a name'],
    trim: true,
  },
  email: {
    type: String,
    required: [true, 'Please provide an email address'],
    unique: true,
    lowercase: true,
  },
  password: {
    type: String,
    required: [true, 'Please provide a password'],
    minlength: 6,
    select: false, 
  },
  role: {
    type: String,
    enum: [
      'student', 
      'clubCoordinator', 
      'facultyCoordinator', 
      'deptHead', 
      'adminStaff', 
      'executiveAdmin'
    ],
    default: 'student',
  }
}, {
  timestamps: true 
});

// Security hook: hash password before saving
userSchema.pre('save', async function() {
  if (!this.isModified('password')) {
    return; 
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Helper method: generate signed JWT token with camelCase properties
userSchema.methods.getSignedJwtToken = function() {
  return jwt.sign({ id: this._id, role: this.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '30d'
  });
};

const user = mongoose.model('User', userSchema);
module.exports = user;