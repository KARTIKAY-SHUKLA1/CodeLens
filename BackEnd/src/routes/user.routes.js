const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const Joi = require('joi');
const { authenticateToken } = require('../middleware/auth.middleware');
const router = express.Router();

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

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Validation schemas
const updateProfileSchema = Joi.object({
  name: Joi.string().min(1).max(255).optional(),
  bio: Joi.string().max(500).optional().allow(''),
  location: Joi.string().max(255).optional().allow(''),
  company: Joi.string().max(255).optional().allow(''),
  blog: Joi.string().uri().max(255).optional().allow('')
});

// Replace the preferencesSchema in your user.routes.js file with this:

const preferencesSchema = Joi.object({
  // Frontend sends 'favoriteLanguages' 
  favoriteLanguages: Joi.array().items(Joi.string()).optional(),
  primaryLanguages: Joi.array().items(Joi.string()).optional(), // Keep for backwards compatibility
  
  // Frontend sends 'experience' 
  experience: Joi.string().allow('').optional(),
  experienceLevel: Joi.string().valid('beginner', 'intermediate', 'advanced').optional(), // Keep for backwards compatibility
  
  // Frontend sends 'notifications'
  notifications: Joi.boolean().optional(),
  
  // This already matches
  goals: Joi.array().items(Joi.string()).optional(),
  
  // Keep existing fields for backwards compatibility
  codeStyle: Joi.string().valid('readable', 'compact', 'performant').optional(),
  reviewFocus: Joi.string().valid('bugs', 'performance', 'style', 'security').optional()
});

// @route   GET /api/users/profile
// @desc    Get user profile
// @access  Private
router.get('/profile', async (req, res) => {
  try {
    console.log('=== GET Profile Endpoint ===');
    console.log('Getting profile for user ID:', req.user?.id);

    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated',
        error: 'NO_USER_ID'
      });
    }

    // Get user info
    const { data: user, error } = await supabase
      .from('users')
      .select(`
        id, username, name, email, avatar_url, bio, 
        github_profile_url, plan, credits_used, credits_limit,
        created_at, last_login
      `)
      .eq('id', req.user.id)
      .single();

    if (error || !user) {
      return res.status(404).json({
        success: false,
        message: 'User profile not found',
        error: 'USER_NOT_FOUND',
        details: error?.message
      });
    }

    // Get user preferences
    const { data: userPrefs } = await supabase
      .from('user_preferences')
      .select('preferences')
      .eq('user_id', req.user.id)
      .single();

    // Get review stats
    const { data: reviewStats } = await supabase
      .from('code_reviews')
      .select('id, overall_score, language, created_at, status')
      .eq('user_id', req.user.id);

    const totalReviews = reviewStats?.length || 0;
    const completedReviews = reviewStats?.filter(r => r.status === 'completed').length || 0;
    const completedWithScores = reviewStats?.filter(r => r.status === 'completed' && r.overall_score != null) || [];
    const averageScore = completedWithScores.length > 0
      ? (completedWithScores.reduce((sum, r) => sum + r.overall_score, 0) / completedWithScores.length).toFixed(1)
      : 0;

    const languageStats = reviewStats?.reduce((acc, review) => {
      acc[review.language] = (acc[review.language] || 0) + 1;
      return acc;
    }, {}) || {};

    const topLanguages = Object.entries(languageStats)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([lang, count]) => ({ language: lang, count }));

    // Final response
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
        preferences: userPrefs?.preferences || {}
      },
      statistics: {
        totalReviews,
        completedReviews,
        averageScore: parseFloat(averageScore),
        topLanguages,
        creditsRemaining: (user.credits_limit || 100) - (user.credits_used || 0)
      }
    });

  } catch (error) {
    console.error('❌ Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user profile',
      error: 'SERVER_ERROR',
      details: error.message
    });
  }
});


// @route   POST /api/users/preferences
// @desc    Save user preferences (temporarily store in a separate table or JSON column)
// @access  Private
router.post('/preferences', async (req, res) => {
  try {
    console.log('=== POST Preferences Endpoint ===');
    console.log('Saving preferences for user ID:', req.user?.id);
    console.log('Preferences data:', JSON.stringify(req.body, null, 2));
    
    if (!req.user || !req.user.id) {
      console.log('❌ No user ID found in request');
      return res.status(401).json({
        success: false,
        message: 'User not authenticated',
        error: 'NO_USER_ID'
      });
    }

    const { error: validationError, value } = preferencesSchema.validate(req.body);
    
    if (validationError) {
      console.log('❌ Validation error:', validationError.details);
      return res.status(400).json({
        success: false,
        message: 'Invalid preferences data',
        error: 'VALIDATION_ERROR',
        errors: validationError.details.map(d => d.message)
      });
    }

    console.log('✅ Preferences validated, updating user...');

    // FIXED: Instead of updating preferences column, create/update in user_preferences table
    // First, try to upsert in a preferences table (you'll need to create this)
    try {
      const { data: existingPref, error: selectError } = await supabase
        .from('user_preferences')
        .select('user_id')
        .eq('user_id', req.user.id)
        .single();

      if (selectError && selectError.code !== 'PGRST116') { // Not "not found" error
        throw selectError;
      }

      let result;
      if (existingPref) {
        // Update existing preferences
        result = await supabase
          .from('user_preferences')
          .update({
            preferences: value,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', req.user.id);
      } else {
        // Create new preferences record
        result = await supabase
          .from('user_preferences')
          .insert({
            user_id: req.user.id,
            preferences: value,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
      }

      if (result.error) {
        console.warn('⚠️ Could not save to user_preferences table, this is OK for now');
      }
    } catch (prefError) {
      console.warn('⚠️ Preferences table may not exist yet, continuing...');
    }

    // Get updated user data
    const { data: updatedUser, error } = await supabase
      .from('users')
      .select('id, username, name, email, avatar_url, plan, credits_used, credits_limit')
      .eq('id', req.user.id)
      .single();

    if (error) {
      console.error('❌ Supabase error getting user after preferences save:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve user data after saving preferences',
        error: 'DATABASE_ERROR',
        details: error.message
      });
    }

    if (!updatedUser) {
      console.log('❌ No user returned after preferences save');
      return res.status(404).json({
        success: false,
        message: 'User not found after update',
        error: 'USER_UPDATE_FAILED'
      });
    }

    console.log('✅ Preferences saved successfully for user:', updatedUser.id);

    res.json({
      success: true,
      message: 'Preferences saved successfully',
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        avatar: updatedUser.avatar_url,
        githubUsername: updatedUser.username,
        plan: updatedUser.plan || 'free',
        reviewsUsed: updatedUser.credits_used || 0,
        reviewsLimit: updatedUser.credits_limit || 100,
        isNewUser: false,
        preferences: value // Return the saved preferences
      }
    });

  } catch (error) {
    console.error('❌ Save preferences error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save preferences',
      error: 'SERVER_ERROR',
      details: error.message
    });
  }
});

// @route   PUT /api/users/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', async (req, res) => {
  try {
    console.log('=== PUT Profile Endpoint ===');
    console.log('Updating profile for user ID:', req.user?.id);
    
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated',
        error: 'NO_USER_ID'
      });
    }

    const { error: validationError, value } = updateProfileSchema.validate(req.body);
    
    if (validationError) {
      return res.status(400).json({
        success: false,
        message: 'Invalid input data',
        error: 'VALIDATION_ERROR',
        errors: validationError.details.map(d => d.message)
      });
    }

    const updateData = {
      ...value,
      updated_at: new Date().toISOString()
    };

    const { data: updatedUser, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', req.user.id)
      .select('id, username, name, email, avatar_url, bio, github_profile_url, plan')
      .single();

    if (error) {
      console.error('❌ Supabase error updating profile:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to update profile',
        error: 'DATABASE_ERROR',
        details: error.message
      });
    }

    console.log('✅ Profile updated successfully');

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: updatedUser
    });

  } catch (error) {
    console.error('❌ Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile',
      error: 'SERVER_ERROR',
      details: error.message
    });
  }
});

// Rest of the routes remain the same...
// @route   GET /api/users/dashboard
// =========================
// GET /api/users/dashboard
// =========================
router.get('/dashboard', async (req, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized'
      });
    }

    // Get recent reviews
    const { data: recentReviews } = await supabase
      .from('code_reviews')
      .select('id, status, created_at, overall_score')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false })
      .limit(5);

    // Get user info for credits
    const { data: user } = await supabase
      .from('users')
      .select('credits_used, credits_limit')
      .eq('id', req.user.id)
      .single();

    // Compute average score from reviews
    const completedWithScores = recentReviews?.filter(r => r.status === 'completed' && r.overall_score != null) || [];
    const averageScore = completedWithScores.length > 0
      ? (completedWithScores.reduce((sum, r) => sum + r.overall_score, 0) / completedWithScores.length).toFixed(1)
      : 0;

    res.json({
      success: true,
      dashboard: {
        recentReviews: recentReviews || [],
        summary: {
          totalReviews: recentReviews?.length || 0,
          averageScore: parseFloat(averageScore),
          creditsUsed: user?.credits_used || 0,
          creditsLimit: user?.credits_limit || 100
        }
      }
    });

  } catch (error) {
    console.error('❌ Dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get dashboard data',
      error: error.message
    });
  }
});


// @route   GET /api/users/activity
router.get('/activity', async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    res.json({
      success: true,
      activities: [],
      pagination: {
        current: page,
        total: 0,
        hasNext: false,
        hasPrev: false
      }
    });

  } catch (error) {
    console.error('Activity error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get activity data'
    });
  }
});
// Get logged-in user's review history
router.get('/history', async (req, res) => {
  try {
    console.log('📜 Fetching history for user:', req.user.id);

    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 50, 100); 
    const offset = (page - 1) * limit;

    const { data: reviews, error } = await supabase
      .from('code_reviews')
      .select(`
        id, title, file_name, language, status,
        overall_score, created_at, updated_at
      `)
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    const { count, error: countError } = await supabase
      .from('code_reviews')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', req.user.id);

    if (countError) throw countError;

    res.json({
      success: true,
      reviews: reviews || [],
      pagination: {
        current: page,
        limit,
        total: Math.ceil((count || 0) / limit),
        count: count || 0,
        hasNext: offset + limit < (count || 0),
        hasPrev: page > 1
      }
    });

  } catch (err) {
    console.error('❌ Get review history error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch review history'
    });
  }
});

// =========================
// GET /api/users/:id/history
// =========================
// Get public user profile history
router.get('/:id/history', async (req, res) => {
  try {
    console.log('📜 Fetching history for user:', req.params.id);

    const { data: reviews, error } = await supabase
      .from('code_reviews')
      .select(`
        id,
        status,
        created_at,
        overall_score,
        language,
        title,
        file_name
      `) // Removed repositories() to avoid FK issues
      .eq('user_id', req.params.id)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) throw error;

    res.json({
      success: true,
      reviews: reviews || []
    });

  } catch (err) {
    console.error('❌ Error fetching user history:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user history'
    });
  }
});


module.exports = router;