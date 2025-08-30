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

const app = express();
// Add this to your main server.js or app.js file

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

// Test specific user data endpoint
app.get('/api/test/user-data/:userId', async (req, res) => {
  try {
    console.log('=== Testing User Data ===');
    console.log('User ID:', req.params.userId);
    
    // Get user profile
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', req.params.userId)
      .single();
    
    if (userError) {
      throw new Error(`User query error: ${userError.message}`);
    }

    // Get user's reviews
    const { data: reviews, error: reviewsError } = await supabase
      .from('code_reviews')
      .select('id, title, language, created_at, status, overall_score')
      .eq('user_id', req.params.userId)
      .order('created_at', { ascending: false });
    
    if (reviewsError) {
      throw new Error(`Reviews query error: ${reviewsError.message}`);
    }

    console.log(`✅ Found user with ${reviews?.length || 0} reviews`);
    
    res.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        reviewCount: reviews?.length || 0
      },
      reviews: reviews?.map(r => ({
        id: r.id,
        title: r.title,
        language: r.language,
        status: r.status,
        score: r.overall_score,
        date: r.created_at
      })) || []
    });
    
  } catch (error) {
    console.error('❌ User data test failed:', error);
    res.status(500).json({
      success: false,
      message: 'User data test failed',
      error: error.message
    });
  }
});

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

// Rate Limiting with proper proxy trust
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.',
    error: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Skip rate limiting if X-Forwarded-For header validation fails
  skip: (req) => {
    // Skip rate limiting for health checks
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
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    httpOnly: true,
    maxAge: 1000 * 60 * 10 // 10 minutes for OAuth flow
  },
  name: 'codelens.sid'
}));

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
      health: '/health'
    }
  });
});

// Import routes
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const aiRoutes = require('./routes/ai.routes');
const reviewRoutes = require('./routes/review.routes');

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/reviews', reviewRoutes);

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
      '/health'
    ]
  });
});

// Global error handler
app.use((error, req, res, next) => {
  console.error('Global error handler:', error);

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
    return next(); // Continue without rate limiting
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