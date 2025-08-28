// src/app.js - CORRECTED VERSION
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const passport = require('passport');
const session = require('express-session');
const rateLimit = require('express-rate-limit');

// Import configuration
require('./config/passport')(passport);

// Import routes
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const aiRoutes = require('./routes/ai.routes');
const reviewRoutes = require('./routes/review.routes');

const app = express();

// FIX: Set trust proxy FIRST before any middleware
app.set('trust proxy', 1);

// Logging configuration
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Security middleware
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  }
}));

// CORS configuration - UPDATED
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001', 
      'http://localhost:5173', // Vite dev server
      'https://codelens-frontend.vercel.app',
      'https://codelens.vercel.app',
      'https://code-lens-git-main-kartikay-shuklas-projects.vercel.app', // Your actual frontend URL
      process.env.CORS_ORIGIN
    ].filter(Boolean);
    
    // Allow requests with no origin (mobile apps, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`CORS: Origin ${origin} not allowed`);
      console.warn(`Allowed origins:`, allowedOrigins);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Origin', 
    'X-Requested-With', 
    'Content-Type', 
    'Accept', 
    'Authorization',
    'Cache-Control',
    'Pragma'
  ],
  exposedHeaders: ['set-cookie']
};

app.use(cors(corsOptions));

// FIXED: Rate limiting with proper trust proxy configuration
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'development' ? 1000 : 100,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.',
    error: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  // FIX: Don't validate X-Forwarded-For header since we trust proxy
  validate: {
    xForwardedForHeader: false,
  }
});

app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// FIXED: Session configuration with proper settings for production
app.use(session({
  secret: process.env.SESSION_SECRET || 'codelens-session-secret-change-in-production',
  resave: false,
  saveUninitialized: false,
  name: 'codelens.sid',
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
  },
  // Use MemoryStore for sessions (consider Redis for production scaling)
  store: new (require('session').MemoryStore)()
}));

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  if (req.headers.authorization) {
    console.log('Auth header present:', req.headers.authorization.substring(0, 20) + '...');
  }
  next();
});

// FIX: Add root route to prevent 404 errors
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'CodeLens Backend API',
    version: '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/health',
      api: '/api',
      auth: '/api/auth/*',
      users: '/api/users/*',
      ai: '/api/ai/*'
    }
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'CodeLens API is healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0',
    uptime: process.uptime()
  });
});

// API Routes - FIXED MOUNTING
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/reviews', reviewRoutes);

// API Documentation endpoint
app.get('/api', (req, res) => {
  res.json({
    success: true,
    message: 'CodeLens API v1.0.0',
    documentation: {
      auth: {
        'GET /api/auth/github': 'Initiate GitHub OAuth',
        'GET /api/auth/github/callback': 'GitHub OAuth callback',
        'POST /api/auth/github/callback': 'GitHub OAuth callback (API)',
        'POST /api/auth/verify-token': 'Verify JWT token',
        'GET /api/auth/me': 'Get current user (requires auth)',
        'POST /api/auth/logout': 'Logout user'
      },
      users: {
        'GET /api/users/profile': 'Get user profile (requires auth)',
        'POST /api/users/preferences': 'Save user preferences (requires auth)',
        'PUT /api/users/profile': 'Update user profile (requires auth)'
      },
      ai: {
        'POST /api/ai/analyze': 'Analyze code (public endpoint)',
        'POST /api/ai/review': 'Analyze code (requires auth)',
        'GET /api/ai/languages': 'Get supported languages'
      }
    },
    timestamp: new Date().toISOString()
  });
});

// FIX: Add auth error route that your frontend is trying to access
app.get('/auth/error', (req, res) => {
  const { error, message } = req.query;
  res.json({
    success: false,
    error: error || 'AUTH_ERROR',
    message: message || 'Authentication failed',
    timestamp: new Date().toISOString()
  });
});

// 404 handler - UPDATED
app.use('*', (req, res) => {
  console.log(`404 - Route not found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    success: false,
    message: 'API endpoint not found',
    error: 'ENDPOINT_NOT_FOUND',
    path: req.originalUrl,
    method: req.method,
    availableEndpoints: [
      '/',
      '/health',
      '/api',
      '/api/auth/*',
      '/api/users/*', 
      '/api/ai/*',
      '/auth/error'
    ],
    timestamp: new Date().toISOString()
  });
});

// Global error handler - ENHANCED
app.use((error, req, res, next) => {
  console.error('Global error handler:', {
    message: error.message,
    stack: error.stack,
    url: req.originalUrl,
    method: req.method,
    body: req.body
  });
  
  if (error.message === 'Not allowed by CORS') {
    return res.status(403).json({
      success: false,
      message: 'CORS policy violation - origin not allowed',
      error: 'CORS_ERROR',
      origin: req.headers.origin
    });
  }

  if (error.type === 'entity.parse.failed') {
    return res.status(400).json({
      success: false,
      message: 'Invalid JSON in request body',
      error: 'INVALID_JSON'
    });
  }

  if (error.type === 'entity.too.large') {
    return res.status(413).json({
      success: false,
      message: 'Request body too large',
      error: 'PAYLOAD_TOO_LARGE'
    });
  }

  res.status(error.status || 500).json({
    success: false,
    message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
    error: 'SERVER_ERROR',
    timestamp: new Date().toISOString(),
    ...(process.env.NODE_ENV === 'development' && { 
      stack: error.stack,
      details: error 
    })
  });
});

// Graceful shutdown handler
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

module.exports = app;