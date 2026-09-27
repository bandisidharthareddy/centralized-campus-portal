const express = require('express');
const { 
  createRequest, 
  getMyRequests, 
  updateMyRequest, 
  cancelMyRequest 
} = require('../controllers/requestController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Require JWT authentication for all request endpoints
router.use(protect);

router.post('/', createRequest);
// Support both camelCase endpoint and backward compatibility
router.get('/myRequests', getMyRequests);
router.get('/my-requests', getMyRequests);
router.patch('/:id', updateMyRequest);
router.delete('/:id', cancelMyRequest);

module.exports = router;