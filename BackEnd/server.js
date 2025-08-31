// Load environment variables first
require('dotenv').config();

// Validate required environment variables
const requiredEnvVars = ['JWT_SECRET', 'SUPABASE_URL', 'SUPABASE_SERVICE_KEY'];
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  console.error('Missing required environment variables:', missingEnvVars);
  process.exit(1);
}

console.log('Gemini API key found');

const { createClient } = require('@supabase/supabase-js');
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const morgan = require('morgan');
const session = require('express-session');
const passport = require('passport');

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY
);

const app = express();

// Configure Passport strategies FIRST - CRITICAL FIX
require('./src/config/passport')(passport);

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
  secret: process.env.SESSION_SECRET || process.env.JWT_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 1000 * 60 * 10 // 10 minutes for OAuth flow
  },
  name: 'codelens.sid'
}));

// CRITICAL FIX: Initialize Passport middleware AFTER session
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

// Test database connection endpoint
app.get('/api/test/db', async (req, res) => {
  try {
    console.log('=== Database Connection Test ===');
    
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

    console.log('Database connection successful');
    
    res.json({
      success: true,
      message: 'Database connection successful',
      timestamp: new Date().toISOString(),
      tables: {
        users: 'accessible',
        code_reviews: 'accessible'
      },
      environment: process.env.NODE_ENV || 'development'
    });
    
  } catch (error) {
    console.error('Database connection failed:', error);
    res.status(500).json({
      success: false,
      message: 'Database connection failed',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

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
      reviews: '/api/reviews/*',
      health: '/health'
    }
  });
});

// Import and use routes
const authRoutes = require('./src/routes/auth.routes');
const userRoutes = require('./src/routes/user.routes');
const aiRoutes = require('./src/routes/ai.routes');
const reviewRoutes = require('./src/routes/review.routes');

// API Routes - CRITICAL: This handles all your endpoints
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/reviews', reviewRoutes); // This handles /api/reviews/history

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
      '/api/reviews/*',
      '/health'
    ]
  });
});

// Global error handler with JWT strategy error handling
app.use((error, req, res, next) => {
  console.error('Global error handler:', error);

  // Handle passport JWT errors specifically - CRITICAL FIX
  if (error.message && error.message.includes('Unknown authentication strategy "jwt"')) {
    console.error('JWT Strategy not configured properly');
    return res.status(500).json({
      success: false,
      message: 'Authentication configuration error',
      error: 'AUTH_CONFIG_ERROR'
    });
  }

  // Handle other specific error types
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

  // Default error response
  res.status(error.status || 500).json({
    success: false,
    message: error.message || 'Internal server error',
    error: error.code || 'SERVER_ERROR',
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  });
});

// Ensure PORT is a valid number
const PORT = (() => {
  const parsed = parseInt(process.env.PORT, 10);
  if (isNaN(parsed)) {
    console.warn(`Invalid PORT "${process.env.PORT}", falling back to 5000`);
    return 5000;
  }
  return parsed;
})();

// Start server
const server = app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'production'}`);
  
  // Check critical environment variables
  console.log('Configuration Status:');
  console.log(`- JWT_SECRET: ${process.env.JWT_SECRET ? 'Configured' : 'Missing'}`);
  console.log(`- SUPABASE_URL: ${process.env.SUPABASE_URL ? 'Connected' : 'Not configured'}`);
  console.log(`- SUPABASE_SERVICE_KEY: ${process.env.SUPABASE_SERVICE_KEY ? 'Loaded' : 'Missing'}`);
  console.log(`- GOOGLE_GEMINI_KEY: ${process.env.GOOGLE_GEMINI_KEY ? 'Loaded' : 'Missing'}`);
  console.log(`- GitHub OAuth: ${process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET ? 'Configured' : 'Missing'}`);
});

// Handle server startup errors
server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Please use a different port.`);
  } else {
    console.error('Server startup error:', error);
  }
  process.exit(1);
});

// Graceful shutdown handlers
const gracefulShutdown = (signal) => {
  console.log(`${signal} received. Starting graceful shutdown...`);
  
  server.close((err) => {
    if (err) {
      console.error('Error during server shutdown:', err);
      process.exit(1);
    }
    
    console.log('Server closed successfully');
    process.exit(0);
  });
  
  // Force close after 10 seconds
  setTimeout(() => {
    console.error('Forced shutdown after 10 seconds');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle unhandled rejections and exceptions
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise);
  console.error('Reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

module.exports = app;