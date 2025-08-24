// src/utils/languageDetector.js
export class LanguageDetector {
  constructor() {
    this.patterns = {
      javascript: {
        extensions: ['.js', '.jsx', '.mjs', '.ts', '.tsx'],
        keywords: ['function', 'const', 'let', 'var', 'import', 'export', 'class', '=>', 'async', 'await'],
        patterns: [
          /import\s+.*\s+from\s+['"`]/,
          /export\s+(default\s+)?/,
          /const\s+\w+\s*=/,
          /function\s+\w+\s*\(/,
          /=>\s*{?/,
          /console\.log\s*\(/,
          /\.map\s*\(|\.filter\s*\(|\.reduce\s*\(/,
          /React\.|useState|useEffect/
        ],
        score: 0
      },
      typescript: {
        extensions: ['.ts', '.tsx'],
        keywords: ['interface', 'type', 'enum', 'implements', 'extends', 'public', 'private'],
        patterns: [
          /interface\s+\w+\s*{/,
          /type\s+\w+\s*=/,
          /enum\s+\w+\s*{/,
          /:\s*(string|number|boolean|void)/,
          /public\s+|private\s+|protected\s+/,
          /implements\s+\w+/
        ],
        score: 0
      },
      python: {
        extensions: ['.py', '.pyw', '.pyx'],
        keywords: ['def', 'import', 'from', 'class', 'if', 'elif', 'else', 'for', 'while', 'try', 'except'],
        patterns: [
          /def\s+\w+\s*\(/,
          /import\s+\w+/,
          /from\s+\w+\s+import/,
          /class\s+\w+\s*\(?.*\)?:/,
          /if\s+__name__\s*==\s*['"]__main__['"]/,
          /print\s*\(/,
          /@\w+/,
          /self\./
        ],
        score: 0
      },
      java: {
        extensions: ['.java'],
        keywords: ['public', 'private', 'protected', 'class', 'interface', 'extends', 'implements', 'static'],
        patterns: [
          /public\s+(static\s+)?void\s+main/,
          /public\s+class\s+\w+/,
          /import\s+java\./,
          /System\.out\.print/,
          /@\w+/,
          /new\s+\w+\s*\(/,
          /public\s+\w+\s+\w+\s*\(/
        ],
        score: 0
      },
      cpp: {
        extensions: ['.cpp', '.cc', '.cxx', '.c++', '.hpp', '.h'],
        keywords: ['#include', 'using', 'namespace', 'class', 'public', 'private', 'protected', 'template'],
        patterns: [
          /#include\s*<.*>/,
          /using\s+namespace\s+std/,
          /int\s+main\s*\(/,
          /std::/,
          /cout\s*<<|cin\s*>>/,
          /class\s+\w+\s*{/,
          /template\s*</,
          /vector\s*</
        ],
        score: 0
      },
      c: {
        extensions: ['.c', '.h'],
        keywords: ['#include', 'int', 'char', 'float', 'double', 'void', 'struct', 'typedef'],
        patterns: [
          /#include\s*<.*\.h>/,
          /int\s+main\s*\(/,
          /printf\s*\(|scanf\s*\(/,
          /malloc\s*\(|free\s*\(/,
          /struct\s+\w+\s*{/,
          /typedef\s+/
        ],
        score: 0
      },
      csharp: {
        extensions: ['.cs'],
        keywords: ['using', 'namespace', 'class', 'public', 'private', 'protected', 'static', 'var'],
        patterns: [
          /using\s+System/,
          /namespace\s+\w+/,
          /public\s+class\s+\w+/,
          /Console\.Write/,
          /var\s+\w+\s*=/,
          /public\s+static\s+void\s+Main/
        ],
        score: 0
      },
      go: {
        extensions: ['.go'],
        keywords: ['package', 'import', 'func', 'var', 'const', 'type', 'struct', 'interface'],
        patterns: [
          /package\s+main/,
          /import\s+\(/,
          /func\s+\w+\s*\(/,
          /fmt\.Print/,
          /var\s+\w+\s+\w+/,
          /type\s+\w+\s+struct/
        ],
        score: 0
      },
      rust: {
        extensions: ['.rs'],
        keywords: ['fn', 'let', 'mut', 'struct', 'impl', 'trait', 'enum', 'match'],
        patterns: [
          /fn\s+\w+\s*\(/,
          /let\s+(mut\s+)?\w+/,
          /println!\s*\(/,
          /struct\s+\w+\s*{/,
          /impl\s+\w+/,
          /match\s+\w+\s*{/
        ],
        score: 0
      },
      php: {
        extensions: ['.php'],
        keywords: ['<?php', 'function', 'class', 'public', 'private', 'protected', 'echo', 'print'],
        patterns: [
          /<\?php/,
          /function\s+\w+\s*\(/,
          /class\s+\w+\s*{/,
          /echo\s+|print\s+/,
          /\$\w+/,
          /public\s+function/
        ],
        score: 0
      },
      ruby: {
        extensions: ['.rb'],
        keywords: ['def', 'class', 'module', 'end', 'if', 'unless', 'while', 'until'],
        patterns: [
          /def\s+\w+/,
          /class\s+\w+/,
          /puts\s+|print\s+/,
          /end\s*$/,
          /@\w+/,
          /\|\w+\|/
        ],
        score: 0
      },
      swift: {
        extensions: ['.swift'],
        keywords: ['func', 'var', 'let', 'class', 'struct', 'enum', 'protocol', 'extension'],
        patterns: [
          /func\s+\w+\s*\(/,
          /var\s+\w+\s*:/,
          /let\s+\w+\s*=/,
          /class\s+\w+\s*:/,
          /print\s*\(/,
          /override\s+func/
        ],
        score: 0
      },
      kotlin: {
        extensions: ['.kt', '.kts'],
        keywords: ['fun', 'val', 'var', 'class', 'object', 'interface', 'when', 'data'],
        patterns: [
          /fun\s+\w+\s*\(/,
          /val\s+\w+\s*=/,
          /var\s+\w+\s*:/,
          /class\s+\w+\s*\(/,
          /println\s*\(/,
          /data\s+class/
        ],
        score: 0
      }
    };
  }

  detectLanguage(code, filename = '') {
    // Reset scores
    Object.keys(this.patterns).forEach(lang => {
      this.patterns[lang].score = 0;
    });

    // Check file extension first
    if (filename) {
      const ext = filename.toLowerCase();
      Object.entries(this.patterns).forEach(([lang, config]) => {
        if (config.extensions.some(extension => ext.endsWith(extension))) {
          this.patterns[lang].score += 50; // High weight for file extension
        }
      });
    }

    // Analyze code patterns
    const lines = code.split('\n');
    const codeText = code.toLowerCase();

    Object.entries(this.patterns).forEach(([lang, config]) => {
      // Check keywords
      config.keywords.forEach(keyword => {
        const regex = new RegExp(`\\b${keyword.toLowerCase()}\\b`, 'g');
        const matches = codeText.match(regex);
        if (matches) {
          this.patterns[lang].score += matches.length * 2;
        }
      });

      // Check patterns
      config.patterns.forEach(pattern => {
        lines.forEach(line => {
          if (pattern.test(line)) {
            this.patterns[lang].score += 5;
          }
        });
      });
    });

    // Find language with highest score
    let detectedLanguage = 'plaintext';
    let maxScore = 0;

    Object.entries(this.patterns).forEach(([lang, config]) => {
      if (config.score > maxScore) {
        maxScore = config.score;
        detectedLanguage = lang;
      }
    });

    // Return plaintext if score is too low (likely not code)
    return maxScore < 5 ? 'plaintext' : detectedLanguage;
  }

  getSupportedLanguages() {
    return Object.keys(this.patterns).map(lang => ({
      id: lang,
      name: this.getLanguageDisplayName(lang),
      extensions: this.patterns[lang].extensions
    }));
  }

  getLanguageDisplayName(langId) {
    const displayNames = {
      javascript: 'JavaScript',
      typescript: 'TypeScript',
      python: 'Python',
      java: 'Java',
      cpp: 'C++',
      c: 'C',
      csharp: 'C#',
      go: 'Go',
      rust: 'Rust',
      php: 'PHP',
      ruby: 'Ruby',
      swift: 'Swift',
      kotlin: 'Kotlin',
      plaintext: 'Plain Text'
    };
    return displayNames[langId] || langId.charAt(0).toUpperCase() + langId.slice(1);
  }
}

// Create singleton instance
export const languageDetector = new LanguageDetector();