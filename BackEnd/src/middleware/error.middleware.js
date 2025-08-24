// Error handling middleware
const errorHandler = (err, req, res, next) => {
  console.error('Error Stack:', err.stack);

  let error = { ...err };
  error.message = err.message;

  // Log error details
  console.error('Error Details:', {
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    body: req.body,
    user: req.user?.id || 'anonymous',
    timestamp: new Date().toISOString()
  });

  // JWT Errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid authentication token',
      error: 'INVALID_TOKEN'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Authentication token expired',
      error: 'TOKEN_EXPIRED'
    });
  }

  // Validation Errors
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(val => val.message);
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      error: 'VALIDATION_ERROR',
      details: messages
    });
  }

  // Joi Validation Errors
  if (err.details && Array.isArray(err.details)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid input data',
      error: 'VALIDATION_ERROR',
      details: err.details.map(detail => detail.message)
    });
  }

  // PostgreSQL/Supabase Errors
  if (err.code) {
    switch (err.code) {
      case '23505': // Unique constraint violation
        return res.status(409).json({
          success: false,
          message: 'Resource already exists',
          error: 'DUPLICATE_RESOURCE'
        });
      
      case '23503': // Foreign key constraint violation
        return res.status(400).json({
          success: false,
          message: 'Referenced resource does not exist',
          error: 'INVALID_REFERENCE'
        });
      
      case '23502': // Not null constraint violation
        return res.status(400).json({
          success: false,
          message: 'Required field is missing',
          error: 'MISSING_REQUIRED_FIELD'
        });
      
      case 'PGRST116': // Row not found
        return res.status(404).json({
          success: false,
          message: 'Resource not found',
          error: 'NOT_FOUND'
        });
      
      default:
        break;
    }
  }

  // Cast Errors
  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: 'Invalid resource ID format',
      error: 'INVALID_ID'
    });
  }

  // Rate Limit Errors
  if (err.status === 429) {
    return res.status(429).json({
      success: false,
      message: 'Too many requests. Please try again later.',
      error: 'RATE_LIMIT_EXCEEDED',
      retryAfter: err.retryAfter
    });
  }

  // File Upload Errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      success: false,
      message: 'File too large',
      error: 'FILE_TOO_LARGE'
    });
  }

  if (err.code === 'LIMIT_FILE_COUNT') {
    return res.status(400).json({
      success: false,
      message: 'Too many files',
      error: 'TOO_MANY_FILES'
    });
  }

  // AI Service Errors
  if (err.type === 'AI_SERVICE_ERROR') {
    return res.status(503).json({
      success: false,
      message: 'AI service temporarily unavailable',
      error: 'AI_SERVICE_UNAVAILABLE'
    });
  }

  // Credit/Subscription Errors
  if (err.type === 'CREDIT_LIMIT_EXCEEDED') {
    return res.status(403).json({
      success: false,
      message: 'Credit limit exceeded. Please upgrade your plan.',
      error: 'CREDIT_LIMIT_EXCEEDED',
      upgradeUrl: '/upgrade'
    });
  }

  // Permission Errors
  if (err.status === 403) {
    return res.status(403).json({
      success: false,
      message: 'Access forbidden',
      error: 'FORBIDDEN'
    });
  }

  // Default to 500 server error
  const statusCode = err.statusCode || err.status || 500;
  
  res.status(statusCode).json({
    success: false,
    message: process.env.NODE_ENV === 'production' 
      ? 'An unexpected error occurred' 
      : err.message,
    error: 'SERVER_ERROR',
    ...(process.env.NODE_ENV === 'development' && {
      stack: err.stack,
      details: error
    })
  });
};

// 404 handler
const notFoundHandler = (req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  error.status = 404;
  next(error);
};

// Async error wrapper
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// Custom error class
class AppError extends Error {
  constructor(message, statusCode, type = null) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;
    this.type = type;

    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = {
  errorHandler,
  notFoundHandler,
  asyncHandler,
  AppError
};