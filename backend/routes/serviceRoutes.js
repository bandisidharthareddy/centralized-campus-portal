const express = require('express');
const { getServices, createService } = require('../controllers/serviceController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Any logged-in user can view the service catalogue
router.get('/', protect, getServices);

// Strict RBAC: Only an executive admin can add new services to the catalogue
router.post('/', protect, authorize('executiveAdmin'), createService);

module.exports = router;