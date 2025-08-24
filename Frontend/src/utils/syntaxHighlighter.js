// src/utils/syntaxHighlighter.js
export class SyntaxHighlighter {
  constructor() {
    this.themes = {
      dark: {
        background: 'bg-gray-900',
        text: 'text-gray-300',
        keyword: 'text-purple-400',
        string: 'text-green-400',
        number: 'text-blue-400',
        comment: 'text-gray-500',
        function: 'text-yellow-400',
        operator: 'text-pink-400',
        punctuation: 'text-gray-400',
        type: 'text-cyan-400'
      },
      light: {
        background: 'bg-gray-50',
        text: 'text-gray-800',
        keyword: 'text-purple-600',
        string: 'text-green-600',
        number: 'text-blue-600',
        comment: 'text-gray-400',
        function: 'text-yellow-600',
        operator: 'text-pink-600',
        punctuation: 'text-gray-600',
        type: 'text-cyan-600'
      }
    };

    this.patterns = {
      javascript: {
        keywords: /\b(async|await|break|case|catch|class|const|continue|debugger|default|delete|do|else|enum|export|extends|false|finally|for|function|if|import|in|instanceof|let|new|null|return|super|switch|this|throw|true|try|typeof|undefined|var|void|while|with|yield)\b/g,
        strings: /(["'`])((?:\\.|(?!\1)[^\\\r\n])*?)\1/g,
        numbers: /\b\d+\.?\d*\b/g,
        comments: /(\/\/.*$|\/\*[\s\S]*?\*\/)/gm,
        functions: /\b(\w+)(?=\s*\()/g,
        operators: /[+\-*/%=<>!&|^~?:]/g
      },
      python: {
        keywords: /\b(False|None|True|and|as|assert|async|await|break|class|continue|def|del|elif|else|except|finally|for|from|global|if|import|in|is|lambda|nonlocal|not|or|pass|raise|return|try|while|with|yield)\b/g,
        strings: /("""[\s\S]*?"""|'''[\s\S]*?'''|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')/g,
        numbers: /\b\d+\.?\d*\b/g,
        comments: /(#.*$)/gm,
        functions: /\bdef\s+(\w+)/g,
        operators: /[+\-*/%=<>!&|^~]/g
      },
      java: {
        keywords: /\b(abstract|assert|boolean|break|byte|case|catch|char|class|const|continue|default|do|double|else|enum|extends|final|finally|float|for|goto|if|implements|import|instanceof|int|interface|long|native|new|package|private|protected|public|return|short|static|strictfp|super|switch|synchronized|this|throw|throws|transient|try|void|volatile|while)\b/g,
        strings: /(["'])((?:\\.|(?!\1)[^\\\r\n])*?)\1/g,
        numbers: /\b\d+\.?\d*[fFdDlL]?\b/g,
        comments: /(\/\/.*$|\/\*[\s\S]*?\*\/)/gm,
        functions: /\b(\w+)(?=\s*\()/g,
        operators: /[+\-*/%=<>!&|^~?:]/g,
        types: /\b(String|Integer|Double|Boolean|List|Map|Set|Array)\b/g
      },
      cpp: {
        keywords: /\b(alignas|alignof|and|and_eq|asm|atomic_cancel|atomic_commit|atomic_noexcept|auto|bitand|bitor|bool|break|case|catch|char|char8_t|char16_t|char32_t|class|compl|concept|const|consteval|constexpr|constinit|const_cast|continue|co_await|co_return|co_yield|decltype|default|delete|do|double|dynamic_cast|else|enum|explicit|export|extern|false|float|for|friend|goto|if|inline|int|long|mutable|namespace|new|noexcept|not|not_eq|nullptr|operator|or|or_eq|private|protected|public|reflexpr|register|reinterpret_cast|requires|return|short|signed|sizeof|static|static_assert|static_cast|struct|switch|synchronized|template|this|thread_local|throw|true|try|typedef|typeid|typename|union|unsigned|using|virtual|void|volatile|wchar_t|while|xor|xor_eq)\b/g,
        strings: /(["'])((?:\\.|(?!\1)[^\\\r\n])*?)\1/g,
        numbers: /\b\d+\.?\d*[fFlLuU]?\b/g,
        comments: /(\/\/.*$|\/\*[\s\S]*?\*\/)/gm,
        functions: /\b(\w+)(?=\s*\()/g,
        operators: /[+\-*/%=<>!&|^~?:]/g,
        preprocessor: /#\w+/g
      },
      c: {
        keywords: /\b(auto|break|case|char|const|continue|default|do|double|else|enum|extern|float|for|goto|if|inline|int|long|register|restrict|return|short|signed|sizeof|static|struct|switch|typedef|union|unsigned|void|volatile|while|_Alignas|_Alignof|_Atomic|_Static_assert|_Noreturn|_Thread_local|_Generic)\b/g,
        strings: /(["'])((?:\\.|(?!\1)[^\\\r\n])*?)\1/g,
        numbers: /\b\d+\.?\d*[fFlLuU]?\b/g,
        comments: /(\/\/.*$|\/\*[\s\S]*?\*\/)/gm,
        functions: /\b(\w+)(?=\s*\()/g,
        operators: /[+\-*/%=<>!&|^~?:]/g,
        preprocessor: /#\w+/g
      },
      go: {
        keywords: /\b(break|case|chan|const|continue|default|defer|else|fallthrough|for|func|go|goto|if|import|interface|map|package|range|return|select|struct|switch|type|var)\b/g,
        strings: /(["'`])((?:\\.|(?!\1)[^\\\r\n])*?)\1/g,
        numbers: /\b\d+\.?\d*\b/g,
        comments: /(\/\/.*$|\/\*[\s\S]*?\*\/)/gm,
        functions: /\bfunc\s+(\w+)/g,
        operators: /[+\-*/%=<>!&|^~?:]/g,
        types: /\b(bool|byte|complex64|complex128|error|float32|float64|int|int8|int16|int32|int64|rune|string|uint|uint8|uint16|uint32|uint64|uintptr)\b/g
      },
      rust: {
        keywords: /\b(as|async|await|break|const|continue|crate|dyn|else|enum|extern|false|fn|for|if|impl|in|let|loop|match|mod|move|mut|pub|ref|return|self|Self|static|struct|super|trait|true|type|unsafe|use|where|while)\b/g,
        strings: /(["'])((?:\\.|(?!\1)[^\\\r\n])*?)\1/g,
        numbers: /\b\d+\.?\d*\b/g,
        comments: /(\/\/.*$|\/\*[\s\S]*?\*\/)/gm,
        functions: /\bfn\s+(\w+)/g,
        operators: /[+\-*/%=<>!&|^~?:]/g,
        types: /\b(i8|i16|i32|i64|i128|isize|u8|u16|u32|u64|u128|usize|f32|f64|bool|char|str)\b/g
      },
      csharp: {
        keywords: /\b(abstract|as|base|bool|break|byte|case|catch|char|checked|class|const|continue|decimal|default|delegate|do|double|else|enum|event|explicit|extern|false|finally|fixed|float|for|foreach|goto|if|implicit|in|int|interface|internal|is|lock|long|namespace|new|null|object|operator|out|override|params|private|protected|public|readonly|ref|return|sbyte|sealed|short|sizeof|stackalloc|static|string|struct|switch|this|throw|true|try|typeof|uint|ulong|unchecked|unsafe|ushort|using|var|virtual|void|volatile|while)\b/g,
        strings: /(["'])((?:\\.|(?!\1)[^\\\r\n])*?)\1/g,
        numbers: /\b\d+\.?\d*[fFdDmM]?\b/g,
        comments: /(\/\/.*$|\/\*[\s\S]*?\*\/)/gm,
        functions: /\b(\w+)(?=\s*\()/g,
        operators: /[+\-*/%=<>!&|^~?:]/g
      }
    };
  }

  highlight(code, language = 'javascript', theme = 'dark') {
    const themeColors = this.themes[theme];
    const langPatterns = this.patterns[language] || this.patterns.javascript;
    
    let highlightedCode = code;
    
    // Track positions to avoid overlapping highlights
    const highlights = [];
    
    // Process different token types in order of priority
    const tokenTypes = [
      { name: 'comments', pattern: langPatterns.comments, className: themeColors.comment },
      { name: 'strings', pattern: langPatterns.strings, className: themeColors.string },
      { name: 'numbers', pattern: langPatterns.numbers, className: themeColors.number },
      { name: 'keywords', pattern: langPatterns.keywords, className: themeColors.keyword },
      { name: 'functions', pattern: langPatterns.functions, className: themeColors.function },
      { name: 'types', pattern: langPatterns.types, className: themeColors.type },
      { name: 'operators', pattern: langPatterns.operators, className: themeColors.operator }
    ];

    // Find all matches first
    tokenTypes.forEach(tokenType => {
      if (!tokenType.pattern) return;
      
      let match;
      const pattern = new RegExp(tokenType.pattern);
      pattern.global = true;
      
      while ((match = pattern.exec(code)) !== null) {
        highlights.push({
          start: match.index,
          end: match.index + match[0].length,
          text: match[0],
          className: tokenType.className,
          type: tokenType.name
        });
      }
    });

    // Sort by start position
    highlights.sort((a, b) => a.start - b.start);

    // Remove overlaps (keep first match)
    const cleanHighlights = [];
    let lastEnd = 0;
    
    highlights.forEach(highlight => {
      if (highlight.start >= lastEnd) {
        cleanHighlights.push(highlight);
        lastEnd = highlight.end;
      }
    });

    // Apply highlights from end to start to preserve positions
    cleanHighlights.reverse().forEach(highlight => {
      const before = highlightedCode.substring(0, highlight.start);
      const highlighted = `<span class="${highlight.className}">${highlight.text}</span>`;
      const after = highlightedCode.substring(highlight.end);
      highlightedCode = before + highlighted + after;
    });

    return highlightedCode;
  }

  highlightLines(code, language = 'javascript', theme = 'dark') {
    const lines = code.split('\n');
    return lines.map((line, index) => ({
      number: index + 1,
      content: this.highlight(line, language, theme),
      raw: line
    }));
  }

  getLineNumbers(code) {
    const lines = code.split('\n');
    return lines.map((_, index) => index + 1);
  }

  estimateLanguage(code) {
    let maxScore = 0;
    let detectedLanguage = 'javascript';

    Object.entries(this.patterns).forEach(([lang, patterns]) => {
      let score = 0;
      
      // Count keyword matches
      if (patterns.keywords) {
        const matches = code.match(patterns.keywords);
        score += matches ? matches.length * 2 : 0;
      }

      // Count string pattern matches
      if (patterns.strings) {
        const matches = code.match(patterns.strings);
        score += matches ? matches.length : 0;
      }

      if (score > maxScore) {
        maxScore = score;
        detectedLanguage = lang;
      }
    });

    return detectedLanguage;
  }

  getSupportedLanguages() {
    return Object.keys(this.patterns);
  }

  addCustomTheme(name, colors) {
    this.themes[name] = colors;
  }

  addCustomLanguage(name, patterns) {
    this.patterns[name] = patterns;
  }
}

// Create singleton instance
export const syntaxHighlighter = new SyntaxHighlighter();

// React component wrapper
export const CodeBlock = ({ 
  code, 
  language = 'javascript', 
  theme = 'dark',
  showLineNumbers = true,
  className = '' 
}) => {
  const highlighter = new SyntaxHighlighter();
  const lines = highlighter.highlightLines(code, language, theme);
  const themeColors = highlighter.themes[theme];

  return (
    <div className={`${themeColors.background} rounded-lg overflow-hidden ${className}`}>
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
        <span className="text-sm text-gray-400 font-mono">{language}</span>
        <button 
          onClick={() => navigator.clipboard.writeText(code)}
          className="text-xs text-gray-400 hover:text-white transition-colors"
        >
          Copy
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <tbody>
            {lines.map((line) => (
              <tr key={line.number} className="hover:bg-white/5">
                {showLineNumbers && (
                  <td className="px-4 py-1 text-right text-xs text-gray-500 select-none border-r border-gray-700 min-w-[3rem]">
                    {line.number}
                  </td>
                )}
                <td className="px-4 py-1">
                  <code 
                    className={`text-sm font-mono ${themeColors.text}`}
                    dangerouslySetInnerHTML={{ __html: line.content || '&nbsp;' }}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};