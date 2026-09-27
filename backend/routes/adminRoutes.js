const express = require('express');
const { getAllRequests, updateRequestStatus } = require('../controllers/adminRequestController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Apply middleware to all routes in this file
router.use(protect);

// Strict RBAC: Only authorized processor roles can access these routes (camelCase roles)
router.use(authorize('facultyCoordinator', 'deptHead', 'adminStaff', 'executiveAdmin'));

// Endpoints
router.get('/all', getAllRequests);
router.get('/requests', getAllRequests);
router.patch('/:id/status', updateRequestStatus);

module.exports = router;