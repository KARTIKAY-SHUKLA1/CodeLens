const express = require('express');
const passport = require('passport');
const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');
const router = express.Router();

// Initialize Supabase with SERVICE_KEY and proper configuration to bypass RLS
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    db: {
      schema: 'public'
    },
    global: {
      headers: {
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}`
      }
    }
  }
);

// Generate JWT token with better payload
const generateToken = (user) => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is not set');
  }
  
  return jwt.sign(
    { 
      userId: user.id,
      id: user.id,
      username: user.username,
      email: user.email,
      plan: user.plan || 'free'
    },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
};

// @route   GET /api/auth/github
// @desc    Start GitHub OAuth
// @access  Public
router.get('/github', (req, res, next) => {
  console.log('=== GitHub OAuth Start ===');
  console.log('Client ID:', process.env.GITHUB_CLIENT_ID ? 'Present' : 'Missing');
  
  passport.authenticate('github', { 
    scope: ['user:email', 'read:user'] 
  })(req, res, next);
});

// @route   GET /api/auth/github/callback
// @desc    GitHub OAuth callback (Original OAuth flow)
// @access  Public
router.get('/github/callback',
  (req, res, next) => {
    console.log('=== GitHub OAuth Callback ===');
    console.log('Query params:', req.query);
    next();
  },
  passport.authenticate('github', { 
    failureRedirect: process.env.CORS_ORIGIN ? `${process.env.CORS_ORIGIN}/?error=auth_failed` : '/login'
  }),
  async (req, res) => {
    try {
      console.log('OAuth callback - user authenticated:', req.user ? req.user.id : 'No user');
      
      if (!req.user) {
        throw new Error('No user data from GitHub OAuth');
      }

      // Generate JWT token
      const token = generateToken(req.user);
      console.log('Generated token for user:', req.user.id);

      // Create session record
      try {
        await supabase
          .from('user_sessions')
          .insert([{
            user_id: req.user.id,
            session_token: token,
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            ip_address: req.ip || req.connection.remoteAddress,
            user_agent: req.get('user-agent') || 'Unknown'
          }]);
        console.log('Session created successfully');
      } catch (sessionError) {
        console.warn('Failed to create session record:', sessionError.message);
      }

      // Redirect to frontend with token
      const frontendURL = process.env.CORS_ORIGIN || 'http://localhost:3000';
      const userData = {
        id: req.user.id,
        username: req.user.username,
        name: req.user.name,
        email: req.user.email,
        avatar: req.user.avatar_url,
        githubUsername: req.user.username,
        plan: req.user.plan || 'free',
        reviewsUsed: req.user.credits_used || 0,
        reviewsLimit: req.user.credits_limit || 100,
        isNewUser: req.user.created_at && new Date(req.user.created_at) > new Date(Date.now() - 24*60*60*1000)
      };

      const redirectURL = `${frontendURL}/?token=${token}&user=${encodeURIComponent(JSON.stringify(userData))}`;
      console.log('Redirecting to:', frontendURL);
      
      res.redirect(redirectURL);
    } catch (error) {
      console.error('OAuth callback error:', error);
      const frontendURL = process.env.CORS_ORIGIN || 'http://localhost:3000';
      res.redirect(`${frontendURL}/?error=${encodeURIComponent('Authentication failed: ' + error.message)}`);
    }
  }
);

// @route   POST /api/auth/github/callback
// @desc    Handle GitHub OAuth code from frontend
// @access  Public
router.post('/github/callback', async (req, res) => {
  try {
    console.log('=== POST GitHub Callback ===');
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({
        success: false,
        message: 'Authorization code is required',
        error: 'MISSING_CODE'
      });
    }

    console.log('Exchanging code for access token...');

    // Exchange code for access token
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': 'CodeLens-App'
      },
      body: JSON.stringify({
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code: code,
      }),
    });

    if (!tokenResponse.ok) {
      throw new Error(`GitHub token exchange failed: ${tokenResponse.status}`);
    }

    const tokenData = await tokenResponse.json();
    console.log('Token response:', { ...tokenData, access_token: tokenData.access_token ? '[PRESENT]' : '[MISSING]' });

    if (tokenData.error) {
      throw new Error(`GitHub OAuth error: ${tokenData.error_description || tokenData.error}`);
    }

    if (!tokenData.access_token) {
      throw new Error('No access token received from GitHub');
    }

    // Get user info from GitHub
    console.log('Fetching user data from GitHub...');
    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `token ${tokenData.access_token}`,
        'User-Agent': 'CodeLens-App',
        'Accept': 'application/vnd.github.v3+json'
      },
    });

    if (!userResponse.ok) {
      throw new Error(`GitHub user API failed: ${userResponse.status}`);
    }

    const githubUser = await userResponse.json();
    console.log('GitHub user data:', { id: githubUser.id, login: githubUser.login, name: githubUser.name });

    // Get user email if not public
    let primaryEmail = githubUser.email;
    if (!primaryEmail) {
      console.log('Fetching user emails from GitHub...');
      try {
        const emailResponse = await fetch('https://api.github.com/user/emails', {
          headers: {
            'Authorization': `token ${tokenData.access_token}`,
            'User-Agent': 'CodeLens-App',
            'Accept': 'application/vnd.github.v3+json'
          },
        });

        if (emailResponse.ok) {
          const emails = await emailResponse.json();
          primaryEmail = emails.find(email => email.primary)?.email;
          console.log('Primary email found:', primaryEmail ? 'Yes' : 'No');
        }
      } catch (emailError) {
        console.warn('Failed to fetch emails:', emailError.message);
      }
    }

    // Create or update user in database
    console.log('Checking for existing user...');
    const { data: existingUser, error: findError } = await supabase
      .from('users')
      .select('*')
      .eq('github_id', githubUser.id)
      .single();

    if (findError && findError.code !== 'PGRST116') {
      console.error('Error finding existing user:', findError);
      throw findError;
    }

    let user;
    if (existingUser) {
      console.log('Updating existing user:', existingUser.id);
      // Update existing user
      const { data: updatedUser, error: updateError } = await supabase
        .from('users')
        .update({
          name: githubUser.name,
          email: primaryEmail,
          avatar_url: githubUser.avatar_url,
          last_login: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', existingUser.id)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating user:', updateError);
        throw updateError;
      }
      user = updatedUser;
    } else {
      console.log('Creating new user for GitHub ID:', githubUser.id);
      // Create new user with proper data structure
      const newUserData = {
        github_id: githubUser.id,
        username: githubUser.login,
        name: githubUser.name || githubUser.login,
        email: primaryEmail,
        avatar_url: githubUser.avatar_url,
        github_profile_url: `https://github.com/${githubUser.login}`,
        plan: 'free',
        credits_used: 0,
        credits_limit: 100,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        last_login: new Date().toISOString()
      };

      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert([newUserData])
        .select()
        .single();

      if (createError) {
        console.error('Error creating user:', createError);
        console.error('User data that failed:', newUserData);
        throw createError;
      }
      user = newUser;
    }

    if (!user) {
      throw new Error('Failed to create or update user');
    }

    console.log('User ready:', user.id);

    // Generate JWT token
    const token = generateToken(user);

    // Create session record
    try {
      await supabase
        .from('user_sessions')
        .insert([{
          user_id: user.id,
          session_token: token,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          ip_address: req.ip || req.connection.remoteAddress,
          user_agent: req.get('user-agent') || 'Unknown'
        }]);
      console.log('Session created for user:', user.id);
    } catch (sessionError) {
      console.warn('Session creation failed:', sessionError.message);
    }

    // Return token and user data to frontend
    const userData = {
      id: user.id,
      name: user.name,
      email: user.email,
      avatar: user.avatar_url,
      githubUsername: user.username,
      plan: user.plan || 'free',
      reviewsUsed: user.credits_used || 0,
      reviewsLimit: user.credits_limit || 100,
      isNewUser: !existingUser
    };

    console.log('Authentication successful for user:', user.id);

    res.json({
      success: true,
      token: token,
      user: userData
    });

  } catch (error) {
    console.error('POST OAuth callback error:', error);
    res.status(500).json({
      success: false,
      message: 'Authentication failed',
      error: 'AUTH_FAILED',
      details: error.message
    });
  }
});

// @route   POST /api/auth/verify-token
// @desc    Verify JWT token and return user info
// @access  Public
router.post('/verify-token', async (req, res) => {
  try {
    console.log('=== Verify Token ===');
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Token is required',
        error: 'MISSING_TOKEN'
      });
    }

    console.log('Verifying JWT token...');

    // Verify JWT
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log('Token decoded for user:', decoded.userId || decoded.id);
    } catch (jwtError) {
      console.error('JWT verification failed:', jwtError.message);
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token',
        error: 'INVALID_TOKEN'
      });
    }

    // Get user from database
    const userId = decoded.userId || decoded.id;
    const { data: user, error } = await supabase
      .from('users')
      .select('id, username, name, email, avatar_url, plan, credits_used, credits_limit, created_at')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Database error fetching user:', error);
      return res.status(401).json({
        success: false,
        message: 'User not found',
        error: 'USER_NOT_FOUND'
      });
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found',
        error: 'USER_NOT_FOUND'
      });
    }

    console.log('Token verification successful for user:', user.id);

    res.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar_url,
        githubUsername: user.username,
        plan: user.plan || 'free',
        reviewsUsed: user.credits_used || 0,
        reviewsLimit: user.credits_limit || 100,
        isNewUser: user.created_at && new Date(user.created_at) > new Date(Date.now() - 24*60*60*1000)
      },
      token: token
    });

  } catch (error) {
    console.error('Token verification error:', error);
    res.status(401).json({
      success: false,
      message: 'Invalid or expired token',
      error: 'TOKEN_VERIFICATION_FAILED',
      details: error.message
    });
  }
});

// @route   POST /api/auth/logout
// @desc    Logout user and invalidate session
// @access  Private
router.post('/logout', async (req, res) => {
  try {
    console.log('=== Logout User ===');
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (token) {
      console.log('Invalidating session...');
      try {
        await supabase
          .from('user_sessions')
          .delete()
          .eq('session_token', token);
        console.log('Session invalidated');
      } catch (sessionError) {
        console.warn('Failed to invalidate session:', sessionError.message);
      }
    }

    // Destroy passport session
    if (req.logout) {
      req.logout((err) => {
        if (err) {
          console.error('Passport logout error:', err);
        }
      });
    }

    console.log('Logout successful');

    res.json({
      success: true,
      message: 'Logged out successfully'
    });

  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Logout failed',
      error: 'LOGOUT_FAILED',
      details: error.message
    });
  }
});

// @route   GET /api/auth/me
// @desc    Get current user info
// @access  Private
router.get('/me', passport.authenticate('jwt', { session: false }), async (req, res) => {
  try {
    console.log('=== Get Me ===');
    console.log('Authenticated user:', req.user ? req.user.id : 'None');

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated',
        error: 'NOT_AUTHENTICATED'
      });
    }

    const { data: user, error } = await supabase
      .from('users')
      .select('id, username, name, email, avatar_url, plan, credits_used, credits_limit, created_at, last_login, bio')
      .eq('id', req.user.id)
      .single();

    if (error) {
      console.error('Database error:', error);
      return res.status(404).json({
        success: false,
        message: 'User not found',
        error: 'USER_NOT_FOUND'
      });
    }

    console.log('Returning user data for:', user.id);

    res.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar_url,
        githubUsername: user.username,
        plan: user.plan || 'free',
        reviewsUsed: user.credits_used || 0,
        reviewsLimit: user.credits_limit || 100,
        isNewUser: user.created_at && new Date(user.created_at) > new Date(Date.now() - 24*60*60*1000),
        bio: user.bio || ''
      }
    });

  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user information',
      error: 'SERVER_ERROR',
      details: error.message
    });
  }
});

// @route   GET /api/auth/status
// @desc    Check authentication status
// @access  Public
router.get('/status', (req, res) => {
  res.json({
    success: true,
    authenticated: req.isAuthenticated && req.isAuthenticated(),
    user: req.user ? {
      id: req.user.id,
      username: req.user.username,
      name: req.user.name,
      plan: req.user.plan
    } : null
  });
});

// @route   DELETE /api/auth/account
// @desc    Delete user account
// @access  Private
router.delete('/account', passport.authenticate('jwt', { session: false }), async (req, res) => {
  try {
    console.log('=== Delete Account ===');
    const userId = req.user.id;

    // Delete user's sessions
    await supabase
      .from('user_sessions')
      .delete()
      .eq('user_id', userId);

    // Delete user's reviews and associated data
    await supabase
      .from('code_reviews')
      .delete()
      .eq('user_id', userId);

    // Finally delete the user
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', userId);

    if (error) {
      throw error;
    }

    console.log('Account deleted successfully for user:', userId);

    res.json({
      success: true,
      message: 'Account deleted successfully'
    });

  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete account',
      error: 'DELETE_FAILED',
      details: error.message
    });
  }
});

module.exports = router;