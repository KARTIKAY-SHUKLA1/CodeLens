// src/routes/ai.routes.js
const express = require('express');
const passport = require('passport');
const aiService = require('../services/ai.service');
const { createClient } = require('@supabase/supabase-js');

const router = express.Router();

// Validate environment variables
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
  throw new Error('Missing required Supabase environment variables: SUPABASE_URL and SUPABASE_ANON_KEY');
}

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Language detection utility
const detectLanguage = (code) => {
  const detectors = {
    python: /^(def|class|import|from|if __name__|#|\s*"""|\s*''')/mi,
    javascript: /^(function|const|let|var|class|=>|\s*\/\/|\s*\/\*)/mi,
    java: /^(public|private|protected|class|interface|import|package)/mi,
    cpp: /^(#include|using namespace|int main|class|struct|template)/mi,
    typescript: /^(interface|type|enum|declare|import.*from)/mi,
    go: /^(package|import|func|type|var|const)/mi,
    php: /^(<\?php|namespace|use|class|function)/mi,
    ruby: /^(class|def|module|require|include)/mi,
    csharp: /^(using|namespace|class|interface|public|private)/mi,
    swift: /^(import|class|struct|enum|func|var|let)/mi,
    kotlin: /^(package|import|class|interface|fun|val|var)/mi,
    rust: /^(use|fn|struct|enum|impl|mod|pub)/mi
  };

  for (const [lang, pattern] of Object.entries(detectors)) {
    if (pattern.test(code.trim())) {
      return lang;
    }
  }
  return 'plaintext';
};

// @route   POST /api/ai/review
// @desc    Analyze code with AI
// @access  Private (requires authentication)
router.post('/review', 
  passport.authenticate('jwt', { session: false }), 
  async (req, res) => {
    try {
      const { code, language: selectedLanguage, preferences = {} } = req.body;
      const userId = req.user.id;

      // Validation
      if (!code || code.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Code is required and cannot be empty'
        });
      }

      if (code.length > 50000) { // 50KB limit
        return res.status(400).json({
          success: false,
          message: 'Code is too large. Maximum size is 50KB.'
        });
      }

      // Check user's credit limit
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('credits_used, credits_limit, plan')
        .eq('id', userId)
        .single();

      if (userError || !user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      if (user.credits_used >= user.credits_limit) {
        return res.status(429).json({
          success: false,
          message: 'Credit limit reached. Please upgrade your plan.',
          credits: {
            used: user.credits_used,
            limit: user.credits_limit,
            plan: user.plan
          }
        });
      }

      // Detect language if not provided
      const detectedLanguage = detectLanguage(code);
      const finalLanguage = selectedLanguage || detectedLanguage;

      // Language mismatch warning
      const languageMismatch = selectedLanguage && 
                               selectedLanguage !== detectedLanguage && 
                               detectedLanguage !== 'plaintext';

      console.log(`Analysis requested - Selected: ${selectedLanguage}, Detected: ${detectedLanguage}, Final: ${finalLanguage}`);

      // Call AI service with enhanced parameters
      const analysis = await aiService(code, finalLanguage, {
        selectedLanguage,
        detectedLanguage,
        languageMismatch,
        userPreferences: preferences,
        userId,
        codeLength: code.length,
        lineCount: code.split('\n').length
      });

      // Save review to database
      const reviewData = {
        user_id: userId,
        code_snippet: code.substring(0, 5000), // Store first 5KB for reference
        language: finalLanguage,
        selected_language: selectedLanguage,
        detected_language: detectedLanguage,
        language_mismatch: languageMismatch,
        overall_score: analysis.overallScore || 0,
        complexity_score: analysis.metrics?.complexity || 0,
        maintainability_score: analysis.metrics?.maintainability || 0,
        security_score: analysis.metrics?.security || 0,
        performance_score: analysis.metrics?.performance || 0,
        issues_count: analysis.issues?.length || 0,
        suggestions_count: analysis.suggestions?.length || 0,
        analysis_result: analysis,
        code_length: code.length,
        line_count: code.split('\n').length,
        created_at: new Date().toISOString()
      };

      const { data: reviewRecord, error: reviewError } = await supabase
        .from('code_reviews')
        .insert([reviewData])
        .select()
        .single();

      if (reviewError) {
        console.error('Failed to save review:', reviewError);
        // Continue anyway - don't fail the request
      }

      // Update user's credit usage
      const { error: creditError } = await supabase
        .from('users')
        .update({ 
          credits_used: user.credits_used + 1,
          last_activity: new Date().toISOString()
        })
        .eq('id', userId);

      if (creditError) {
        console.error('Failed to update credits:', creditError);
      }

      // Return enhanced response
      res.json({
        success: true,
        analysis: {
          ...analysis,
          metadata: {
            reviewId: reviewRecord?.id,
            selectedLanguage,
            detectedLanguage,
            finalLanguage,
            languageMismatch,
            codeStats: {
              length: code.length,
              lines: code.split('\n').length,
              characters: code.replace(/\s/g, '').length
            },
            timestamp: new Date().toISOString()
          }
        },
        credits: {
          used: user.credits_used + 1,
          limit: user.credits_limit,
          remaining: user.credits_limit - (user.credits_used + 1),
          plan: user.plan
        }
      });

    } catch (error) {
      console.error('AI Review Error:', error);
      
      res.status(500).json({
        success: false,
        message: 'Failed to analyze code. Please try again.',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// @route   GET /api/ai/languages
// @desc    Get supported languages
// @access  Public
router.get('/languages', (req, res) => {
  const supportedLanguages = {
    javascript: {
      id: 'javascript',
      name: 'JavaScript',
      displayName: 'JavaScript',
      extensions: ['.js', '.jsx'],
      category: 'Web',
      features: ['ES6+', 'Node.js', 'React'],
      icon: '🟨',
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-500/20',
      borderColor: 'border-yellow-500/30'
    },
    typescript: {
      id: 'typescript',
      name: 'TypeScript',
      displayName: 'TypeScript',
      extensions: ['.ts', '.tsx'],
      category: 'Web',
      features: ['Type Safety', 'Modern JS', 'React'],
      icon: '🔷',
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/20',
      borderColor: 'border-blue-500/30'
    },
    python: {
      id: 'python',
      name: 'Python',
      displayName: 'Python',
      extensions: ['.py', '.pyx'],
      category: 'General',
      features: ['Data Science', 'AI/ML', 'Web'],
      icon: '🐍',
      color: 'text-green-400',
      bgColor: 'bg-green-500/20',
      borderColor: 'border-green-500/30'
    },
    java: {
      id: 'java',
      name: 'Java',
      displayName: 'Java',
      extensions: ['.java'],
      category: 'Enterprise',
      features: ['OOP', 'Enterprise', 'Android'],
      icon: '☕',
      color: 'text-orange-400',
      bgColor: 'bg-orange-500/20',
      borderColor: 'border-orange-500/30'
    },
    cpp: {
      id: 'cpp',
      name: 'C++',
      displayName: 'C++',
      extensions: ['.cpp', '.cc', '.cxx'],
      category: 'System',
      features: ['Performance', 'System', 'Gaming'],
      icon: '⚡',
      color: 'text-blue-300',
      bgColor: 'bg-blue-500/20',
      borderColor: 'border-blue-500/30'
    },
    go: {
      id: 'go',
      name: 'Go',
      displayName: 'Go',
      extensions: ['.go'],
      category: 'System',
      features: ['Concurrency', 'Cloud', 'Microservices'],
      icon: '🚀',
      color: 'text-cyan-400',
      bgColor: 'bg-cyan-500/20',
      borderColor: 'border-cyan-500/30'
    },
    php: {
      id: 'php',
      name: 'PHP',
      displayName: 'PHP',
      extensions: ['.php'],
      category: 'Web',
      features: ['Web Development', 'Laravel', 'WordPress'],
      icon: '🌐',
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/20',
      borderColor: 'border-purple-500/30'
    },
    ruby: {
      id: 'ruby',
      name: 'Ruby',
      displayName: 'Ruby',
      extensions: ['.rb'],
      category: 'Web',
      features: ['Ruby on Rails', 'Web Apps', 'Scripting'],
      icon: '💎',
      color: 'text-red-400',
      bgColor: 'bg-red-500/20',
      borderColor: 'border-red-500/30'
    },
    csharp: {
      id: 'csharp',
      name: 'C#',
      displayName: 'C#',
      extensions: ['.cs'],
      category: 'Microsoft',
      features: ['.NET', 'Desktop Apps', 'Web APIs'],
      icon: '🔵',
      color: 'text-purple-300',
      bgColor: 'bg-purple-500/20',
      borderColor: 'border-purple-500/30'
    },
    swift: {
      id: 'swift',
      name: 'Swift',
      displayName: 'Swift',
      extensions: ['.swift'],
      category: 'Mobile',
      features: ['iOS', 'macOS', 'App Development'],
      icon: '🦉',
      color: 'text-orange-300',
      bgColor: 'bg-orange-500/20',
      borderColor: 'border-orange-500/30'
    },
    kotlin: {
      id: 'kotlin',
      name: 'Kotlin',
      displayName: 'Kotlin',
      extensions: ['.kt', '.kts'],
      category: 'Mobile',
      features: ['Android', 'JVM', 'Multiplatform'],
      icon: '🎯',
      color: 'text-pink-400',
      bgColor: 'bg-pink-500/20',
      borderColor: 'border-pink-500/30'
    },
    rust: {
      id: 'rust',
      name: 'Rust',
      displayName: 'Rust',
      extensions: ['.rs'],
      category: 'System',
      features: ['Memory Safety', 'Performance', 'Web Assembly'],
      icon: '🦀',
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-500/20',
      borderColor: 'border-yellow-500/30'
    }
  };

  const categories = {
    'Web': ['javascript', 'typescript', 'php', 'ruby'],
    'Mobile': ['swift', 'kotlin', 'java'],
    'System': ['cpp', 'go', 'rust'],
    'General': ['python'],
    'Enterprise': ['java', 'csharp'],
    'Microsoft': ['csharp']
  };

  res.json({
    success: true,
    languages: Object.values(supportedLanguages),
    categories,
    total: Object.keys(supportedLanguages).length
  });
});

// @route   POST /api/ai/detect-language
// @desc    Detect programming language from code
// @access  Public
router.post('/detect-language', (req, res) => {
  try {
    const { code } = req.body;
    
    if (!code || code.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Code is required'
      });
    }

    const detectedLanguage = detectLanguage(code);
    const confidence = detectedLanguage === 'plaintext' ? 0.1 : 0.8;

    res.json({
      success: true,
      detectedLanguage,
      confidence,
      alternatives: [], // Could implement multiple detection results
      codeStats: {
        length: code.length,
        lines: code.split('\n').length
      }
    });

  } catch (error) {
    console.error('Language detection error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to detect language'
    });
  }
});

// @route   POST /api/ai/analyze (PUBLIC VERSION FOR TESTING)
// @desc    Analyze code with AI - Public endpoint
// @access  Public
router.post('/analyze', async (req, res) => {
  try {
    console.log('=== ANALYZE ENDPOINT CALLED ===');
    console.log('Request body:', { 
      hasCode: !!req.body.code, 
      codeLength: req.body.code?.length,
      language: req.body.language 
    });

    const { code, language: selectedLanguage, preferences = {} } = req.body;

    // Validation
    if (!code || code.trim().length === 0) {
      console.log('❌ Validation failed: Empty code');
      return res.status(400).json({
        success: false,
        message: 'Code is required and cannot be empty'
      });
    }

    if (code.length > 50000) { // 50KB limit
      console.log('❌ Validation failed: Code too large');
      return res.status(400).json({
        success: false,
        message: 'Code is too large. Maximum size is 50KB.'
      });
    }

    // Detect language if not provided
    const detectedLanguage = detectLanguage(code);
    const finalLanguage = selectedLanguage || detectedLanguage;

    // Language mismatch warning
    const languageMismatch = selectedLanguage && 
                             selectedLanguage !== detectedLanguage && 
                             detectedLanguage !== 'plaintext';

    console.log(`✅ Starting Analysis - Selected: ${selectedLanguage}, Detected: ${detectedLanguage}, Final: ${finalLanguage}`);

    // Call AI service with proper error handling
    const analysis = await aiService(code, finalLanguage, {
      selectedLanguage,
      detectedLanguage,
      languageMismatch,
      userPreferences: preferences,
      codeLength: code.length,
      lineCount: code.split('\n').length
    });

    console.log('✅ Analysis completed successfully');
    console.log('Analysis result keys:', Object.keys(analysis));

    // Build comprehensive response
    const response = {
      success: true,
      analysis: {
        ...analysis,
        metadata: {
          selectedLanguage,
          detectedLanguage,
          finalLanguage,
          languageMismatch,
          codeStats: {
            length: code.length,
            lines: code.split('\n').length,
            characters: code.replace(/\s/g, '').length
          },
          timestamp: new Date().toISOString()
        }
      }
    };

    console.log('✅ Sending response with keys:', Object.keys(response.analysis));
    res.json(response);

  } catch (error) {
    console.error('❌ Public AI Analysis Error:', error);
    console.error('Error stack:', error.stack);
    
    res.status(500).json({
      success: false,
      message: 'Failed to analyze code. Please try again.',
      error: process.env.NODE_ENV === 'development' ? {
        message: error.message,
        type: error.name,
        stack: error.stack?.split('\n').slice(0, 5).join('\n')
      } : undefined
    });
  }
});

// DEBUG ROUTES
// @route   GET /api/ai/test-env
// @desc    Test environment variables
// @access  Public
router.get('/test-env', (req, res) => {
  res.json({
    hasGeminiKey: !!process.env.GOOGLE_GEMINI_KEY,
    hasSupabaseUrl: !!process.env.SUPABASE_URL,
    nodeEnv: process.env.NODE_ENV,
    corsOrigin: process.env.CORS_ORIGIN,
    port: process.env.PORT
  });
});

// @route   GET /api/ai/debug-api
// @desc    Test Gemini API connection
// @access  Public
router.get('/debug-api', async (req, res) => {
  try {
    const apiKey = process.env.GOOGLE_GEMINI_KEY;
    console.log('API Key exists:', !!apiKey);
    console.log('API Key first 10 chars:', apiKey ? apiKey.substring(0, 10) + '...' : 'MISSING');
    
    if (!apiKey) {
      return res.json({
        success: false,
        error: 'API key missing',
        env_vars: Object.keys(process.env).filter(k => k.includes('GEMINI') || k.includes('GOOGLE'))
      });
    }

    // Test simple API call
    const testPrompt = "Say 'Hello' in JSON format: {\"message\": \"Hello\"}";
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    
    console.log('Making test API call...');
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: testPrompt }] }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 100
        }
      })
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));

    const responseText = await response.text();
    console.log('Response text:', responseText);

    if (!response.ok) {
      return res.json({
        success: false,
        error: 'API call failed',
        status: response.status,
        statusText: response.statusText,
        response: responseText,
        url: apiUrl.replace(apiKey, 'API_KEY_HIDDEN')
      });
    }

    const data = JSON.parse(responseText);
    
    res.json({
      success: true,
      message: 'Gemini API is working!',
      response: data,
      apiStatus: response.status
    });

  } catch (error) {
    console.error('Debug API Error:', error);
    res.json({
      success: false,
      error: error.message,
      stack: error.stack,
      type: error.name
    });
  }
});

// @route   GET /api/ai/test-analyze
// @desc    Test the analyze functionality with sample code
// @access  Public
router.get('/test-analyze', async (req, res) => {
  try {
    const testCode = `function hello() {
  console.log("Hello World");
}`;

    console.log('Testing analyze functionality...');
    
    const detectedLanguage = detectLanguage(testCode);
    const analysis = await aiService(testCode, detectedLanguage, {});

    res.json({
      success: true,
      message: 'Analyze endpoint is working!',
      analysis: analysis
    });

  } catch (error) {
    console.error('Test analyze error:', error);
    res.json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;