const express = require('express');
const passport = require('passport');
const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');
const router = express.Router();

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL || 'https://db.oqrnlnvrrnugkxhjixyr.supabase.co',
  process.env.SUPABASE_SERVICE_KEY || process.env.DATABASE_URL?.split('@')[1]?.split('/')[0] || ''
);

// Generate JWT token
const generateToken = (user) => {
  return jwt.sign(
    { 
      userId: user.id, 
      username: user.username,
      email: user.email,
      plan: user.plan
    },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
};

// @route   GET /api/auth/github
// @desc    Start GitHub OAuth
// @access  Public
router.get('/github', passport.authenticate('github', { 
  scope: ['user:email', 'read:user'] 
}));

// @route   GET /api/auth/github/callback (Original OAuth callback)
// @desc    GitHub OAuth callback
// @access  Public
// Update your GitHub OAuth callback route (around line 34-47)
router.get('/github/callback',
  passport.authenticate('github', { failureRedirect: '/login' }),
  async (req, res) => {
    try {
      // Generate JWT token
      const token = generateToken(req.user);

      // Create session record
      await supabase
        .from('user_sessions')
        .insert([{
          user_id: req.user.id,
          session_token: token,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
          ip_address: req.ip,
          user_agent: req.get('user-agent')
        }]);

      // FIX: Redirect to frontend ROOT with token as query parameter
      // Your frontend will detect the token and handle auth automatically
      const frontendURL = process.env.CORS_ORIGIN || 'http://localhost:3000';
      const redirectURL = `${frontendURL}/?token=${token}&user=${encodeURIComponent(JSON.stringify({
        id: req.user.id,
        username: req.user.username,
        name: req.user.name,
        email: req.user.email,
        avatar: req.user.avatar_url,
        githubUsername: req.user.username,
        plan: req.user.plan,
        reviewsUsed: req.user.credits_used,
        reviewsLimit: req.user.credits_limit,
        isNewUser: req.user.created_at && new Date(req.user.created_at) > new Date(Date.now() - 24*60*60*1000)
      }))}`;

      res.redirect(redirectURL);
    } catch (error) {
      console.error('OAuth callback error:', error);
      const frontendURL = process.env.CORS_ORIGIN || 'http://localhost:3000';
      res.redirect(`${frontendURL}/?error=${encodeURIComponent('Authentication failed')}`);
    }
  }
);

// @route   POST /api/auth/github/callback (For frontend handleAuthCallback)
// @desc    Handle GitHub OAuth code from frontend
// @access  Public
router.post('/github/callback', async (req, res) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({
        success: false,
        message: 'Authorization code is required'
      });
    }

    // Exchange code for access token with GitHub
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code: code,
      }),
    });

    const tokenData = await tokenResponse.json();

    if (tokenData.error || !tokenData.access_token) {
      throw new Error('Failed to get access token');
    }

    // Get user info from GitHub
    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `token ${tokenData.access_token}`,
        'User-Agent': 'CodeLens-App',
      },
    });

    const githubUser = await userResponse.json();

    // Get user email if not public
    const emailResponse = await fetch('https://api.github.com/user/emails', {
      headers: {
        'Authorization': `token ${tokenData.access_token}`,
        'User-Agent': 'CodeLens-App',
      },
    });

    const emails = await emailResponse.json();
    const primaryEmail = emails.find(email => email.primary)?.email || githubUser.email;

    // Create or update user in database
    const { data: existingUser } = await supabase
      .from('users')
      .select('*')
      .eq('github_id', githubUser.id)
      .single();

    let user;
    if (existingUser) {
      // Update existing user
      const { data: updatedUser } = await supabase
        .from('users')
        .update({
          name: githubUser.name,
          email: primaryEmail,
          avatar_url: githubUser.avatar_url,
          last_login: new Date().toISOString(),
        })
        .eq('id', existingUser.id)
        .select()
        .single();
      user = updatedUser;
    } else {
      // Create new user
      const { data: newUser } = await supabase
        .from('users')
        .insert({
          github_id: githubUser.id,
          username: githubUser.login,
          name: githubUser.name,
          email: primaryEmail,
          avatar_url: githubUser.avatar_url,
          plan: 'free',
          credits_used: 0,
          credits_limit: 10,
        })
        .select()
        .single();
      user = newUser;
    }

    // Generate JWT token
    const token = generateToken(user);

    // Create session record
    await supabase
      .from('user_sessions')
      .insert([{
        user_id: user.id,
        session_token: token,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        ip_address: req.ip,
        user_agent: req.get('user-agent')
      }]);

    // Return token and user data to frontend
    res.json({
      success: true,
      token: token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar_url,
        githubUsername: user.username,
        plan: user.plan,
        reviewsUsed: user.credits_used,
        reviewsLimit: user.credits_limit,
        isNewUser: !existingUser
      }
    });

  } catch (error) {
    console.error('OAuth callback error:', error);
    res.status(500).json({
      success: false,
      message: 'Authentication failed'
    });
  }
});

// @route   POST /api/auth/verify-token
// @desc    Verify JWT token and return user info
// @access  Public
router.post('/verify-token', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Token is required'
      });
    }

    // Verify JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get user from database
    const { data: user, error } = await supabase
      .from('users')
      .select('id, username, name, email, avatar_url, plan, credits_used, credits_limit, created_at')
      .eq('id', decoded.userId)
      .single();

    if (error || !user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }

    res.json({
      success: true,
      user: user,
      token: token
    });

  } catch (error) {
    console.error('Token verification error:', error);
    res.status(401).json({
      success: false,
      message: 'Invalid or expired token'
    });
  }
});

// @route   POST /api/auth/logout
// @desc    Logout user and invalidate session
// @access  Private
router.post('/logout', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (token) {
      // Remove session from database
      await supabase
        .from('user_sessions')
        .delete()
        .eq('session_token', token);
    }

    // Destroy passport session
    req.logout((err) => {
      if (err) {
        console.error('Logout error:', err);
      }
    });

    res.json({
      success: true,
      message: 'Logged out successfully'
    });

  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Logout failed'
    });
  }
});

// @route   GET /api/auth/me
// @desc    Get current user info (Original route - keeping for compatibility)
// @access  Private
router.get('/me', passport.authenticate('jwt', { session: false }), async (req, res) => {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('id, username, name, email, avatar_url, plan, credits_used, credits_limit, created_at, last_login')
      .eq('id', req.user.id)
      .single();

    if (error) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      user: user
    });

  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user information'
    });
  }
});

// @route   GET /api/auth/status
// @desc    Check authentication status
// @access  Public
router.get('/status', (req, res) => {
  res.json({
    authenticated: req.isAuthenticated(),
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
    const userId = req.user.id;

    // Delete user's sessions
    await supabase
      .from('user_sessions')
      .delete()
      .eq('user_id', userId);

    // Delete user's reviews and associated data (cascade should handle this)
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

    res.json({
      success: true,
      message: 'Account deleted successfully'
    });

  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete account'
    });
  }
});

module.exports = router;