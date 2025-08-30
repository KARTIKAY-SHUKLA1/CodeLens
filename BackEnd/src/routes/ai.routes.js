const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const { authenticateToken, checkCredits } = require('../middleware/auth.middleware');
const aiService = require('../services/ai.service');

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

// Language configuration for supported languages
const SUPPORTED_LANGUAGES = [
  'javascript', 'typescript', 'python', 'java', 'cpp', 'c', 
  'csharp', 'go', 'rust', 'php', 'ruby', 'swift', 'kotlin'
];

// @route   POST /api/ai/analyze
// @desc    Analyze code using AI and save to database
// @access  Private (requires authentication and credits)
router.post('/analyze', (req, res, next) => {
  console.log('🎯 ANALYZE ROUTE REACHED - Route exists and is being hit');
  next();
}, authenticateToken, (req, res, next) => {
  console.log('✅ AUTH PASSED - User authenticated');
  next();
}, checkCredits, async (req, res) => {
  console.log('✅ CREDITS PASSED - Starting analysis');
  
  const startTime = Date.now();
  
  try {
    console.log('=== AI Analysis Request ===');
    console.log('User ID:', req.user.id);
    console.log('Credits used/limit:', req.user.credits_used, '/', req.user.credits_limit);

    const { 
      code, 
      language = 'javascript', 
      fileName = 'untitled',
      title = 'Code Review',
      isPublic = false 
    } = req.body;

    // ... rest of your existing code (validation, AI service call, database operations, etc.)
    
    // Return successful response
    res.json({
      success: true,
      message: 'Code analysis completed successfully',
      data: {
        reviewId: reviewData.id,
        analysis: analysisResult,
        metadata: {
          ...analysisResult.metadata,
          reviewId: reviewData.id,
          processingTime: `${processingTime}ms`
        }
      },
      credits: {
        used: req.user.credits_used + 1,
        remaining: req.user.credits_limit - req.user.credits_used - 1,
        limit: req.user.credits_limit
      }
    });

  } catch (error) {
    console.error('AI Analysis Error:', error);
    
    const processingTime = Date.now() - startTime;
    
    res.status(500).json({
      success: false,
      message: error.message || 'Code analysis failed',
      error: error.message.includes('API_KEY') ? 'AI_SERVICE_CONFIG_ERROR' : 'ANALYSIS_FAILED',
      metadata: {
        processingTime: `${processingTime}ms`,
        timestamp: new Date().toISOString()
      }
    });
  }
});

// @route   GET /api/ai/languages
// @desc    Get supported programming languages
// @access  Public
router.get('/languages', (req, res) => {
  res.json({
    success: true,
    data: {
      languages: SUPPORTED_LANGUAGES.map(lang => ({
        id: lang,
        name: lang.charAt(0).toUpperCase() + lang.slice(1),
        extension: getLanguageExtension(lang)
      })),
      totalSupported: SUPPORTED_LANGUAGES.length
    }
  });
});

// @route   POST /api/ai/quick-analyze
// @desc    Quick analysis without saving to database (for demos/previews)
// @access  Private
router.post('/quick-analyze', authenticateToken, async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { code, language = 'javascript' } = req.body;

    // Basic validation
    if (!code || code.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Code is required',
        error: 'INVALID_CODE'
      });
    }

    if (code.length > 10000) { // Smaller limit for quick analysis
      return res.status(400).json({
        success: false,
        message: 'Code too large for quick analysis (10KB max)',
        error: 'CODE_TOO_LARGE'
      });
    }

    // Perform analysis without saving
    const analysisResult = await aiService(code, language.toLowerCase());
    
    const processingTime = Date.now() - startTime;

    res.json({
      success: true,
      message: 'Quick analysis completed',
      data: {
        analysis: {
          ...analysisResult,
          metadata: {
            ...analysisResult.metadata,
            processingTime: `${processingTime}ms`,
            quickAnalysis: true
          }
        }
      }
    });

  } catch (error) {
    console.error('Quick Analysis Error:', error);
    
    res.status(500).json({
      success: false,
      message: 'Quick analysis failed',
      error: 'QUICK_ANALYSIS_FAILED'
    });
  }
});

// @route   GET /api/ai/stats
// @desc    Get user's analysis statistics
// @access  Private
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    // Get user's review statistics
    const { data: reviews, error: reviewError } = await supabase
      .from('code_reviews')
      .select('id, language, overall_score, created_at, status')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });

    if (reviewError) {
      throw new Error('Failed to fetch review statistics');
    }

    // Calculate statistics
    const totalReviews = reviews.length;
    const completedReviews = reviews.filter(r => r.status === 'completed');
    const averageScore = completedReviews.length > 0 
      ? completedReviews.reduce((sum, r) => sum + r.overall_score, 0) / completedReviews.length
      : 0;

    // Language breakdown
    const languageStats = reviews.reduce((acc, review) => {
      acc[review.language] = (acc[review.language] || 0) + 1;
      return acc;
    }, {});

    // Recent activity (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentReviews = reviews.filter(r => 
      new Date(r.created_at) >= thirtyDaysAgo
    ).length;

    res.json({
      success: true,
      data: {
        totalReviews,
        completedReviews: completedReviews.length,
        averageScore: Math.round(averageScore * 10) / 10,
        languageStats,
        recentActivity: recentReviews,
        credits: {
          used: req.user.credits_used,
          remaining: req.user.credits_limit - req.user.credits_used,
          limit: req.user.credits_limit,
          percentage: Math.round((req.user.credits_used / req.user.credits_limit) * 100)
        }
      }
    });

  } catch (error) {
    console.error('Stats Error:', error);
    
    res.status(500).json({
      success: false,
      message: 'Failed to fetch statistics',
      error: 'STATS_FAILED'
    });
  }
});

// Helper function to get language file extension
function getLanguageExtension(language) {
  const extensions = {
    'javascript': '.js',
    'typescript': '.ts',
    'python': '.py',
    'java': '.java',
    'cpp': '.cpp',
    'c': '.c',
    'csharp': '.cs',
    'go': '.go',
    'rust': '.rs',
    'php': '.php',
    'ruby': '.rb',
    'swift': '.swift',
    'kotlin': '.kt'
  };
  
  return extensions[language.toLowerCase()] || '.txt';
}

module.exports = router;