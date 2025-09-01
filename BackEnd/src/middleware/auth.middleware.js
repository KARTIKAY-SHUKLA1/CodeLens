// Fixed auth.middleware.js - Remove plan column references
if (!process.env.JWT_SECRET) {
  console.error('❌ CRITICAL: JWT_SECRET environment variable is not set');
  throw new Error('JWT_SECRET must be set in environment variables');
}
const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL || 'https://oqrnlnvrrnugkxhjixyr.supabase.co',
  process.env.SUPABASE_SERVICE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// JWT Authentication Middleware
const authenticateToken = async (req, res, next) => {
  try {
    console.log('=== Auth Middleware ===');
    console.log('Request URL:', req.originalUrl);
    console.log('Request Method:', req.method);
    
    const authHeader = req.headers.authorization;
    console.log('Auth header:', authHeader ? 'Present' : 'Missing');
    
    if (!authHeader) {
      console.log('❌ No authorization header');
      return res.status(401).json({
        success: false,
        message: 'No authorization header provided'
      });
    }

    if (!authHeader.startsWith('Bearer ')) {
      console.log('❌ Invalid authorization header format');
      return res.status(401).json({
        success: false,
        message: 'Invalid authorization header format'
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    console.log('Token extracted:', token ? 'Present' : 'Missing');

    if (!token) {
      console.log('❌ No token found');
      return res.status(401).json({
        success: false,
        message: 'No authentication token provided'
      });
    }

    // Verify JWT token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log('Token decoded successfully for user:', decoded.userId || decoded.id);
    } catch (jwtError) {
      console.error('❌ JWT verification failed:', jwtError.message);
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token'
      });
    }

    // Handle both userId and id fields for backward compatibility
    const userId = decoded.userId || decoded.id;
    
    if (!userId) {
      console.error('❌ No user ID found in token');
      return res.status(401).json({
        success: false,
        message: 'Invalid token payload'
      });
    }

    // FIXED: Get user from database - removed 'plan' column reference
    const { data: user, error } = await supabase
      .from('users')
      .select(`
        id, username, name, email, avatar_url, bio, github_profile_url,
        subscription_tier, subscription_status, stripe_customer_id,
        credits_used, credits_limit, created_at, updated_at, last_login,
        is_active
      `)
      .eq('id', userId)
      .single();

    if (error) {
      console.error('❌ Database error:', error);
      return res.status(401).json({
        success: false,
        message: 'User not found in database'
      });
    }

    if (!user) {
      console.error('❌ User not found');
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if user is active (if you have this field)
    if (user.is_active === false) {
      console.error('❌ User account deactivated');
      return res.status(403).json({
        success: false,
        message: 'Account is deactivated'
      });
    }

    // Attach user to request
    req.user = user;
    req.token = token;
    
    console.log('✅ User authenticated successfully:', user.id);
    next();

  } catch (error) {
    console.error('❌ Auth middleware error:', error);
    return res.status(500).json({
      success: false,
      message: 'Authentication failed',
      error: 'AUTH_ERROR'
    });
  }
};

// Optional authentication middleware (for routes that work with or without auth)
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      req.user = null;
      return next();
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId || decoded.id;
    
    // FIXED: Removed 'plan' column reference
    const { data: user, error } = await supabase
      .from('users')
      .select(`
        id, username, name, email, avatar_url, bio, github_profile_url,
        subscription_tier, subscription_status, stripe_customer_id,
        credits_used, credits_limit, is_active
      `)
      .eq('id', userId)
      .single();

    if (!error && user && user.is_active !== false) {
      req.user = user;
      req.token = token;
    } else {
      req.user = null;
    }

    next();
  } catch (error) {
    // If token is invalid, just continue without user
    req.user = null;
    next();
  }
};

// Admin only middleware
const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Admin access required'
    });
  }

  next();
};

// FIXED: Pro plan middleware - use subscription_tier instead of plan
const requireProPlan = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  const isProUser = req.user.subscription_tier === 'pro' && 
                    req.user.subscription_status === 'active';

  if (!isProUser) {
    return res.status(403).json({
      success: false,
      message: 'Pro plan required for this feature',
      upgradeUrl: '/pricing'
    });
  }

  next();
};

// FIXED: Check credits middleware - handle unlimited credits for pro users
const checkCredits = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  // Pro users have unlimited credits
  const isProUser = req.user.subscription_tier === 'pro' && 
                    req.user.subscription_status === 'active';
  
  if (isProUser) {
    return next(); // Skip credit check for pro users
  }

  // Check credits for free users
  const creditsUsed = req.user.credits_used || 0;
  const creditsLimit = req.user.credits_limit || 100;

  if (creditsUsed >= creditsLimit) {
    return res.status(403).json({
      success: false,
      message: 'Credit limit exceeded. Please upgrade your plan.',
      credits: {
        used: creditsUsed,
        limit: creditsLimit
      },
      upgradeUrl: '/pricing'
    });
  }
  
  next();
};

// Session validation middleware
const validateSession = async (req, res, next) => {
  try {
    if (!req.token) {
      return next();
    }

    // Check if session exists in database (if you have this table)
    const { data: session, error } = await supabase
      .from('user_sessions')
      .select('*')
      .eq('session_token', req.token)
      .single();

    if (error && error.code !== 'PGRST116') { // Not "not found" error
      console.warn('Session validation failed:', error.message);
      return next(); // Continue without session validation
    }

    if (session && session.is_active === false) {
      return res.status(401).json({
        success: false,
        message: 'Invalid session'
      });
    }

    // Check if session is expired
    if (session && new Date(session.expires_at) < new Date()) {
      // Mark session as inactive
      await supabase
        .from('user_sessions')
        .update({ is_active: false })
        .eq('session_token', req.token);

      return res.status(401).json({
        success: false,
        message: 'Session expired'
      });
    }

    next();
  } catch (error) {
    console.error('Session validation error:', error);
    // Continue without session validation rather than failing
    next();
  }
};

module.exports = {
  authenticateToken,
  optionalAuth,
  requireAdmin,
  requireProPlan,
  checkCredits,
  validateSession
};