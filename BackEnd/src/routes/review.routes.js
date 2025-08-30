const express = require('express');
const passport = require('passport');
const { createClient } = require('@supabase/supabase-js');
const Joi = require('joi');
const router = express.Router();

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL || 'https://oqrnlnvrrnugkxhjixyr.supabase.co',
  process.env.SUPABASE_SERVICE_KEY
);

// Middleware to authenticate all review routes
router.use(passport.authenticate('jwt', { session: false }));

// Validation schemas
const createReviewSchema = Joi.object({
  title: Joi.string().min(1).max(255).optional(),
  code_content: Joi.string().min(1).required(),
  language: Joi.string().min(1).max(50).required(),
  file_name: Joi.string().max(255).optional(),
  tags: Joi.array().items(Joi.string()).optional(),
  is_public: Joi.boolean().optional()
});

const updateReviewSchema = Joi.object({
  title: Joi.string().min(1).max(255).optional(),
  tags: Joi.array().items(Joi.string()).optional(),
  is_public: Joi.boolean().optional(),
  is_favorite: Joi.boolean().optional()
});

// @route   POST /api/reviews/increment
// @desc    Increment user's review usage count
// @access  Private
router.post('/increment', async (req, res) => {
  try {
    // Check user credits before incrementing
    if (req.user.credits_used >= req.user.credits_limit) {
      return res.status(403).json({
        success: false,
        message: 'Credit limit exceeded. Please upgrade your plan.',
        credits: {
          used: req.user.credits_used,
          limit: req.user.credits_limit
        }
      });
    }

    // Increment user's credits_used
    const { data: updatedUser, error } = await supabase
      .from('users')
      .update({ 
        credits_used: req.user.credits_used + 1,
        updated_at: new Date().toISOString()
      })
      .eq('id', req.user.id)
      .select('credits_used, credits_limit')
      .single();

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      message: 'Review usage incremented successfully',
      reviewsUsed: updatedUser.credits_used,
      reviewsLimit: updatedUser.credits_limit,
      creditsRemaining: updatedUser.credits_limit - updatedUser.credits_used
    });

  } catch (error) {
    console.error('Increment review usage error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update review usage'
    });
  }
});

// @route   GET /api/reviews/history
// @desc    Get user's review history for Profile page (ADDED THIS NEW ENDPOINT)
// @access  Private
router.get('/history', async (req, res) => {
  try {
    console.log('=== GET Review History Endpoint ===');
    console.log('Fetching history for user:', req.user.id);

    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit) || 50, 100); // Max 100
    const offset = (page - 1) * limit;

    // Get reviews
    const { data: reviews, error } = await supabase
      .from('code_reviews')
      .select(`
        id, title, code_content, language, file_name, overall_score,
        issues_count, suggestions_count, status, tags, is_public, 
        is_favorite, created_at, updated_at, analysis_result
      `)
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('❌ Error fetching review history:', error);
      throw error;
    }

    console.log(`✅ Found ${reviews?.length || 0} reviews for user ${req.user.id}`);

    // Get total count for pagination
    const { count, error: countError } = await supabase
      .from('code_reviews')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', req.user.id);

    if (countError) {
      console.error('❌ Error getting review count:', countError);
      throw countError;
    }

    res.json({
      success: true,
      reviews: reviews || [],
      pagination: {
        current: page,
        limit,
        totalPages: Math.ceil((count || 0) / limit),
        totalItems: count || 0,
        hasNext: offset + limit < (count || 0),
        hasPrev: page > 1
      }
    });

  } catch (error) {
    console.error('❌ Get review history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch review history',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get user review statistics
router.get('/stats', async (req, res) => {
  try {
    console.log('📊 Fetching review stats for user:', req.user.id);

    const { data: reviews, error } = await supabase
      .from('code_reviews')
      .select('language, overall_score, created_at, status, issues_count, suggestions_count')
      .eq('user_id', req.user.id);

    if (error) throw error;

    const stats = {
      totalReviews: reviews?.length || 0,
      completedReviews: reviews?.filter(r => r.status === 'completed').length || 0,
      pendingReviews: reviews?.filter(r => r.status === 'pending').length || 0,
      failedReviews: reviews?.filter(r => r.status === 'error').length || 0,
      averageScore: 0,
      totalIssues: 0,
      totalSuggestions: 0,
      languageDistribution: {},
      monthlyTrend: {},
      scoreDistribution: { excellent: 0, good: 0, average: 0, poor: 0 }
    };

    if (reviews?.length) {
      const completed = reviews.filter(r => r.status === 'completed' && r.overall_score != null);
      if (completed.length) {
        stats.averageScore = parseFloat(
          (completed.reduce((sum, r) => sum + r.overall_score, 0) / completed.length).toFixed(1)
        );
      }

      stats.totalIssues = reviews.reduce((sum, r) => sum + (r.issues_count || 0), 0);
      stats.totalSuggestions = reviews.reduce((sum, r) => sum + (r.suggestions_count || 0), 0);

      reviews.forEach(r => {
        stats.languageDistribution[r.language] = (stats.languageDistribution[r.language] || 0) + 1;
      });

      completed.forEach(r => {
        if (r.overall_score >= 8) stats.scoreDistribution.excellent++;
        else if (r.overall_score >= 6) stats.scoreDistribution.good++;
        else if (r.overall_score >= 4) stats.scoreDistribution.average++;
        else stats.scoreDistribution.poor++;
      });

      const twelveMonthsAgo = new Date();
      twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
      reviews
        .filter(r => new Date(r.created_at) >= twelveMonthsAgo)
        .forEach(r => {
          const month = new Date(r.created_at).toISOString().slice(0, 7);
          stats.monthlyTrend[month] = (stats.monthlyTrend[month] || 0) + 1;
        });
    }

    res.json({ success: true, stats });
  } catch (err) {
    console.error('❌ Error in /stats:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch stats' });
  }
});


// @route   GET /api/reviews
// @desc    Get user's code reviews with pagination
// @access  Private
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 10, 50);
    const offset = (page - 1) * limit;
    const language = req.query.language;
    const status = req.query.status;
    const search = req.query.search;

    let query = supabase
      .from('code_reviews')
      .select(`
        id, title, code_content, language, file_name, overall_score,
        issues_count, suggestions_count, status, tags, is_public, 
        is_favorite, created_at, updated_at
      `)
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });

    // Apply filters
    if (language) {
      query = query.eq('language', language);
    }
    if (status) {
      query = query.eq('status', status);
    }
    if (search) {
      query = query.or(`title.ilike.%${search}%,code_content.ilike.%${search}%`);
    }

    const { data: reviews, error } = await query.range(offset, offset + limit - 1);

    if (error) {
      throw error;
    }

    // Get total count for pagination
    let countQuery = supabase
      .from('code_reviews')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', req.user.id);

    if (language) countQuery = countQuery.eq('language', language);
    if (status) countQuery = countQuery.eq('status', status);
    if (search) countQuery = countQuery.or(`title.ilike.%${search}%,code_content.ilike.%${search}%`);

    const { count, error: countError } = await countQuery;

    if (countError) {
      throw countError;
    }

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

  } catch (error) {
    console.error('Get reviews error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch reviews'
    });
  }
});

// @route   POST /api/reviews
// @desc    Create a new code review
// @access  Private
router.post('/', async (req, res) => {
  try {
    const { error: validationError, value } = createReviewSchema.validate(req.body);
    
    if (validationError) {
      return res.status(400).json({
        success: false,
        message: 'Invalid input data',
        errors: validationError.details.map(d => d.message)
      });
    }

    // Check user credits
    if (req.user.credits_used >= req.user.credits_limit) {
      return res.status(403).json({
        success: false,
        message: 'Credit limit exceeded. Please upgrade your plan.',
        credits: {
          used: req.user.credits_used,
          limit: req.user.credits_limit
        }
      });
    }

    // Create review record
    const reviewData = {
      user_id: req.user.id,
      title: value.title || 'Untitled Review',
      code_content: value.code_content,
      language: value.language,
      file_name: value.file_name,
      tags: value.tags || [],
      is_public: value.is_public || false,
      status: 'pending'
    };

    const { data: newReview, error } = await supabase
      .from('code_reviews')
      .insert([reviewData])
      .select()
      .single();

    if (error) {
      throw error;
    }

    res.status(201).json({
      success: true,
      message: 'Review created successfully',
      review: newReview
    });

  } catch (error) {
    console.error('Create review error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create review'
    });
  }
});

// @route   GET /api/reviews/public
// @desc    Get public code reviews
// @access  Private
router.get('/public', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 10, 50);
    const offset = (page - 1) * limit;
    const language = req.query.language;

    let query = supabase
      .from('code_reviews')
      .select(`
        id, title, language, overall_score, created_at,
        issues_count, suggestions_count, tags,
        users(username, name, avatar_url)
      `)
      .eq('is_public', true)
      .eq('status', 'completed')
      .order('created_at', { ascending: false });

    if (language) {
      query = query.eq('language', language);
    }

    const { data: publicReviews, error } = await query.range(offset, offset + limit - 1);

    if (error) {
      throw error;
    }

    // Get total count
    let countQuery = supabase
      .from('code_reviews')
      .select('*', { count: 'exact', head: true })
      .eq('is_public', true)
      .eq('status', 'completed');

    if (language) countQuery = countQuery.eq('language', language);

    const { count, error: countError } = await countQuery;

    if (countError) {
      throw countError;
    }

    res.json({
      success: true,
      reviews: publicReviews || [],
      pagination: {
        current: page,
        limit,
        total: Math.ceil((count || 0) / limit),
        count: count || 0,
        hasNext: offset + limit < (count || 0),
        hasPrev: page > 1
      }
    });

  } catch (error) {
    console.error('Get public reviews error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch public reviews'
    });
  }
});
// @route   GET /api/reviews/:id
// @desc    Get a specific code review
// @access  Private
router.get('/:id', async (req, res) => {
  try {
    const { data: review, error } = await supabase
      .from('code_reviews')
      .select(`
        id, title, code_content, language, file_name, overall_score,
        analysis_result, issues_count, suggestions_count, status, 
        tags, is_public, is_favorite, created_at, updated_at
      `)
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({
          success: false,
          message: 'Review not found'
        });
      }
      throw error;
    }

    // Get review metrics if they exist
    const { data: metrics, error: metricsError } = await supabase
      .from('review_metrics')
      .select('*')
      .eq('review_id', req.params.id)
      .single();

    res.json({
      success: true,
      review: {
        ...review,
        metrics: metrics || null
      }
    });

  } catch (error) {
    console.error('Get review error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch review'
    });
  }
});

// @route   PUT /api/reviews/:id
// @desc    Update a code review
// @access  Private
router.put('/:id', async (req, res) => {
  try {
    const { error: validationError, value } = updateReviewSchema.validate(req.body);
    
    if (validationError) {
      return res.status(400).json({
        success: false,
        message: 'Invalid input data',
        errors: validationError.details.map(d => d.message)
      });
    }

    const updateData = {
      ...value,
      updated_at: new Date().toISOString()
    };

    const { data: updatedReview, error } = await supabase
      .from('code_reviews')
      .update(updateData)
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({
          success: false,
          message: 'Review not found'
        });
      }
      throw error;
    }

    res.json({
      success: true,
      message: 'Review updated successfully',
      review: updatedReview
    });

  } catch (error) {
    console.error('Update review error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update review'
    });
  }
});

// @route   DELETE /api/reviews/:id
// @desc    Delete a code review
// @access  Private
router.delete('/:id', async (req, res) => {
  try {
    const { error } = await supabase
      .from('code_reviews')
      .delete()
      .eq('id', req.params.id)
      .eq('user_id', req.user.id);

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      message: 'Review deleted successfully'
    });

  } catch (error) {
    console.error('Delete review error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete review'
    });
  }
});

// @route   POST /api/reviews/:id/analyze
// @desc    Analyze code review with AI
// @access  Private
router.post('/:id/analyze', async (req, res) => {
  try {
    // Get the review
    const { data: review, error: reviewError } = await supabase
      .from('code_reviews')
      .select('*')
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .single();

    if (reviewError || !review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    // Check if already analyzed
    if (review.status === 'completed' && review.analysis_result) {
      return res.json({
        success: true,
        message: 'Review already analyzed',
        review: review
      });
    }

    // Check user credits
    if (req.user.credits_used >= req.user.credits_limit) {
      return res.status(403).json({
        success: false,
        message: 'Credit limit exceeded. Please upgrade your plan.',
        credits: {
          used: req.user.credits_used,
          limit: req.user.credits_limit
        }
      });
    }

    // Update review status to pending
    await supabase
      .from('code_reviews')
      .update({ status: 'pending' })
      .eq('id', req.params.id);

    // Import AI service
    const aiService = require('../services/ai.service');
    
    // Analyze code with AI
    const analysisResult = await aiService.analyzeCode(review.code_content, review.language, {
      title: review.title,
      fileName: review.file_name
    });

    // Count issues and suggestions
    const issuesCount = analysisResult.issues ? analysisResult.issues.length : 0;
    const suggestionsCount = analysisResult.suggestions ? analysisResult.suggestions.length : 0;

    // Update review with analysis results
    const { data: updatedReview, error: updateError } = await supabase
      .from('code_reviews')
      .update({
        analysis_result: analysisResult,
        overall_score: analysisResult.overallScore || analysisResult.score || 0,
        issues_count: issuesCount,
        suggestions_count: suggestionsCount,
        status: 'completed',
        updated_at: new Date().toISOString()
      })
      .eq('id', req.params.id)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    // Store detailed metrics if available
    if (analysisResult.metrics) {
      await supabase
        .from('review_metrics')
        .insert([{
          review_id: req.params.id,
          complexity_score: analysisResult.metrics.complexity || 5,
          maintainability_score: analysisResult.metrics.maintainability || 5,
          security_score: analysisResult.metrics.security || 5,
          performance_score: analysisResult.metrics.performance || 5,
          readability_score: analysisResult.metrics.readability || 5,
          test_coverage_score: analysisResult.metrics.testability || 5,
          lines_of_code: review.code_content.split('\n').length,
          cyclomatic_complexity: analysisResult.metrics.cyclomaticComplexity || 1
        }]);
    }

    // Update user credits
    await supabase
      .from('users')
      .update({ 
        credits_used: req.user.credits_used + 1,
        updated_at: new Date().toISOString()
      })
      .eq('id', req.user.id);

    res.json({
      success: true,
      message: 'Code analysis completed successfully',
      review: updatedReview,
      creditsUsed: req.user.credits_used + 1,
      creditsRemaining: req.user.credits_limit - req.user.credits_used - 1
    });

  } catch (error) {
    console.error('Analyze review error:', error);
    
    // Update review status to error on failure
    try {
      await supabase
        .from('code_reviews')
        .update({ 
          status: 'error',
          updated_at: new Date().toISOString()
        })
        .eq('id', req.params.id);
    } catch (updateErr) {
      console.error('Failed to update review status to error:', updateErr);
    }

    res.status(500).json({
      success: false,
      message: 'Failed to analyze code. Please try again.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   POST /api/reviews/:id/favorite
// @desc    Toggle favorite status of a review
// @access  Private
router.post('/:id/favorite', async (req, res) => {
  try {
    // Get current favorite status
    const { data: review, error: getError } = await supabase
      .from('code_reviews')
      .select('is_favorite')
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .single();

    if (getError) {
      if (getError.code === 'PGRST116') {
        return res.status(404).json({
          success: false,
          message: 'Review not found'
        });
      }
      throw getError;
    }

    // Toggle favorite status
    const { data: updatedReview, error: updateError } = await supabase
      .from('code_reviews')
      .update({
        is_favorite: !review.is_favorite,
        updated_at: new Date().toISOString()
      })
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .select('id, is_favorite')
      .single();

    if (updateError) {
      throw updateError;
    }

    res.json({
      success: true,
      message: updatedReview.is_favorite ? 'Added to favorites' : 'Removed from favorites',
      is_favorite: updatedReview.is_favorite
    });

  } catch (error) {
    console.error('Toggle favorite error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update favorite status'
    });
  }
});

// @route   GET /api/reviews/:id/public
// @desc    Get a public code review (accessible by anyone)
// @access  Private
router.get('/:id/public', async (req, res) => {
  try {
    const { data: review, error } = await supabase
      .from('code_reviews')
      .select(`
        id, title, code_content, language, file_name, overall_score,
        analysis_result, issues_count, suggestions_count, status, 
        tags, created_at, updated_at,
        users(username, name, avatar_url)
      `)
      .eq('id', req.params.id)
      .eq('is_public', true)
      .eq('status', 'completed')
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({
          success: false,
          message: 'Public review not found'
        });
      }
      throw error;
    }

    // Get review metrics if they exist
    const { data: metrics, error: metricsError } = await supabase
      .from('review_metrics')
      .select('*')
      .eq('review_id', req.params.id)
      .single();

    res.json({
      success: true,
      review: {
        ...review,
        metrics: metrics || null
      }
    });

  } catch (error) {
    console.error('Get public review error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch public review'
    });
  }
});

module.exports = router;