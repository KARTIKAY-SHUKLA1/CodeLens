// src/controllers/ai.controller.js
const aiService = require("../services/ai.service");

// Enhanced Language detection with more patterns and confidence scoring
const detectLanguage = (code) => {
  const detectors = {
    python: {
      patterns: [
        /^(def|class|import|from|if __name__|#|\s*"""|\s*''')/mi,
        /\bprint\s*\(/,
        /\b(True|False|None)\b/,
        /\b(elif|except|finally|with|as|lambda)\b/,
        /^\s*@\w+/m, // decorators
        /\b__\w+__\b/, // dunder methods
        /\bindent\s*=/i,
        /\.py$/
      ],
      weight: 1.0
    },
    javascript: {
      patterns: [
        /^(function|const|let|var|class|=>|\s*\/\/|\s*\/\*)/mi,
        /\b(console\.log|document\.|window\.)/,
        /\b(async|await|Promise)\b/,
        /\b(null|undefined)\b/,
        /===|!==/, // strict equality
        /\$\{.*\}/, // template literals
        /\.js$/
      ],
      weight: 1.0
    },
    typescript: {
      patterns: [
        /^(interface|type|enum|declare|import.*from)/mi,
        /:\s*(string|number|boolean|any|void)/,
        /\b(public|private|protected|readonly)\b/,
        /\<.*\>/, // generics
        /\.ts$/,
        /\bas\s+\w+/
      ],
      weight: 1.0
    },
    java: {
      patterns: [
        /^(public|private|protected|class|interface|import|package)/mi,
        /\bSystem\.out\.println/,
        /\b(String|int|double|boolean|void)\b/,
        /\bnew\s+\w+\s*\(/,
        /\.java$/,
        /@\w+/ // annotations
      ],
      weight: 1.0
    },
    cpp: {
      patterns: [
        /^(#include|using namespace|int main|class|struct|template)/mi,
        /\bstd::/,
        /\bcout\s*<<|cin\s*>>/,
        /\b(int|double|float|char|bool|void)\s+\w+/,
        /\.(cpp|cc|cxx|h|hpp)$/,
        /->/  // pointer access
      ],
      weight: 1.0
    },
    go: {
      patterns: [
        /^(package|import|func|type|var|const)/mi,
        /\bfmt\./,
        /\b(string|int|bool|interface{})/,
        /:=/,  // short variable declaration
        /\.go$/,
        /\bgo\s+func/
      ],
      weight: 1.0
    },
    php: {
      patterns: [
        /^(<\?php|namespace|use|class|function)/mi,
        /\$\w+/, // variables
        /\becho\b/,
        /\.(php|phtml)$/,
        /\barray\s*\(/,
        /->/  // object operator
      ],
      weight: 1.0
    },
    ruby: {
      patterns: [
        /^(class|def|module|require|include)/mi,
        /\bputs\b/,
        /\bend\b/,
        /\.|::\w+/,
        /\.rb$/,
        /\b(nil|true|false)\b/
      ],
      weight: 1.0
    },
    csharp: {
      patterns: [
        /^(using|namespace|class|interface|public|private)/mi,
        /\bConsole\./,
        /\b(string|int|bool|void|var)\b/,
        /\bnew\s+\w+\s*\(/,
        /\.cs$/,
        /\[.*\]/ // attributes
      ],
      weight: 1.0
    },
    swift: {
      patterns: [
        /^(import|class|struct|enum|func|var|let)/mi,
        /\bprint\s*\(/,
        /\b(String|Int|Bool|Double)\b/,
        /\.swift$/,
        /\bguard\s+let/,
        /\bif\s+let/
      ],
      weight: 1.0
    },
    kotlin: {
      patterns: [
        /^(package|import|class|interface|fun|val|var)/mi,
        /\bprintln\s*\(/,
        /\b(String|Int|Boolean|Double)\?\?/,
        /\.kt$/,
        /\bwhen\s*\{/,
        /\b(companion\s+object|data\s+class)\b/
      ],
      weight: 1.0
    },
    rust: {
      patterns: [
        /^(use|fn|struct|enum|impl|mod|pub)/mi,
        /\bprintln!\s*\(/,
        /\b(i32|u32|f64|bool|String|&str)\b/,
        /\.rs$/,
        /\bmatch\s+\w+\s*\{/,
        /\|.*\|/ // closures
      ],
      weight: 1.0
    }
  };

  const scores = {};
  const codeLines = code.split('\n');
  
  for (const [lang, config] of Object.entries(detectors)) {
    let score = 0;
    let matches = 0;
    
    config.patterns.forEach(pattern => {
      if (pattern.test(code)) {
        score += config.weight;
        matches++;
      }
    });
    
    // Bonus for multiple matches
    if (matches > 1) {
      score += matches * 0.2;
    }
    
    scores[lang] = score;
  }
  
  // Find the language with highest score
  const bestMatch = Object.entries(scores)
    .filter(([_, score]) => score > 0)
    .sort(([, a], [, b]) => b - a)[0];
  
  if (!bestMatch || bestMatch[1] < 0.5) {
    return { language: 'plaintext', confidence: 0.1, scores };
  }
  
  const confidence = Math.min(bestMatch[1] / 3, 0.95); // Normalize confidence
  return { 
    language: bestMatch[0], 
    confidence: parseFloat(confidence.toFixed(2)), 
    scores: Object.fromEntries(
      Object.entries(scores)
        .filter(([_, score]) => score > 0)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
    )
  };
};

// Enhanced code statistics
const getCodeStatistics = (code) => {
  const lines = code.split('\n');
  const nonEmptyLines = lines.filter(line => line.trim().length > 0);
  const commentLines = lines.filter(line => {
    const trimmed = line.trim();
    return trimmed.startsWith('//') || 
           trimmed.startsWith('#') || 
           trimmed.startsWith('/*') ||
           trimmed.startsWith('*') ||
           trimmed.startsWith('"""') ||
           trimmed.startsWith("'''");
  });
  
  return {
    totalLines: lines.length,
    codeLines: nonEmptyLines.length,
    emptyLines: lines.length - nonEmptyLines.length,
    commentLines: commentLines.length,
    characters: code.length,
    charactersNoSpaces: code.replace(/\s/g, '').length,
    words: code.split(/\s+/).filter(word => word.length > 0).length,
    averageLineLength: Math.round(code.length / lines.length),
    longestLine: Math.max(...lines.map(line => line.length)),
    complexity: calculateComplexity(code),
    indentationStyle: detectIndentation(lines)
  };
};

// Calculate basic cyclomatic complexity
const calculateComplexity = (code) => {
  const complexityKeywords = [
    'if', 'else', 'elif', 'while', 'for', 'foreach', 'do', 'switch', 'case',
    'catch', 'except', 'finally', 'when', 'match', '&&', '||', '?', 'and', 'or'
  ];
  
  let complexity = 1; // Base complexity
  complexityKeywords.forEach(keyword => {
    const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
    const matches = code.match(regex);
    if (matches) {
      complexity += matches.length;
    }
  });
  
  return Math.min(complexity, 50); // Cap at 50 for sanity
};

// Detect indentation style
const detectIndentation = (lines) => {
  const indentedLines = lines.filter(line => line.match(/^\s+/));
  if (indentedLines.length === 0) return { type: 'none', size: 0 };
  
  const spaceCounts = indentedLines.map(line => {
    const match = line.match(/^( +)/);
    return match ? match[1].length : 0;
  }).filter(count => count > 0);
  
  const tabCounts = indentedLines.map(line => {
    const match = line.match(/^(\t+)/);
    return match ? match[1].length : 0;
  }).filter(count => count > 0);
  
  if (tabCounts.length > spaceCounts.length) {
    return { type: 'tabs', size: 1, consistency: tabCounts.length / indentedLines.length };
  }
  
  if (spaceCounts.length === 0) return { type: 'none', size: 0 };
  
  // Find common indentation size
  const gcd = spaceCounts.reduce((a, b) => {
    while (b !== 0) {
      const temp = b;
      b = a % b;
      a = temp;
    }
    return a;
  });
  
  return {
    type: 'spaces',
    size: gcd || 2,
    consistency: spaceCounts.length / indentedLines.length
  };
};

// Validate language match with strict checking
const validateLanguageMatch = (code, selectedLanguage, detectionResult) => {
  const { language: detectedLanguage, confidence } = detectionResult;
  
  // If no language selected, use detected
  if (!selectedLanguage) {
    return {
      isValid: true,
      finalLanguage: detectedLanguage,
      confidence: confidence,
      action: 'auto_detected'
    };
  }
  
  // Perfect match
  if (selectedLanguage === detectedLanguage) {
    return {
      isValid: true,
      finalLanguage: selectedLanguage,
      confidence: Math.max(confidence, 0.9),
      action: 'confirmed_match'
    };
  }
  
  // High confidence mismatch - prevent analysis
  if (confidence > 0.7 && detectedLanguage !== 'plaintext') {
    return {
      isValid: false,
      finalLanguage: null,
      confidence: confidence,
      action: 'blocked_mismatch',
      error: {
        type: 'language_mismatch',
        selected: selectedLanguage,
        detected: detectedLanguage,
        confidence: confidence,
        message: `Code appears to be ${detectedLanguage} (${Math.round(confidence * 100)}% confidence) but you selected ${selectedLanguage}. Please select the correct language for accurate analysis.`
      }
    };
  }
  
  // Low confidence or plaintext - allow with warning
  if (confidence <= 0.7 || detectedLanguage === 'plaintext') {
    return {
      isValid: true,
      finalLanguage: selectedLanguage,
      confidence: 0.5,
      action: 'user_override',
      warning: {
        type: 'low_confidence',
        message: `Language detection has low confidence. Analysis will proceed with ${selectedLanguage} as requested.`
      }
    };
  }
  
  return {
    isValid: true,
    finalLanguage: selectedLanguage,
    confidence: 0.6,
    action: 'user_preference'
  };
};

module.exports.getReview = async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { code, language: selectedLanguage, preferences = {} } = req.body;

    // Enhanced validation
    if (!code || typeof code !== 'string' || code.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          type: 'validation_error',
          field: 'code',
          message: "Code is required and must be a non-empty string",
          code: 'MISSING_CODE'
        }
      });
    }

    if (code.length > 100000) { // Increased limit
      return res.status(400).json({
        success: false,
        error: {
          type: 'validation_error',
          field: 'code',
          message: "Code is too large. Maximum size is 100KB.",
          code: 'CODE_TOO_LARGE',
          details: { maxSize: 100000, actualSize: code.length }
        }
      });
    }

    // Enhanced language detection
    const detectionResult = detectLanguage(code);
    console.log('Detection Result:', detectionResult);
    
    // Validate language match
    const validationResult = validateLanguageMatch(code, selectedLanguage, detectionResult);
    console.log('Validation Result:', validationResult);
    
    // Block analysis if language mismatch is too strong
    if (!validationResult.isValid) {
      return res.status(400).json({
        success: false,
        error: validationResult.error,
        suggestions: {
          detectedLanguage: detectionResult.language,
          confidence: detectionResult.confidence,
          alternativeLanguages: Object.keys(detectionResult.scores || {}).slice(1, 3)
        }
      });
    }

    // Get comprehensive code statistics
    const codeStats = getCodeStatistics(code);
    
    // Enhanced context for AI service
    const enhancedContext = {
      // Language info
      selectedLanguage,
      detectedLanguage: detectionResult.language,
      finalLanguage: validationResult.finalLanguage,
      languageConfidence: validationResult.confidence,
      detectionScores: detectionResult.scores,
      validationAction: validationResult.action,
      
      // Code analysis
      codeStatistics: codeStats,
      userPreferences: {
        strictness: preferences.strictness || 'balanced', // strict, balanced, lenient
        focusAreas: preferences.focusAreas || ['quality', 'security', 'performance'],
        includeExamples: preferences.includeExamples !== false,
        verbosity: preferences.verbosity || 'detailed' // brief, detailed, comprehensive
      },
      
      // Request metadata
      requestTimestamp: new Date().toISOString(),
      requestId: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      clientInfo: {
        userAgent: req.headers['user-agent'],
        ip: req.ip || req.connection.remoteAddress
      }
    };

    console.log(`Starting AI Analysis - Language: ${validationResult.finalLanguage}, Lines: ${codeStats.totalLines}, Complexity: ${codeStats.complexity}`);

    // Call enhanced AI service
    const analysisResult = await aiService(code, validationResult.finalLanguage, enhancedContext);
    
    const processingTime = Date.now() - startTime;

    // Build comprehensive response
    const response = {
      success: true,
      analysis: {
        ...analysisResult,
        
        // Enhanced metadata
        metadata: {
          language: {
            selected: selectedLanguage,
            detected: detectionResult.language,
            final: validationResult.finalLanguage,
            confidence: validationResult.confidence,
            detectionScores: detectionResult.scores
          },
          codeStatistics: codeStats,
          processing: {
            timeMs: processingTime,
            requestId: enhancedContext.requestId,
            timestamp: enhancedContext.requestTimestamp,
            version: '3.0.0'
          },
          validation: {
            action: validationResult.action,
            isStrict: validationResult.confidence > 0.8
          }
        }
      }
    };

    // Add warnings if needed
    if (validationResult.warning) {
      response.warnings = [validationResult.warning];
    }
    
    // Add performance warning for large files
    if (codeStats.totalLines > 500) {
      response.warnings = response.warnings || [];
      response.warnings.push({
        type: 'performance',
        message: 'Large code file detected. Analysis may take longer and some features might be limited.',
        details: { lines: codeStats.totalLines, threshold: 500 }
      });
    }

    console.log(`Analysis completed in ${processingTime}ms for ${codeStats.totalLines} lines`);
    res.json(response);

  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error('Controller Error:', error);
    
    // Enhanced error response
    res.status(500).json({
      success: false,
      error: {
        type: 'analysis_error',
        message: "Failed to analyze code. Please try again.",
        code: 'ANALYSIS_FAILED',
        details: process.env.NODE_ENV === 'development' ? {
          message: error.message,
          stack: error.stack?.split('\n').slice(0, 5).join('\n')
        } : null,
        timestamp: new Date().toISOString(),
        processingTime
      },
      suggestions: [
        "Try reducing the code size",
        "Ensure the code is valid syntax",
        "Check your internet connection",
        "Contact support if the issue persists"
      ]
    });
  }
};

// Enhanced language detection endpoint
module.exports.detectLanguage = async (req, res) => {
  try {
    const { code } = req.body;
    
    if (!code || code.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          type: 'validation_error',
          field: 'code',
          message: 'Code is required for language detection',
          code: 'MISSING_CODE'
        }
      });
    }

    const detectionResult = detectLanguage(code);
    const codeStats = getCodeStatistics(code);

    res.json({
      success: true,
      detection: {
        primaryLanguage: detectionResult.language,
        confidence: detectionResult.confidence,
        allScores: detectionResult.scores,
        recommendations: Object.entries(detectionResult.scores || {})
          .sort(([, a], [, b]) => b - a)
          .slice(0, 3)
          .map(([lang, score]) => ({
            language: lang,
            confidence: Math.min(score / 3, 0.95)
          }))
      },
      codeStatistics: {
        lines: codeStats.totalLines,
        characters: codeStats.characters,
        complexity: codeStats.complexity,
        indentation: codeStats.indentationStyle
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Detection Error:', error);
    res.status(500).json({
      success: false,
      error: {
        type: 'detection_error',
        message: 'Failed to detect language',
        code: 'DETECTION_FAILED'
      }
    });
  }
};

// New endpoint for supported languages
module.exports.getSupportedLanguages = async (req, res) => {
  try {
    const supportedLanguages = {
      python: { name: 'Python', extensions: ['.py'], frameworks: ['Django', 'Flask', 'FastAPI'] },
      javascript: { name: 'JavaScript', extensions: ['.js'], frameworks: ['React', 'Node.js', 'Vue'] },
      typescript: { name: 'TypeScript', extensions: ['.ts'], frameworks: ['Angular', 'React', 'Express'] },
      java: { name: 'Java', extensions: ['.java'], frameworks: ['Spring', 'Android', 'Maven'] },
      cpp: { name: 'C++', extensions: ['.cpp', '.cc', '.cxx', '.h', '.hpp'], frameworks: ['Qt', 'Boost'] },
      go: { name: 'Go', extensions: ['.go'], frameworks: ['Gin', 'Echo', 'Fiber'] },
      php: { name: 'PHP', extensions: ['.php'], frameworks: ['Laravel', 'Symfony', 'CodeIgniter'] },
      ruby: { name: 'Ruby', extensions: ['.rb'], frameworks: ['Rails', 'Sinatra'] },
      csharp: { name: 'C#', extensions: ['.cs'], frameworks: ['.NET', 'ASP.NET', 'Xamarin'] },
      swift: { name: 'Swift', extensions: ['.swift'], frameworks: ['iOS', 'SwiftUI'] },
      kotlin: { name: 'Kotlin', extensions: ['.kt'], frameworks: ['Android', 'Spring Boot'] },
      rust: { name: 'Rust', extensions: ['.rs'], frameworks: ['Actix', 'Rocket', 'Tokio'] }
    };

    res.json({
      success: true,
      languages: supportedLanguages,
      totalSupported: Object.keys(supportedLanguages).length,
      version: '3.0.0'
    });
  } catch (error) {
    console.error('Get Languages Error:', error);
    res.status(500).json({
      success: false,
      error: {
        type: 'server_error',
        message: 'Failed to get supported languages'
      }
    });
  }
};