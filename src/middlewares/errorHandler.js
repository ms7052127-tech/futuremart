const logger = require('../utils/logger');
const ApiResponse = require('../utils/apiResponse');

const errorHandler = (err, req, res, next) => {
  logger.error(`${err.name}: ${err.message}`, { stack: err.stack, path: req.path });

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return ApiResponse.badRequest(res, `Duplicate value for field: ${field}`);
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message,
    }));
    return ApiResponse.badRequest(res, 'Validation failed', errors);
  }

  // Mongoose cast error (invalid ObjectId)
  if (err.name === 'CastError') {
    return ApiResponse.badRequest(res, `Invalid ${err.path}: ${err.value}`);
  }

  // JWT errors handled in auth middleware
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error';
  return ApiResponse.error(res, message, statusCode);
};

const notFound = (req, res, next) => {
  return ApiResponse.notFound(res, `Route ${req.originalUrl} not found`);
};

module.exports = { errorHandler, notFound };
