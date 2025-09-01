const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY
);

const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const morgan = require('morgan');
const session = require('express-session');
const passport = require('passport'); // ADD: Import passport

const app = express();

// ADD: Configure Passport strategies BEFORE using passport middleware
require('./src/config/passport')(passport);

// Test database connection endpoint
app.get('/api/test/db', async (req, res) => {
  try {
    console.log('=== Database Connection Test ===');
    
    // Test basic connection
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('count(*)')
      .limit(1);
    
    if (usersError) {
      throw new Error(`Users table error: ${usersError.message}`);
    }

    const { data: reviews, error: reviewsError } = await supabase
      .from('code_reviews')
      .select('count(*)')
      .limit(1);
    
    if (reviewsError) {
      throw new Error(`Reviews table error: ${reviewsError.message}`);
    }

    console.log('✅ Database connection successful');
    
    res.json({
      success: true,
      message: 'Database connection successful',
      timestamp: new Date().toISOString(),
      tables: {
        users: 'accessible',
        code_reviews: 'accessible'
      },
      environment: process.env.NODE_ENV || 'development',
      supabase_url: process.env.SUPABASE_URL ? 'configured' : 'missing'
    });
    
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    res.status(500).json({
      success: false,
      message: 'Database connection failed',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Test specific user data endpoint - REMOVE this since it's causing 404
// app.get('/api/test/user-data/:userId', async (req, res) => { ... });
// COMMENT OUT OR DELETE THIS ENTIRE ENDPOINT

// Trust proxy for Render deployment
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

// CORS Configuration
const corsOptions = {
  origin: [
    'http://localhost:3000',
    'https://code-lens-git-main-kartikay-shuklas-projects.vercel.app',
    process.env.CORS_ORIGIN
  ].filter(Boolean),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie']
};

app.use(cors(corsOptions));

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.',
    error: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    if (req.path === '/health') return true;
    return false;
  }
});

app.use(limiter);

// Session middleware - CRITICAL for OAuth state management
app.use(session({
  secret: process.env.SESSION_SECRET || process.env.JWT_SECRET || 'fallback-secret-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 1000 * 60 * 10 // 10 minutes for OAuth flow
  },
  name: 'codelens.sid'
}));

// ADD: Initialize Passport middleware AFTER session
app.use(passport.initialize());
app.use(passport.session());

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'CodeLens API Server',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth/*',
      users: '/api/users/*',
      ai: '/api/ai/*',
      reviews: '/api/reviews/*', // ADD: reviews endpoint
      health: '/health'
    }
  });
});

// Import routes
const authRoutes = require('./src/routes/auth.routes');
const userRoutes = require('./src/routes/user.routes');
const aiRoutes = require('./src/routes/ai.routes');
const reviewRoutes = require('./src/routes/review.routes');
const paymentRoutes = require('./src/routes/payment.routes');

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/reviews', reviewRoutes); // This handles /api/reviews/history
app.use('/api/payments', paymentRoutes);
// Catch-all for undefined routes
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found',
    error: 'ENDPOINT_NOT_FOUND',
    path: req.originalUrl,
    method: req.method,
    availableEndpoints: [
      '/api/auth/*',
      '/api/users/*', 
      '/api/ai/*',
      '/api/reviews/*', // ADD: reviews endpoint
      '/health'
    ]
  });
});

// UPDATED: Global error handler with passport error handling
app.use((error, req, res, next) => {
  console.error('Global error handler:', error);

  // Handle passport JWT errors specifically
  if (error.message && error.message.includes('Unknown authentication strategy "jwt"')) {
    console.error('❌ JWT Strategy not configured properly');
    return res.status(500).json({
      success: false,
      message: 'Authentication configuration error',
      error: 'AUTH_CONFIG_ERROR'
    });
  }

  // Handle specific error types
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      error: 'VALIDATION_ERROR',
      details: error.message
    });
  }

  if (error.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid token',
      error: 'INVALID_TOKEN'
    });
  }

  if (error.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Token expired',
      error: 'TOKEN_EXPIRED'
    });
  }

  // Handle rate limit errors
  if (error.code === 'ERR_ERL_UNEXPECTED_X_FORWARDED_FOR') {
    console.warn('Rate limiter proxy warning:', error.message);
    return next();
  }

  // Default error response
  res.status(error.status || 500).json({
    success: false,
    message: error.message || 'Internal server error',
    error: error.code || 'SERVER_ERROR',
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  });
});

module.exports = app;