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

const preferencesSchema = Joi.object({
  primaryLanguages: Joi.array().items(Joi.string()).optional(),
  codeStyle: Joi.string().valid('readable', 'compact', 'performant').optional(),
  reviewFocus: Joi.string().valid('bugs', 'performance', 'style', 'security').optional(),
  experienceLevel: Joi.string().valid('beginner', 'intermediate', 'advanced').optional(),
  goals: Joi.array().items(Joi.string()).optional()
});

// @route   GET /api/users/profile
// @desc    Get user profile
// @access  Private
router.get('/profile', async (req, res) => {
  try {
    console.log('=== GET Profile Endpoint ===');
    console.log('Getting profile for user ID:', req.user?.id);
    
    if (!req.user || !req.user.id) {
      console.log('❌ No user ID found in request');
      return res.status(401).json({
        success: false,
        message: 'User not authenticated',
        error: 'NO_USER_ID'
      });
    }

    console.log('Querying Supabase for user:', req.user.id);

    const { data: user, error } = await supabase
      .from('users')
      .select(`
        id, username, name, email, avatar_url, bio, 
        github_profile_url, plan, credits_used, credits_limit,
        created_at, last_login, preferences
      `)
      .eq('id', req.user.id)
      .single();

    if (error) {
      console.error('❌ Supabase error getting user:', error);
      return res.status(404).json({
        success: false,
        message: 'User profile not found',
        error: 'USER_NOT_FOUND',
        details: error.message
      });
    }

    if (!user) {
      console.log('❌ No user data returned from Supabase');
      return res.status(404).json({
        success: false,
        message: 'User profile not found',
        error: 'USER_NOT_FOUND'
      });
    }

    console.log('✅ User found:', user.id);

    // Get user statistics
    const { data: reviewStats, error: statsError } = await supabase
      .from('code_reviews')
      .select('id, overall_score, language, created_at, status')
      .eq('user_id', req.user.id);

    if (statsError) {
      console.error('⚠️ Error getting user stats:', statsError);
    }

    // Calculate statistics
    const totalReviews = reviewStats?.length || 0;
    const completedReviews = reviewStats?.filter(r => r.status === 'completed').length || 0;
    const averageScore = reviewStats?.length > 0 
      ? (reviewStats.reduce((sum, r) => sum + (r.overall_score || 0), 0) / reviewStats.length).toFixed(1)
      : 0;
    
    const languageStats = reviewStats?.reduce((acc, review) => {
      acc[review.language] = (acc[review.language] || 0) + 1;
      return acc;
    }, {}) || {};

    const topLanguages = Object.entries(languageStats)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([lang, count]) => ({ language: lang, count }));

    // Format response to match frontend expectations
    const formattedUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      avatar: user.avatar_url,
      githubUsername: user.username,
      plan: user.plan || 'free',
      reviewsUsed: user.credits_used || 0,
      reviewsLimit: user.credits_limit || 100,
      isNewUser: user.created_at && new Date(user.created_at) > new Date(Date.now() - 24*60*60*1000),
      preferences: user.preferences || {}
    };

    console.log('✅ Returning user profile for:', formattedUser.id);
    
    res.json({
      success: true,
      user: formattedUser,
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
// @desc    Save user preferences from onboarding
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

    // Update user preferences
    const { data: updatedUser, error } = await supabase
      .from('users')
      .update({
        preferences: value,
        updated_at: new Date().toISOString()
      })
      .eq('id', req.user.id)
      .select('id, username, name, email, avatar_url, plan, credits_used, credits_limit, preferences')
      .single();

    if (error) {
      console.error('❌ Supabase error updating preferences:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to save preferences to database',
        error: 'DATABASE_ERROR',
        details: error.message
      });
    }

    if (!updatedUser) {
      console.log('❌ No user returned after update');
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
        preferences: updatedUser.preferences || {}
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

// @route   GET /api/users/dashboard
// @desc    Get user dashboard data
// @access  Private
router.get('/dashboard', async (req, res) => {
  try {
    console.log('=== GET Dashboard Endpoint ===');
    
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated',
        error: 'NO_USER_ID'
      });
    }

    const userId = req.user.id;

    // Get recent reviews
    const { data: recentReviews, error: reviewsError } = await supabase
      .from('code_reviews')
      .select('id, title, language, overall_score, created_at, status, issues_count')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (reviewsError) {
      console.error('❌ Error getting recent reviews:', reviewsError);
      throw reviewsError;
    }

    // Get monthly review count for the chart
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: monthlyReviews, error: monthlyError } = await supabase
      .from('code_reviews')
      .select('created_at')
      .eq('user_id', userId)
      .gte('created_at', thirtyDaysAgo.toISOString());

    if (monthlyError) {
      console.error('❌ Error getting monthly reviews:', monthlyError);
      throw monthlyError;
    }

    // Process monthly data for chart
    const dailyReviewCounts = {};
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      dailyReviewCounts[dateStr] = 0;
    }

    monthlyReviews?.forEach(review => {
      const dateStr = review.created_at.split('T')[0];
      if (dailyReviewCounts.hasOwnProperty(dateStr)) {
        dailyReviewCounts[dateStr]++;
      }
    });

    const chartData = Object.entries(dailyReviewCounts).map(([date, count]) => ({
      date,
      reviews: count
    }));

    // Get language distribution
    const { data: languageData, error: langError } = await supabase
      .from('code_reviews')
      .select('language')
      .eq('user_id', userId);

    if (langError) {
      console.error('❌ Error getting language data:', langError);
      throw langError;
    }

    const languageDistribution = languageData?.reduce((acc, review) => {
      acc[review.language] = (acc[review.language] || 0) + 1;
      return acc;
    }, {}) || {};

    const languageStats = Object.entries(languageDistribution)
      .sort(([,a], [,b]) => b - a)
      .map(([language, count]) => ({ language, count }));

    console.log('✅ Dashboard data retrieved successfully');

    res.json({
      success: true,
      data: {
        recentReviews: recentReviews || [],
        chartData,
        languageStats,
        summary: {
          totalReviews: recentReviews?.length || 0,
          averageScore: recentReviews?.length > 0 
            ? (recentReviews.reduce((sum, r) => sum + (r.overall_score || 0), 0) / recentReviews.length).toFixed(1)
            : 0,
          creditsUsed: req.user.credits_used || 0,
          creditsLimit: req.user.credits_limit || 100
        }
      }
    });

  } catch (error) {
    console.error('❌ Dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to load dashboard data',
      error: 'SERVER_ERROR',
      details: error.message
    });
  }
});

// @route   GET /api/users/activity
// @desc    Get user activity feed
// @access  Private
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
    const offset = (page - 1) * limit;

    const { data: activities, error } = await supabase
      .from('code_reviews')
      .select('id, title, language, overall_score, created_at, status, issues_count, suggestions_count')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw error;
    }

    // Get total count for pagination
    const { count, error: countError } = await supabase
      .from('code_reviews')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', req.user.id);

    if (countError) {
      throw countError;
    }

    res.json({
      success: true,
      activities: activities || [],
      pagination: {
        current: page,
        total: Math.ceil((count || 0) / limit),
        hasNext: offset + limit < (count || 0),
        hasPrev: page > 1
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

// @route   POST /api/users/upgrade
// @desc    Upgrade user plan
// @access  Private
router.post('/upgrade', async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    const { plan } = req.body;

    if (!['pro'].includes(plan)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid plan type'
      });
    }

    // Update user plan
    const { data: updatedUser, error } = await supabase
      .from('users')
      .update({ 
        plan: plan,
        credits_limit: plan === 'pro' ? 1000 : 100,
        updated_at: new Date().toISOString()
      })
      .eq('id', req.user.id)
      .select('id, username, plan, credits_limit')
      .single();

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      message: `Successfully upgraded to ${plan} plan`,
      user: updatedUser
    });

  } catch (error) {
    console.error('Upgrade error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upgrade plan'
    });
  }
});

module.exports = router;