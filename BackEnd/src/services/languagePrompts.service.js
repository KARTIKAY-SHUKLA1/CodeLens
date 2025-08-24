// src/services/languagePrompts.service.js (ENHANCED VERSION)
class LanguagePromptsService {
  
  // Language detection patterns and configurations
  static LANGUAGE_PATTERNS = {
    javascript: {
      keywords: ['function', 'const', 'let', 'var', '=>', 'class', 'import', 'export', 'require'],
      patterns: [
        /\b(function|const|let|var)\s+\w+/g,
        /=>\s*[{(]?/g,
        /console\.(log|error|warn|info)/g,
        /\.(map|filter|reduce|forEach|find|some|every)\s*\(/g,
        /\$\{.*?\}/g, // template literals
        /require\s*\(['"][^'"]*['"]\)/g,
        /import.*from\s*['"][^'"]*['"]/g
      ],
      complexityPatterns: [
        /\bif\s*\(/g, /\belse\b/g, /\bwhile\s*\(/g, /\bfor\s*\(/g,
        /\bswitch\s*\(/g, /\bcase\s+/g, /\bcatch\s*\(/g,
        /&&/g, /\|\|/g, /\?.*:/g
      ],
      weight: 1.0
    },
    
    typescript: {
      keywords: ['interface', 'type', 'enum', 'implements', 'extends', 'public', 'private', 'protected'],
      patterns: [
        /\binterface\s+\w+/g,
        /\btype\s+\w+\s*=/g,
        /\benum\s+\w+/g,
        /:\s*(string|number|boolean|object|any|unknown|void|Date)/g,
        /\bas\s+\w+/g,
        /<[^>]*>/g, // generics
        /\b(public|private|protected|readonly)\s+/g
      ],
      complexityPatterns: [
        /\bif\s*\(/g, /\belse\b/g, /\bwhile\s*\(/g, /\bfor\s*\(/g,
        /\bswitch\s*\(/g, /\bcase\s+/g, /\bcatch\s*\(/g,
        /&&/g, /\|\|/g, /\?.*:/g
      ],
      weight: 1.2
    },
    
    python: {
      keywords: ['def', 'class', 'import', 'from', 'if', 'elif', 'else', 'while', 'for', 'try', 'except'],
      patterns: [
        /\bdef\s+\w+\s*\(/g,
        /\bclass\s+\w+.*:/g,
        /\bif\s+__name__\s*==\s*['"]__main__['"]:/g,
        /\b(import\s+\w+|from\s+\w+\s+import)/g,
        /\b(True|False|None)\b/g,
        /^\s*#.*$/gm, // comments
        /['"].*?['"]/g // string literals
      ],
      complexityPatterns: [
        /\bif\s+/g, /\belif\s+/g, /\belse:/g, /\bwhile\s+/g,
        /\bfor\s+\w+\s+in\s+/g, /\btry:/g, /\bexcept/g,
        /\band\b/g, /\bor\b/g, /\bwith\s+/g
      ],
      weight: 1.1
    },
    
    java: {
      keywords: ['public', 'private', 'protected', 'class', 'interface', 'extends', 'implements', 'static', 'final'],
      patterns: [
        /\bpublic\s+class\s+\w+/g,
        /\bpublic\s+static\s+void\s+main/g,
        /\b(public|private|protected|static|final|abstract)\s+/g,
        /\bSystem\.(out|err)\.print/g,
        /\bnew\s+\w+\s*\(/g,
        /\bimport\s+[\w.]+;/g,
        /\/\*[\s\S]*?\*\/|\/\/.*$/gm // comments
      ],
      complexityPatterns: [
        /\bif\s*\(/g, /\belse\b/g, /\bwhile\s*\(/g, /\bfor\s*\(/g,
        /\bswitch\s*\(/g, /\bcase\s+/g, /\bcatch\s*\(/g,
        /&&/g, /\|\|/g
      ],
      weight: 1.1
    },
    
    cpp: {
      keywords: ['#include', 'namespace', 'class', 'struct', 'public', 'private', 'protected', 'virtual'],
      patterns: [
        /#include\s*[<"].*[>"]/g,
        /\bnamespace\s+\w+/g,
        /\bclass\s+\w+/g,
        /\bstruct\s+\w+/g,
        /\bstd::/g,
        /\bint\s+main\s*\(/g,
        /\b(public|private|protected):/g,
        /\/\*[\s\S]*?\*\/|\/\/.*$/gm // comments
      ],
      complexityPatterns: [
        /\bif\s*\(/g, /\belse\b/g, /\bwhile\s*\(/g, /\bfor\s*\(/g,
        /\bswitch\s*\(/g, /\bcase\s+/g, /\bcatch\s*\(/g
      ],
      weight: 1.0
    },
    
    go: {
      keywords: ['package', 'func', 'import', 'var', 'const', 'type', 'struct', 'interface'],
      patterns: [
        /\bpackage\s+\w+/g,
        /\bfunc\s+\w*\s*\(/g,
        /\bimport\s*\([\s\S]*?\)|import\s+".*"/g,
        /\bgo\s+\w+\(/g,
        /:=/g,
        /\bmake\s*\(/g,
        /\brange\s+/g
      ],
      complexityPatterns: [
        /\bif\s+/g, /\belse\b/g, /\bfor\s+/g, /\bswitch\s+/g,
        /\bcase\s+/g, /\bselect\s*{/g
      ],
      weight: 1.0
    },
    
    php: {
      keywords: ['<?php', 'function', 'class', 'public', 'private', 'protected', 'namespace'],
      patterns: [
        /<\?php/g,
        /\$\w+/g, // variables
        /\bfunction\s+\w+\s*\(/g,
        /\bclass\s+\w+/g,
        /\b(public|private|protected)\s+function/g,
        /\bnamespace\s+[\w\\]+/g,
        /\becho\b|\bprint\b/g
      ],
      complexityPatterns: [
        /\bif\s*\(/g, /\belse\b/g, /\bwhile\s*\(/g, /\bfor\s*\(/g,
        /\bswitch\s*\(/g, /\bcase\s+/g, /\bcatch\s*\(/g
      ],
      weight: 1.0
    },
    
    ruby: {
      keywords: ['def', 'class', 'module', 'end', 'require', 'include', 'extend'],
      patterns: [
        /\bdef\s+\w+/g,
        /\bclass\s+\w+/g,
        /\bmodule\s+\w+/g,
        /\bend\b/g,
        /\brequire\s+['"][^'"]*['"]/g,
        /\b(puts|print|p)\s+/g,
        /@\w+/g // instance variables
      ],
      complexityPatterns: [
        /\bif\s+/g, /\belse\b/g, /\bwhile\s+/g, /\bfor\s+/g,
        /\bcase\s+/g, /\bwhen\s+/g, /\brescue\s+/g
      ],
      weight: 1.0
    },
    
    csharp: {
      keywords: ['using', 'namespace', 'class', 'interface', 'public', 'private', 'protected', 'static'],
      patterns: [
        /\busing\s+[\w.]+;/g,
        /\bnamespace\s+[\w.]+/g,
        /\bclass\s+\w+/g,
        /\binterface\s+I\w+/g,
        /\b(public|private|protected|internal|static|readonly)\s+/g,
        /\bConsole\.(WriteLine|Write)/g,
        /\bnew\s+\w+\s*\(/g
      ],
      complexityPatterns: [
        /\bif\s*\(/g, /\belse\b/g, /\bwhile\s*\(/g, /\bfor\s*\(/g,
        /\bswitch\s*\(/g, /\bcase\s+/g, /\bcatch\s*\(/g
      ],
      weight: 1.0
    },
    
    swift: {
      keywords: ['func', 'class', 'struct', 'enum', 'protocol', 'extension', 'import', 'var', 'let'],
      patterns: [
        /\bfunc\s+\w+\s*\(/g,
        /\b(class|struct|enum|protocol)\s+\w+/g,
        /\bextension\s+\w+/g,
        /\bimport\s+\w+/g,
        /\b(var|let)\s+\w+/g,
        /\bprint\s*\(/g,
        /\bguard\s+/g
      ],
      complexityPatterns: [
        /\bif\s+/g, /\belse\b/g, /\bwhile\s+/g, /\bfor\s+\w+\s+in\s+/g,
        /\bswitch\s+/g, /\bcase\s+/g, /\bguard\s+/g, /\bcatch\s+/g
      ],
      weight: 1.0
    },
    
    kotlin: {
      keywords: ['fun', 'class', 'interface', 'object', 'val', 'var', 'when', 'data'],
      patterns: [
        /\bfun\s+\w+\s*\(/g,
        /\b(class|interface|object|data class)\s+\w+/g,
        /\b(val|var)\s+\w+/g,
        /\bwhen\s*[({]/g,
        /\bprintln\s*\(/g,
        /\bnullable\?/g,
        /\bcompanion object/g
      ],
      complexityPatterns: [
        /\bif\s*\(/g, /\belse\b/g, /\bwhile\s*\(/g, /\bfor\s*\(/g,
        /\bwhen\s*[({]/g, /\bcatch\s*\(/g
      ],
      weight: 1.0
    },
    
    rust: {
      keywords: ['fn', 'struct', 'enum', 'impl', 'trait', 'mod', 'use', 'let', 'mut'],
      patterns: [
        /\bfn\s+\w+\s*\(/g,
        /\b(struct|enum|trait)\s+\w+/g,
        /\bimpl\s+/g,
        /\bmod\s+\w+/g,
        /\buse\s+[\w:]+/g,
        /\blet\s+(mut\s+)?\w+/g,
        /\bprintln!\s*\(/g
      ],
      complexityPatterns: [
        /\bif\s+/g, /\belse\b/g, /\bwhile\s+/g, /\bfor\s+\w+\s+in\s+/g,
        /\bmatch\s+/g, /=>/g
      ],
      weight: 1.0
    }
  };

  /**
   * Detect the actual programming language from code content
   */
  static detectLanguageFromCode(code) {
    const scores = {};
    const codeLength = code.length;
    
    // Initialize scores
    Object.keys(this.LANGUAGE_PATTERNS).forEach(lang => {
      scores[lang] = 0;
    });

    // Calculate scores for each language
    Object.entries(this.LANGUAGE_PATTERNS).forEach(([language, config]) => {
      let langScore = 0;
      
      // Check keyword patterns
      config.patterns.forEach(pattern => {
        const matches = code.match(pattern) || [];
        langScore += matches.length * config.weight;
      });
      
      // Bonus for specific language characteristics
      if (language === 'python' && /^\s+/gm.test(code)) {
        langScore += 2; // Indentation-based
      }
      
      if (language === 'javascript' && /\bconst\s+\w+\s*=\s*require\s*\(/g.test(code)) {
        langScore += 3; // CommonJS
      }
      
      if (language === 'typescript' && /\bimport.*from.*['"]/g.test(code) && /:\s*(string|number|boolean)/g.test(code)) {
        langScore += 3; // TS imports with types
      }
      
      // Normalize score by code length
      scores[language] = codeLength > 0 ? (langScore / codeLength) * 1000 : 0;
    });

    // Find best match
    const sortedResults = Object.entries(scores)
      .sort(([,a], [,b]) => b - a)
      .map(([lang, score]) => ({ language: lang, score, confidence: Math.min(100, score * 10) }));

    return {
      detectedLanguage: sortedResults[0].language,
      confidence: sortedResults[0].confidence,
      allScores: scores,
      alternatives: sortedResults.slice(1, 3)
    };
  }

  /**
   * Validate if selected language matches detected language
   */
  static validateLanguageMatch(selectedLanguage, code) {
    const detection = this.detectLanguageFromCode(code);
    const isMatch = detection.detectedLanguage === selectedLanguage;
    
    return {
      isMatch,
      detectedLanguage: detection.detectedLanguage,
      selectedLanguage,
      confidence: detection.confidence,
      alternatives: detection.alternatives,
      mismatchSeverity: this.calculateMismatchSeverity(detection.confidence, isMatch),
      suggestion: !isMatch ? 
        `Code appears to be ${detection.detectedLanguage} (${detection.confidence.toFixed(1)}% confidence) but ${selectedLanguage} was selected. Consider switching to ${detection.detectedLanguage} for more accurate analysis.` : 
        null
    };
  }

  /**
   * Calculate complexity score based on language-specific patterns
   */
  static calculateComplexityScore(code, language) {
    const langConfig = this.LANGUAGE_PATTERNS[language];
    if (!langConfig) return 5; // default complexity

    let complexity = 1; // base complexity
    
    // Count complexity-inducing patterns
    langConfig.complexityPatterns.forEach(pattern => {
      const matches = code.match(pattern) || [];
      complexity += matches.length;
    });

    // Additional complexity factors
    const lines = code.split('\n').length;
    const functions = this.countFunctions(code, language);
    const nesting = this.calculateMaxNesting(code);
    
    // Weighted complexity calculation
    const baseComplexity = complexity;
    const lineComplexity = Math.floor(lines / 50); // Every 50 lines adds 1 complexity
    const functionComplexity = functions * 0.5;
    const nestingComplexity = nesting * 2;
    
    const totalComplexity = baseComplexity + lineComplexity + functionComplexity + nestingComplexity;
    
    // Scale to 1-10 range
    return Math.max(1, Math.min(10, Math.ceil(totalComplexity / 5)));
  }

  /**
   * Generate enhanced contextual prompt with language validation
   */
  static generateContextualPrompt(language, code, additionalContext = {}) {
    // Validate language match
    const validation = this.validateLanguageMatch(language, code);
    const complexity = this.calculateComplexityScore(code, language);
    
    // Enhance context with detection results
    const enhancedContext = {
      ...additionalContext,
      languageMismatch: !validation.isMatch,
      detectedLanguage: validation.detectedLanguage,
      selectedLanguage: validation.selectedLanguage,
      confidence: validation.confidence,
      calculatedComplexity: complexity,
      codeLength: code.length,
      lineCount: code.split('\n').length
    };

    const basePrompt = this.getBasePrompt();
    const languageSpecificPrompt = this.getLanguageSpecificPrompt(language);
    const contextualAdditions = this.generateContextualAdditions(enhancedContext);
    
    // Add language validation section
    let languageValidationSection = '';
    if (!validation.isMatch) {
      languageValidationSection = `
⚠️ LANGUAGE MISMATCH DETECTED:
- Selected Language: ${validation.selectedLanguage}
- Detected Language: ${validation.detectedLanguage}
- Detection Confidence: ${validation.confidence.toFixed(1)}%
- Please analyze according to the DETECTED language (${validation.detectedLanguage}) patterns and note this mismatch in your response.
`;
    }

    return `${basePrompt}

${languageSpecificPrompt}

${languageValidationSection}

${contextualAdditions}

COMPLEXITY ANALYSIS CONTEXT:
- Calculated Complexity Score: ${complexity}/10
- Code Length: ${code.length} characters
- Line Count: ${code.split('\n').length} lines
- Function Count: ${this.countFunctions(code, language)}
- Max Nesting Level: ${this.calculateMaxNesting(code)}

CODE TO ANALYZE:
\`\`\`${validation.detectedLanguage}
${code}
\`\`\`

DETAILED SCORING CRITERIA:
- Complexity (1-10): Based on cyclomatic complexity, nesting depth, and control flow
- Readability (1-10): Code clarity, naming, comments, structure
- Maintainability (1-10): Modularity, separation of concerns, code organization
- Security (1-10): Vulnerability assessment, input validation, secure practices
- Performance (1-10): Algorithm efficiency, resource usage, optimization opportunities
- Testability (1-10): How easy it is to write tests, dependency injection, modularity

Please provide your analysis in the following JSON format (ensure valid JSON):
{
  "overallScore": number (1-10),
  "summary": "Brief summary of code quality with specific insights",
  "detectedLanguage": "${validation.detectedLanguage}",
  "languageMismatch": ${!validation.isMatch},
  "issues": [
    {
      "type": "error|warning|info",
      "title": "Specific issue title",
      "description": "Detailed explanation of the issue and its impact",
      "line": number,
      "column": number,
      "severity": "high|medium|low", 
      "category": "security|performance|maintainability|style|logic|syntax",
      "suggestion": "Concrete steps to fix this issue"
    }
  ],
  "suggestions": [
    "Specific, actionable improvement suggestions with examples"
  ],
  "strengths": [
    "Concrete positive aspects of the code"
  ],
  "metrics": {
    "complexity": number (1-10, based on calculated complexity: ${complexity}),
    "readability": number (1-10),
    "maintainability": number (1-10),
    "security": number (1-10),
    "performance": number (1-10),
    "testability": number (1-10)
  },
  "languageSpecificInsights": {
    "bestPractices": ["${language}-specific best practices analysis"],
    "conventions": ["Coding conventions and style guidelines"],
    "modernFeatures": ["Modern ${language} features that could improve the code"],
    "commonPitfalls": ["Common ${language}-specific issues and how to avoid them"]
  }
}`;
  }

  // Keep your existing methods...
  static getBasePrompt() {
    return `You are CodeLens, an expert AI code reviewer with deep knowledge across multiple programming languages. 

Your task is to provide comprehensive, actionable code analysis focusing on:
1. Code Quality & Best Practices
2. Security Vulnerabilities  
3. Performance Optimizations
4. Maintainability Issues
5. Language-specific Conventions
6. Modern Feature Usage
7. Error Handling
8. Code Structure & Organization

ANALYSIS GUIDELINES:
- Be specific and actionable in your feedback
- Provide line numbers when possible
- Explain WHY something is problematic, not just WHAT
- Suggest concrete improvements with code examples when helpful
- Consider the code's context and purpose
- Balance criticism with recognition of good practices
- Focus on meaningful issues, avoid nitpicking trivial style issues
- Provide severity levels to help prioritize fixes
- Base complexity scores on actual code analysis, not arbitrary numbers`;
  }

  static getLanguageSpecificPrompt(language) {
    const prompts = {
      javascript: `
JAVASCRIPT-SPECIFIC ANALYSIS:
- ES6+ features usage (const/let, arrow functions, destructuring, async/await, modules)
- Proper error handling and promise management
- Performance considerations (loop optimizations, DOM manipulation, memory leaks)
- Security issues (XSS vulnerabilities, eval usage, input validation)
- Modern JavaScript patterns and anti-patterns
- Bundle size and tree-shaking considerations
- Accessibility in DOM manipulation
- Closure usage and this binding
- NPM package usage and security
- Code splitting and lazy loading opportunities`,

      typescript: `
TYPESCRIPT-SPECIFIC ANALYSIS:
- Type safety and proper type definitions
- Interface vs type usage and when to use each
- Generic implementation and constraints
- Strict mode compliance and compiler settings
- Modern TypeScript features (utility types, template literals, etc.)
- React/Angular/Vue specific patterns (if applicable)
- Performance considerations and compilation optimization
- Type assertion usage and alternatives
- Module and namespace organization
- Migration from JavaScript best practices`,

      python: `
PYTHON-SPECIFIC ANALYSIS:
- PEP 8 style guide compliance
- Pythonic code patterns and idioms
- Type hints usage (PEP 484, 585) and mypy compatibility
- Exception handling best practices and custom exceptions
- List/dict comprehensions vs loops performance
- Generator usage for memory efficiency
- Security considerations (input validation, pickle usage, SQL injection)
- Modern Python 3.8+ features (walrus operator, f-strings, dataclasses)
- Virtual environment and dependency management
- Performance optimizations (built-in functions, avoiding premature optimization)
- Async/await usage for I/O operations`,

      java: `
JAVA-SPECIFIC ANALYSIS:
- Object-oriented design principles (SOLID)
- Exception handling and resource management (try-with-resources)
- Performance considerations (collections choice, garbage collection impact)
- Security issues (serialization vulnerabilities, injection attacks)
- Modern Java features (streams, lambdas, var keyword, records, switch expressions)
- Proper use of interfaces and abstract classes
- Thread safety and concurrency (synchronized, concurrent collections)
- Design patterns implementation
- Code organization and package structure
- Memory management and optimization techniques`,

      cpp: `
C++ SPECIFIC ANALYSIS:
- Memory management (RAII, smart pointers, move semantics)
- Modern C++ features (C++11/14/17/20) and when to use them
- Performance optimizations and compiler optimizations
- Resource safety and exception handling
- Template usage and generic programming best practices
- STL container and algorithm usage optimization
- Const correctness and immutability
- Copy/move constructors and assignment operators
- Thread safety and concurrency patterns
- Header organization and compilation efficiency`,

      go: `
GO-SPECIFIC ANALYSIS:
- Go conventions and idioms (effective Go practices)
- Error handling patterns and error wrapping
- Goroutine and channel usage for concurrency
- Interface implementation and composition
- Package organization and module structure
- Performance considerations and profiling opportunities
- Memory efficiency and garbage collection impact
- Testing patterns and benchmarking
- Dependency management with go modules
- Security best practices and input validation`,

      php: `
PHP-SPECIFIC ANALYSIS:
- Modern PHP features (7.4/8.0/8.1/8.2)
- Security vulnerabilities (SQL injection, XSS, CSRF, file inclusion)
- Performance optimizations (opcode caching, database queries)
- Proper error handling and logging
- Object-oriented patterns and PSR standards
- Composer and dependency management
- Database interaction security (prepared statements)
- Session management and authentication
- Input validation and sanitization
- Framework-specific best practices (if applicable)`,

      ruby: `
RUBY-SPECIFIC ANALYSIS:
- Ruby conventions and idioms (The Ruby Way)
- Rails best practices (if applicable)
- Performance considerations (memory usage, algorithm efficiency)
- Security issues (mass assignment, SQL injection, XSS)
- Proper use of blocks, procs, and lambdas
- Object-oriented design and metaprogramming
- Gem usage and security assessment
- Testing patterns (RSpec, Minitest)
- Code organization and module structure
- Modern Ruby features and syntax improvements`,

      csharp: `
C#-SPECIFIC ANALYSIS:
- .NET best practices and framework guidelines
- SOLID principles implementation
- Async/await usage and Task-based patterns
- LINQ optimization and performance
- Memory management and disposal patterns
- Exception handling and custom exceptions
- Modern C# features (pattern matching, records, nullable reference types)
- Security considerations (.NET security model)
- Performance optimizations and profiling
- Testing patterns and dependency injection`,

      swift: `
SWIFT-SPECIFIC ANALYSIS:
- Swift conventions and API design guidelines
- Memory management (ARC, retain cycles)
- Optional handling and nil safety
- Protocol-oriented programming patterns
- Performance optimizations and memory efficiency
- iOS/macOS/watchOS specific patterns
- Error handling with Result types
- Modern Swift features (async/await, actors, property wrappers)
- Concurrency patterns and thread safety
- SwiftUI/UIKit best practices (if applicable)`,

      kotlin: `
KOTLIN-SPECIFIC ANALYSIS:
- Kotlin conventions and idioms
- Null safety usage and nullable types
- Extension functions and when to use them
- Coroutines for asynchronous programming
- Android development best practices (if applicable)
- Interoperability with Java code
- Performance considerations vs Java
- Modern Kotlin features (inline classes, sealed classes)
- Functional programming patterns
- Testing approaches with Kotlin-specific features`,

      rust: `
RUST-SPECIFIC ANALYSIS:
- Ownership and borrowing patterns
- Memory safety without garbage collection
- Error handling with Result and Option types
- Performance optimizations and zero-cost abstractions
- Trait implementation and generic programming
- Macro usage and when appropriate
- Cargo and dependency management
- Unsafe code analysis and safety invariants
- Concurrency patterns (Send, Sync, channels)
- Modern Rust idioms and best practices`
    };

    return prompts[language] || `
GENERAL CODE ANALYSIS FOR ${language.toUpperCase()}:
- Code structure and organization
- Logic flow and algorithm efficiency
- Error handling approaches
- Security considerations
- Performance implications
- Maintainability factors
- Documentation quality
- Testing considerations
- Modern language features usage`;
  }

  static generateContextualAdditions(context) {
    let additions = '';

    if (context.languageMismatch) {
      additions += `
🚨 CRITICAL: Language mismatch detected! 
- Selected language: ${context.selectedLanguage}
- Detected language: ${context.detectedLanguage}
- Detection confidence: ${context.confidence.toFixed(1)}%
- IMPORTANT: Analyze using ${context.detectedLanguage} patterns and note this discrepancy prominently in your response.`;
    }

    if (context.codeLength > 10000) {
      additions += `
📏 LARGE CODEBASE: This is a large code file (${context.codeLength} characters). Focus on:
- Overall architecture and design patterns
- Major performance and security issues
- Code organization and modularity
- Separation of concerns`;
    }

    if (context.lineCount > 500) {
      additions += `
📊 HIGH LINE COUNT: This code has ${context.lineCount} lines. Consider:
- Breaking down into smaller modules/functions
- Single Responsibility Principle adherence
- Code organization patterns and structure`;
    }

    if (context.calculatedComplexity > 8) {
      additions += `
⚠️ HIGH COMPLEXITY: Calculated complexity is ${context.calculatedComplexity}/10. Focus on:
- Simplifying complex logic
- Reducing nesting levels
- Breaking down large functions
- Improving code readability`;
    }

    if (context.userPreferences) {
      const prefs = context.userPreferences;
      if (prefs.focusAreas) {
        additions += `
👤 USER FOCUS: Pay special attention to: ${prefs.focusAreas.join(', ')}`;
      }
      if (prefs.strictness) {
        additions += `
⚖️ ANALYSIS DEPTH: ${prefs.strictness} level analysis requested`;
      }
    }

    return additions;
  }
  // Helper methods for complexity calculation
  static countFunctions(code, language) {
    const functionPatterns = {
      javascript: /\b(function\s+\w+|const\s+\w+\s*=\s*\(|\w+\s*:\s*function|\w+\s*\(.*\)\s*=>)/g,
      typescript: /\b(function\s+\w+|const\s+\w+\s*=\s*\(|\w+\s*:\s*function|\w+\s*\(.*\)\s*=>)/g,
      python: /\bdef\s+\w+\s*\(/g,
      java: /\b(public|private|protected)?\s*(static\s+)?\w+\s+\w+\s*\(/g,
      cpp: /\b\w+\s+\w+\s*\([^)]*\)\s*{/g,
      go: /\bfunc\s+\w*\s*\(/g,
      php: /\bfunction\s+\w+\s*\(/g,
      ruby: /\bdef\s+\w+/g,
      csharp: /\b(public|private|protected|internal)?\s*(static\s+)?\w+\s+\w+\s*\(/g,
      swift: /\bfunc\s+\w+\s*\(/g,
      kotlin: /\bfun\s+\w+\s*\(/g,
      rust: /\bfn\s+\w+\s*\(/g
    };

    const pattern = functionPatterns[language] || functionPatterns.javascript;
    const matches = code.match(pattern) || [];
    return matches.length;
  }

  static calculateMaxNesting(code) {
    let maxNesting = 0;
    let currentNesting = 0;
    
    // Simple nesting calculation based on braces and indentation
    const lines = code.split('\n');
    
    for (const line of lines) {
      const openBraces = (line.match(/[{(]/g) || []).length;
      const closeBraces = (line.match(/[})]/g) || []).length;
      
      currentNesting += openBraces - closeBraces;
      maxNesting = Math.max(maxNesting, currentNesting);
      
      // Ensure nesting doesn't go below 0
      currentNesting = Math.max(0, currentNesting);
    }
    
    return maxNesting;
  }

  static calculateMismatchSeverity(confidence, isMatch) {
    if (isMatch) return 'none';
    
    if (confidence > 80) return 'high';
    if (confidence > 50) return 'medium';
    return 'low';
  }

  /**
   * Get language-specific complexity thresholds
   */
  static getComplexityThresholds(language) {
    const thresholds = {
      javascript: { low: 3, medium: 6, high: 10 },
      typescript: { low: 3, medium: 6, high: 10 },
      python: { low: 2, medium: 5, high: 8 },
      java: { low: 4, medium: 7, high: 12 },
      cpp: { low: 4, medium: 8, high: 15 },
      go: { low: 3, medium: 6, high: 10 },
      php: { low: 3, medium: 6, high: 12 },
      ruby: { low: 3, medium: 6, high: 10 },
      csharp: { low: 4, medium: 7, high: 12 },
      swift: { low: 3, medium: 6, high: 10 },
      kotlin: { low: 3, medium: 6, high: 10 },
      rust: { low: 3, medium: 6, high: 10 }
    };

    return thresholds[language] || thresholds.javascript;
  }

  /**
   * Enhanced language detection with file extension support
   */
  static detectLanguageFromFileExtension(filename) {
    if (!filename) return null;
    
    const extensionMap = {
      '.js': 'javascript',
      '.mjs': 'javascript', 
      '.cjs': 'javascript',
      '.ts': 'typescript',
      '.tsx': 'typescript',
      '.py': 'python',
      '.pyw': 'python',
      '.java': 'java',
      '.cpp': 'cpp',
      '.cc': 'cpp',
      '.cxx': 'cpp',
      '.c++': 'cpp',
      '.hpp': 'cpp',
      '.h': 'cpp',
      '.go': 'go',
      '.php': 'php',
      '.rb': 'ruby',
      '.cs': 'csharp',
      '.swift': 'swift',
      '.kt': 'kotlin',
      '.kts': 'kotlin',
      '.rs': 'rust'
    };

    const extension = filename.substring(filename.lastIndexOf('.')).toLowerCase();
    return extensionMap[extension] || null;
  }

  /**
   * Comprehensive language detection combining content and filename
   */
  static detectLanguage(code, filename = null) {
    const contentDetection = this.detectLanguageFromCode(code);
    const extensionDetection = this.detectLanguageFromFileExtension(filename);
    
    // If extension and content agree, high confidence
    if (extensionDetection && extensionDetection === contentDetection.detectedLanguage) {
      return {
        ...contentDetection,
        confidence: Math.min(100, contentDetection.confidence + 20),
        method: 'content_and_extension'
      };
    }
    
    // If extension exists but differs from content
    if (extensionDetection && extensionDetection !== contentDetection.detectedLanguage) {
      return {
        detectedLanguage: contentDetection.confidence > 30 ? contentDetection.detectedLanguage : extensionDetection,
        confidence: contentDetection.confidence > 30 ? contentDetection.confidence : 60,
        alternatives: [
          { language: extensionDetection, source: 'extension' },
          ...contentDetection.alternatives
        ],
        method: 'content_priority_with_extension_conflict'
      };
    }
    
    // Content detection only
    return {
      ...contentDetection,
      method: 'content_only'
    };
  }

  /**
   * Generate language-specific best practices
   */
  static getLanguageSpecificBestPractices(language) {
    const practices = {
      javascript: [
        'Use const/let instead of var for block scoping',
        'Prefer arrow functions for callbacks and shorter syntax',
        'Use template literals for string interpolation',
        'Handle promises with async/await instead of callbacks',
        'Use strict equality (===) comparisons',
        'Avoid global variables and use modules',
        'Use meaningful variable and function names',
        'Handle errors properly with try-catch'
      ],
      typescript: [
        'Define explicit types for function parameters and return values',
        'Use interfaces for object structures and contracts',
        'Avoid using "any" type when possible',
        'Use union types for flexible type definitions',
        'Enable strict mode in tsconfig.json',
        'Use generic types for reusable components',
        'Implement proper error handling with typed exceptions',
        'Use type guards for runtime type checking'
      ],
      python: [
        'Follow PEP 8 style guide for consistent formatting',
        'Use type hints for better code documentation',
        'Prefer list comprehensions over loops when readable',
        'Use context managers (with statements) for resource management',
        'Handle exceptions specifically, avoid bare except clauses',
        'Use f-strings for string formatting',
        'Follow the principle of least surprise',
        'Use virtual environments for project isolation'
      ],
      java: [
        'Follow Java naming conventions (camelCase for variables/methods)',
        'Use proper access modifiers (private, protected, public)',
        'Implement proper exception handling with specific exceptions',
        'Use generics for type safety',
        'Follow SOLID principles in class design',
        'Use try-with-resources for automatic resource management',
        'Prefer composition over inheritance',
        'Write unit tests for all public methods'
      ],
      cpp: [
        'Use RAII for resource management',
        'Prefer smart pointers over raw pointers',
        'Use const correctness throughout code',
        'Follow the Rule of Three/Five/Zero',
        'Use standard library containers and algorithms',
        'Avoid memory leaks with proper resource management',
        'Use modern C++ features appropriately',
        'Implement move semantics for performance'
      ],
      go: [
        'Use gofmt for consistent code formatting',
        'Handle errors explicitly, don\'t ignore them',
        'Use goroutines and channels for concurrency',
        'Keep interfaces small and focused',
        'Follow Go naming conventions',
        'Use context for cancellation and timeouts',
        'Prefer composition over inheritance',
        'Write table-driven tests'
      ],
      php: [
        'Use modern PHP features (7.4+)',
        'Follow PSR standards for coding style',
        'Use prepared statements for database queries',
        'Implement proper error handling and logging',
        'Validate and sanitize all user input',
        'Use type declarations and return types',
        'Follow object-oriented principles',
        'Use Composer for dependency management'
      ],
      ruby: [
        'Follow Ruby conventions and style guide',
        'Use blocks and iterators effectively',
        'Prefer symbols over strings for keys',
        'Use meaningful method and variable names',
        'Handle exceptions gracefully',
        'Use modules for mixins and namespacing',
        'Write readable and expressive code',
        'Follow the principle of least surprise'
      ],
      csharp: [
        'Follow .NET naming conventions',
        'Use proper access modifiers',
        'Implement IDisposable for resource cleanup',
        'Use async/await for asynchronous operations',
        'Follow SOLID principles',
        'Use LINQ appropriately for data operations',
        'Handle exceptions specifically',
        'Use dependency injection for testability'
      ],
      swift: [
        'Follow Swift API design guidelines',
        'Use optionals to handle nil values safely',
        'Prefer value types over reference types when appropriate',
        'Use guard statements for early returns',
        'Implement proper memory management with ARC',
        'Use protocol-oriented programming',
        'Handle errors with do-catch statements',
        'Use meaningful names for methods and variables'
      ],
      kotlin: [
        'Use null safety features effectively',
        'Prefer val over var for immutability',
        'Use data classes for simple data holders',
        'Leverage extension functions appropriately',
        'Use coroutines for asynchronous programming',
        'Follow Kotlin coding conventions',
        'Use when expressions instead of switch',
        'Prefer higher-order functions and lambdas'
      ],
      rust: [
        'Use ownership system to prevent memory errors',
        'Handle errors with Result and Option types',
        'Use borrowing instead of moving when possible',
        'Implement traits for shared behavior',
        'Use cargo for project management',
        'Write comprehensive tests',
        'Use pattern matching with match expressions',
        'Prefer iterators over manual loops'
      ]
    };

    return practices[language] || [
      'Follow language-specific conventions and best practices',
      'Use meaningful names for variables and functions',
      'Keep functions small and focused',
      'Handle errors gracefully',
      'Write readable and maintainable code',
      'Add appropriate comments and documentation',
      'Use consistent formatting and style',
      'Consider performance implications'
    ];
  }

  /**
   * Get detailed language information
   */
  static getLanguageInfo(language) {
    const info = {
      javascript: {
        name: 'JavaScript',
        paradigms: ['procedural', 'object-oriented', 'functional'],
        typing: 'dynamic',
        compilation: 'interpreted',
        commonUses: ['web development', 'server-side', 'mobile apps', 'desktop apps']
      },
      typescript: {
        name: 'TypeScript',
        paradigms: ['procedural', 'object-oriented', 'functional'],
        typing: 'static',
        compilation: 'transpiled',
        commonUses: ['web development', 'large-scale applications', 'enterprise software']
      },
      python: {
        name: 'Python',
        paradigms: ['procedural', 'object-oriented', 'functional'],
        typing: 'dynamic',
        compilation: 'interpreted',
        commonUses: ['data science', 'web development', 'automation', 'AI/ML']
      },
      java: {
        name: 'Java',
        paradigms: ['object-oriented', 'functional'],
        typing: 'static',
        compilation: 'compiled',
        commonUses: ['enterprise applications', 'web development', 'mobile apps', 'desktop apps']
      },
      cpp: {
        name: 'C++',
        paradigms: ['procedural', 'object-oriented', 'generic'],
        typing: 'static',
        compilation: 'compiled',
        commonUses: ['system programming', 'game development', 'embedded systems', 'performance-critical applications']
      }
    };

    return info[language] || {
      name: language.charAt(0).toUpperCase() + language.slice(1),
      paradigms: ['unknown'],
      typing: 'unknown',
      compilation: 'unknown',
      commonUses: ['various applications']
    };
  }

  /**
   * Calculate maintainability index
   */
  static calculateMaintainabilityIndex(code, language) {
    const lines = code.split('\n').filter(line => line.trim()).length;
    const complexity = this.calculateComplexityScore(code, language);
    const functions = this.countFunctions(code, language);
    const comments = this.countComments(code, language);
    
    // Simplified maintainability index (0-100 scale)
    const halsteadVolume = Math.log2(lines) * lines; // Simplified Halstead volume
    const cyclomaticComplexity = complexity;
    const linesOfCode = lines;
    
    // Microsoft's maintainability index formula (simplified)
    let mi = 171 - 5.2 * Math.log(halsteadVolume) - 0.23 * cyclomaticComplexity - 16.2 * Math.log(linesOfCode);
    
    // Add bonus for comments
    if (comments > 0) {
      mi += Math.min(10, comments * 2);
    }
    
    // Normalize to 0-100 scale
    return Math.max(0, Math.min(100, Math.round(mi)));
  }

  /**
   * Count comments in code
   */
  static countComments(code, language) {
    const commentPatterns = {
      javascript: /\/\/.*$|\/\*[\s\S]*?\*\//gm,
      typescript: /\/\/.*$|\/\*[\s\S]*?\*\//gm,
      python: /#.*$|"""[\s\S]*?"""|'''[\s\S]*?'''/gm,
      java: /\/\/.*$|\/\*[\s\S]*?\*\//gm,
      cpp: /\/\/.*$|\/\*[\s\S]*?\*\//gm,
      go: /\/\/.*$/gm,
      php: /\/\/.*$|\/\*[\s\S]*?\*\/|#.*$/gm,
      ruby: /#.*$|=begin[\s\S]*?=end/gm,
      csharp: /\/\/.*$|\/\*[\s\S]*?\*\//gm,
      swift: /\/\/.*$|\/\*[\s\S]*?\*\//gm,
      kotlin: /\/\/.*$|\/\*[\s\S]*?\*\//gm,
      rust: /\/\/.*$|\/\*[\s\S]*?\*\//gm
    };

    const pattern = commentPatterns[language] || commentPatterns.javascript;
    const matches = code.match(pattern) || [];
    return matches.length;
  }

  /**
   * Analyze code metrics
   */
  static analyzeCodeMetrics(code, language) {
    const lines = code.split('\n');
    const nonEmptyLines = lines.filter(line => line.trim()).length;
    const commentLines = this.countComments(code, language);
    const codeLines = nonEmptyLines - commentLines;
    
    return {
      totalLines: lines.length,
      codeLines: codeLines,
      commentLines: commentLines,
      blankLines: lines.length - nonEmptyLines,
      complexity: this.calculateComplexityScore(code, language),
      functions: this.countFunctions(code, language),
      maintainabilityIndex: this.calculateMaintainabilityIndex(code, language),
      maxNesting: this.calculateMaxNesting(code),
      averageLineLength: Math.round(code.length / lines.length),
      commentRatio: Math.round((commentLines / nonEmptyLines) * 100) || 0
    };
  }
}

module.exports = LanguagePromptsService;