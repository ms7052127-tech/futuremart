const jwt = require('jsonwebtoken');
const User = require('../models/User');
const ApiResponse = require('../utils/apiResponse');

// Verify JWT and attach user to request
const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return ApiResponse.unauthorized(res, 'Access token required');
    }

    const token = authHeader.split(' ')[1];
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return ApiResponse.unauthorized(res, 'Token expired');
      }
      return ApiResponse.unauthorized(res, 'Invalid token');
    }

    const user = await User.findById(decoded.id);
    if (!user) {
      return ApiResponse.unauthorized(res, 'User no longer exists');
    }

    req.user = user;
    next();
  } catch (error) {
    return ApiResponse.unauthorized(res, 'Authentication failed');
  }
};

// Role-based access control
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return ApiResponse.forbidden(res, `Access denied. Required role: ${roles.join(' or ')}`);
    }
    next();
  };
};

// Only approved vendors can proceed
const approvedVendorOnly = (req, res, next) => {
  if (req.user.role === 'vendor' && req.user.vendorStatus !== 'approved') {
    return ApiResponse.forbidden(
      res,
      `Your vendor account is ${req.user.vendorStatus}. Only approved vendors can perform this action.`
    );
  }
  next();
};

module.exports = { protect, authorize, approvedVendorOnly };
