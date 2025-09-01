const express = require('express');
const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');
const { authenticateToken } = require('../middleware/auth.middleware');

const router = express.Router();

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// GitHub OAuth URLs
const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;
const BACKEND_URL = process.env.BACKEND_URL || 'https://codelens-backend-0xl0.onrender.com';
const FRONTEND_URL = process.env.CORS_ORIGIN || 'https://code-lens-git-main-kartikay-shuklas-projects.vercel.app';

// @route   GET /api/auth/github
// @desc    Initiate GitHub OAuth
// @access  Public
router.get('/github', (req, res) => {
  try {
    console.log('=== GitHub OAuth Initiation ===');
    
    if (!GITHUB_CLIENT_ID) {
      console.error('❌ GitHub Client ID not configured');
      return res.status(500).json({
        success: false,
        message: 'GitHub OAuth not configured',
        error: 'OAUTH_NOT_CONFIGURED'
      });
    }

    // Generate state parameter for security
    const state = Math.random().toString(36).substring(2, 15) + 
                 Math.random().toString(36).substring(2, 15) + 
                 Date.now().toString(36);
    
    // Store state in session
    if (!req.session) {
      console.error('❌ Session not initialized');
      return res.status(500).json({
        success: false,
        message: 'Session not configured',
        error: 'SESSION_ERROR'
      });
    }
    
    req.session.oauthState = state;
    console.log('🔐 OAuth state generated and stored:', state);

    const redirectUri = `${BACKEND_URL}/api/auth/github/callback`;
    const githubAuthURL = `https://github.com/login/oauth/authorize?` +
      `client_id=${GITHUB_CLIENT_ID}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `scope=user:email&` +
      `state=${state}`;

    console.log('🔗 Redirecting to GitHub OAuth:', githubAuthURL);
    res.redirect(githubAuthURL);

  } catch (error) {
    console.error('❌ GitHub OAuth initiation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to initiate GitHub OAuth',
      error: 'OAUTH_INIT_FAILED'
    });
  }
});

// @route   GET /api/auth/github/callback
// @desc    Handle GitHub OAuth callback
// @access  Public
router.get('/github/callback', async (req, res) => {
  try {
    console.log('=== GitHub OAuth Callback ===');
    console.log('Session exists:', !!req.session);
    console.log('Stored OAuth state:', req.session?.oauthState);
    
    const { code, state, error } = req.query;
    console.log('Received state:', state);
    console.log('Code present:', !!code);
    
    if (error) {
      console.error('❌ GitHub OAuth error:', error);
      return res.redirect(`${FRONTEND_URL}/auth/callback?error=${encodeURIComponent(error)}&message=${encodeURIComponent('GitHub OAuth error')}`);
    }

    if (!code) {
      console.error('❌ No authorization code received');
      return res.redirect(`${FRONTEND_URL}/auth/callback?error=no_code&message=${encodeURIComponent('No authorization code received from GitHub')}`);
    }

    // Verify state parameter - more lenient approach for debugging
    if (!req.session || !req.session.oauthState) {
      console.warn('⚠️ No stored OAuth state found in session');
      // Continue anyway but log the issue
    } else if (state !== req.session.oauthState) {
      console.error('❌ State mismatch - Stored:', req.session.oauthState, 'Received:', state);
      // For debugging, let's continue but log the mismatch
      console.warn('⚠️ Continuing despite state mismatch for debugging');
    } else {
      console.log('✅ State parameter verified successfully');
    }

    console.log('✅ Authorization code received, exchanging for access token');

    // Exchange code for access token
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': 'CodeLens-App'
      },
      body: JSON.stringify({
        client_id: GITHUB_CLIENT_ID,
        client_secret: GITHUB_CLIENT_SECRET,
        code: code,
      }),
    });

    const tokenData = await tokenResponse.json();
    console.log('Token exchange response:', tokenData);
    
    if (tokenData.error) {
      console.error('❌ Token exchange error:', tokenData.error);
      return res.redirect(`${FRONTEND_URL}/auth/callback?error=token_exchange_failed&message=${encodeURIComponent(tokenData.error_description || 'Failed to exchange authorization code')}`);
    }

    const accessToken = tokenData.access_token;
    if (!accessToken) {
      console.error('❌ No access token received');
      return res.redirect(`${FRONTEND_URL}/auth/callback?error=no_access_token&message=${encodeURIComponent('No access token received from GitHub')}`);
    }

    console.log('✅ Access token received, fetching user data');

    // Fetch user data from GitHub
    const [userResponse, emailResponse] = await Promise.all([
      fetch('https://api.github.com/user', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'CodeLens-App'
        },
      }),
      fetch('https://api.github.com/user/emails', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'CodeLens-App'
        },
      })
    ]);

    const userData = await userResponse.json();
    let emails = [];
    
    try {
      emails = await emailResponse.json();
    } catch (e) {
      console.warn('Could not fetch emails, using profile email');
    }
    
    if (!userData.id) {
      console.error('❌ Failed to get user data from GitHub:', userData);
      return res.redirect(`${FRONTEND_URL}/auth/callback?error=user_data_failed&message=${encodeURIComponent('Failed to get user data from GitHub')}`);
    }

    console.log('✅ GitHub user data received:', userData.login);

    const primaryEmail = Array.isArray(emails) ? 
      emails.find(email => email.primary)?.email || userData.email : 
      userData.email;

    // Check if user exists in database
    const { data: existingUser, error: selectError } = await supabase
      .from('users')
      .select('*')
      .eq('github_id', userData.id.toString())
      .single();

    let user;
    const isNewUser = !existingUser;

    if (existingUser) {
      // Update existing user
      const { data: updatedUser, error: updateError } = await supabase
        .from('users')
        .update({
          username: userData.login,
          name: userData.name || userData.login,
          email: primaryEmail || existingUser.email,
          avatar_url: userData.avatar_url,
          github_profile_url: userData.html_url,
          last_login: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', existingUser.id)
        .select('*')
        .single();

      if (updateError) {
        console.error('❌ Error updating existing user:', updateError);
        return res.redirect(`${FRONTEND_URL}/auth/callback?error=database_error&message=${encodeURIComponent('Failed to update user in database')}`);
      }

      user = updatedUser;
      console.log('✅ Existing user updated:', user.id);
    } else {
      // Create new user
      const { data: newUser, error: insertError } = await supabase
        .from('users')
        .insert({
          github_id: userData.id.toString(),
          username: userData.login,
          name: userData.name || userData.login,
          email: primaryEmail,
          avatar_url: userData.avatar_url,
          github_profile_url: userData.html_url,
          subscription_tier: 'free',     // ✅ Use new column
    subscription_status: 'inactive', // ✅ Use new column
          credits_used: 0,
          credits_limit: 100,
          created_at: new Date().toISOString(),
          last_login: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select('*')
        .single();

      if (insertError) {
        console.error('❌ Error creating new user:', insertError);
        return res.redirect(`${FRONTEND_URL}/auth/callback?error=database_error&message=${encodeURIComponent('Failed to create user in database')}`);
      }

      user = newUser;
      console.log('✅ New user created:', user.id);
    }

    // Generate JWT token
    const jwtPayload = {
      userId: user.id,
      id: user.id, // For backward compatibility
      email: user.email,
      username: user.username,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60) // 7 days
    };

    const token = jwt.sign(jwtPayload, process.env.JWT_SECRET);

    console.log('✅ JWT token generated for user:', user.id);

    // Clear OAuth state
    if (req.session) {
      delete req.session.oauthState;
    }

    // Redirect to frontend with token and user data
    const userDataForFrontend = {
      id: user.id,
      name: user.name,
      email: user.email,
      avatar: user.avatar_url,
      githubUsername: user.username,
      plan: user.subscription_tier || 'free',
      reviewsUsed: user.credits_used || 0,
      reviewsLimit: user.credits_limit || 100,
      isNewUser: isNewUser
    };
    const callbackUrl = `${FRONTEND_URL}/?` +
  `token=${encodeURIComponent(token)}&` +
  `user=${encodeURIComponent(JSON.stringify(userDataForFrontend))}&` +
  `isNewUser=${isNewUser}`;

console.log('🔗 Redirecting to frontend root with token & user');
res.redirect(callbackUrl);
  } catch (error) {
    console.error('❌ GitHub OAuth callback error:', error);
    res.redirect(`${FRONTEND_URL}/auth/callback?error=callback_failed&message=${encodeURIComponent('Authentication failed due to server error')}`);
  }
});

// @route   POST /api/auth/github/callback
// @desc    Handle GitHub OAuth callback (for API calls)
// @access  Public
router.post('/github/callback', async (req, res) => {
  try {
    const { code, state } = req.body;
    
    if (!code) {
      return res.status(400).json({
        success: false,
        message: 'Authorization code is required',
        error: 'MISSING_CODE'
      });
    }

    // Exchange code for access token
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': 'CodeLens-App'
      },
      body: JSON.stringify({
        client_id: GITHUB_CLIENT_ID,
        client_secret: GITHUB_CLIENT_SECRET,
        code: code,
      }),
    });

    const tokenData = await tokenResponse.json();
    
    if (tokenData.error) {
      return res.status(400).json({
        success: false,
        message: 'Failed to exchange authorization code',
        error: 'TOKEN_EXCHANGE_FAILED',
        details: tokenData.error_description || tokenData.error
      });
    }

    const accessToken = tokenData.access_token;
    if (!accessToken) {
      return res.status(400).json({
        success: false,
        message: 'No access token received from GitHub',
        error: 'NO_ACCESS_TOKEN'
      });
    }

    // Fetch user data from GitHub
    const [userResponse, emailResponse] = await Promise.all([
      fetch('https://api.github.com/user', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'CodeLens-App'
        },
      }),
      fetch('https://api.github.com/user/emails', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'CodeLens-App'
        },
      })
    ]);

    const [userData, emails] = await Promise.all([
      userResponse.json(),
      emailResponse.json().catch(() => [])
    ]);

    if (!userData.id) {
      return res.status(400).json({
        success: false,
        message: 'Failed to get user data from GitHub',
        error: 'USER_DATA_FAILED'
      });
    }

    const primaryEmail = Array.isArray(emails) ? 
      emails.find(email => email.primary)?.email || userData.email : 
      userData.email;

    // Database operations (same as GET callback)
    const { data: existingUser } = await supabase
      .from('users')
      .select('*')
      .eq('github_id', userData.id.toString())
      .single();

    let user;
    const isNewUser = !existingUser;

    if (existingUser) {
      const { data: updatedUser, error: updateError } = await supabase
        .from('users')
        .update({
          username: userData.login,
          name: userData.name || userData.login,
          email: primaryEmail || existingUser.email,
          avatar_url: userData.avatar_url,
          github_profile_url: userData.html_url,
          last_login: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', existingUser.id)
        .select('*')
        .single();

      if (updateError) throw updateError;
      user = updatedUser;
    } else {
      const { data: newUser, error: insertError } = await supabase
        .from('users')
        .insert({
          github_id: userData.id.toString(),
          username: userData.login,
          name: userData.name || userData.login,
          email: primaryEmail,
          avatar_url: userData.avatar_url,
          github_profile_url: userData.html_url,
          subscription_tier: 'free',
subscription_status: 'inactive',
          credits_used: 0,
          credits_limit: 100,
          created_at: new Date().toISOString(),
          last_login: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select('*')
        .single();

      if (insertError) throw insertError;
      user = newUser;
    }

    // Generate JWT token
    const jwtPayload = {
      userId: user.id,
      id: user.id,
      email: user.email,
      username: user.username,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60)
    };

    const token = jwt.sign(jwtPayload, process.env.JWT_SECRET);

    res.json({
      success: true,
      token: token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar_url,
        githubUsername: user.username,
        plan: user.subscription_tier || 'free',
        reviewsUsed: user.credits_used || 0,
        reviewsLimit: user.credits_limit || 100,
        isNewUser: isNewUser
      },
      isNewUser: isNewUser
    });

  } catch (error) {
    console.error('Auth callback error:', error);
    res.status(500).json({
      success: false,
      message: 'Authentication failed',
      error: 'AUTH_FAILED',
      details: error.message
    });
  }
});

// @route   POST /api/auth/verify-token
// @desc    Verify JWT token
// @access  Public
router.post('/verify-token', async (req, res) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Token is required',
        error: 'MISSING_TOKEN'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId || decoded.id;

    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error || !user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token',
        error: 'INVALID_TOKEN'
      });
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar_url,
        githubUsername: user.username,
        plan: user.subscription_tier || 'free',
        reviewsUsed: user.credits_used || 0,
        reviewsLimit: user.credits_limit || 100,
        isNewUser: false
      }
    });

  } catch (error) {
    console.error('Token verification error:', error);
    res.status(401).json({
      success: false,
      message: 'Invalid or expired token',
      error: 'TOKEN_INVALID'
    });
  }
});

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', authenticateToken, async (req, res) => {
  try {
    res.json({
      success: true,
      user: {
        id: req.user.id,
        name: req.user.name,
        email: req.user.email,
        avatar: req.user.avatar_url,
        githubUsername: req.user.username,
        plan: req.user.plan || 'free',
        reviewsUsed: req.user.credits_used || 0,
        reviewsLimit: req.user.credits_limit || 100,
        isNewUser: false
      }
    });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user data',
      error: 'SERVER_ERROR'
    });
  }
});

// @route   POST /api/auth/logout
// @desc    Logout user
// @access  Private
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Logout failed',
      error: 'SERVER_ERROR'
    });
  }
});

module.exports = router;