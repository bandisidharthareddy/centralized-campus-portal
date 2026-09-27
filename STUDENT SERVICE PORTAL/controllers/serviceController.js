const serviceModel = require('../models/Service');

// @desc    Get all active services
// @route   GET /api/v1/services
// @access  Private (Logged-in users)
exports.getServices = async (req, res) => {
  try {
    const services = await serviceModel.find({ isActive: true });
    
    res.status(200).json({ 
      success: true, 
      count: services.length, 
      data: services 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create a new service
// @route   POST /api/v1/services
// @access  Private (executiveAdmin only)
exports.createService = async (req, res) => {
  try {
    const newService = await serviceModel.create(req.body);
    
    res.status(201).json({ 
      success: true, 
      data: newService 
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};