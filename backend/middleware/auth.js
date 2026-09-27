const jwt = require('jsonwebtoken');
const user = require('../models/User');

/**
 * Protect routes: Validates JWT token from either HTTP-only cookie or Authorization header
 */
exports.protect = async (req, res, next) => {
  let token;

  // Check HTTP-only cookie first
  if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  } 
  // Standard Bearer Token support for REST clients
  else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token || token === 'none') {
    return res.status(401).json({ success: false, message: 'Not authorized to access this route' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await user.findById(decoded.id);

    if (!req.user) {
      return res.status(401).json({ success: false, message: 'User no longer exists in database' });
    }

    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired authorization token' });
  }
};

/**
 * Authorize specific roles (Strict RBAC)
 */
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `User role '${req.user ? req.user.role : 'guest'}' is not authorized to access this route`
      });
    }
    next();
  };
};