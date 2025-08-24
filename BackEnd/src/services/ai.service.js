// src/services/ai.service.js (FIXED VERSION - PROPER FETCH HANDLING)

class CodeAnalyzer {
    constructor() {
        this.apiKey = process.env.GOOGLE_GEMINI_KEY || process.env.GEMINI_API_KEY;
        this.apiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';
        
        // Initialize fetch - Node.js 18+ has built-in fetch
        this.initializeFetch();
        
        if (!this.apiKey) {
            console.error('CRITICAL: Gemini API key not found in environment variables');
            console.error('Required: GOOGLE_GEMINI_KEY or GEMINI_API_KEY');
        }
    }

    async initializeFetch() {
        // Check if fetch is available (Node.js 18+)
        if (typeof globalThis.fetch === 'undefined') {
            try {
                // Dynamic import for node-fetch v3 (ES module)
                const { default: fetch, Headers, Request, Response } = await import('node-fetch');
                globalThis.fetch = fetch;
                globalThis.Headers = Headers;
                globalThis.Request = Request;
                globalThis.Response = Response;
                console.log('Loaded node-fetch v3 successfully');
            } catch (error) {
                console.error('Failed to load node-fetch:', error.message);
                throw new Error('Fetch API not available. Please ensure Node.js 18+ or install node-fetch');
            }
        } else {
            console.log('Using built-in fetch (Node.js 18+)');
        }
    }

    async analyze(code, selectedLanguage = 'javascript', additionalContext = {}) {
        const startTime = Date.now();
        
        try {
            console.log(`AI Analysis Started - Selected: ${selectedLanguage}`);
            
            // Ensure fetch is available
            await this.initializeFetch();
            
            if (!this.apiKey) {
                throw new Error('GEMINI_API_KEY_MISSING: No API key found in environment variables');
            }

            if (!code || code.trim().length === 0) {
                throw new Error('CODE_EMPTY: Code is required and cannot be empty');
            }

            if (code.length > 50000) {
                throw new Error('CODE_TOO_LARGE: Code is too large. Maximum size is 50KB.');
            }

            const detectedLanguage = this.detectLanguage(code);
            const finalLanguage = selectedLanguage || detectedLanguage;

            console.log(`Language Detection: ${detectedLanguage}, Final: ${finalLanguage}`);

            const analysisPrompt = this.generateAnalysisPrompt(code, finalLanguage);
            const geminiResponse = await this.callGeminiAPI(analysisPrompt);
            const parsedAnalysis = this.parseGeminiResponse(geminiResponse);
            
            const finalAnalysis = this.createFinalAnalysis(
                parsedAnalysis, 
                code, 
                detectedLanguage, 
                finalLanguage,
                Date.now() - startTime
            );

            console.log(`Analysis completed in ${Date.now() - startTime}ms`);
            return finalAnalysis;

        } catch (error) {
            console.error('AI Analysis Error:', error);
            return this.createErrorResponse(error, selectedLanguage, code, Date.now() - startTime);
        }
    }

    detectLanguage(code) {
        const patterns = {
            javascript: [/function\s+\w+/, /const\s+\w+\s*=/, /console\.log/, /require\s*\(/, /=>\s*{?/],
            typescript: [/interface\s+\w+/, /:\s*\w+(\[\])?/, /type\s+\w+\s*=/, /<.*>/],
            python: [/def\s+\w+\s*\(/, /import\s+\w+/, /if\s+__name__/, /print\s*\(/],
            java: [/public\s+class/, /public\s+static\s+void/, /System\.out\.print/],
            cpp: [/#include\s*</, /std::/, /cout\s*<</, /namespace\s+\w+/],
            go: [/package\s+\w+/, /func\s+\w+/, /fmt\.Print/],
            php: [/<\?php/, /echo\s+/, /\$\w+/],
            ruby: [/def\s+\w+/, /puts\s+/, /end\s*$/m],
            csharp: [/using\s+System/, /Console\.Write/, /public\s+class/],
            swift: [/import\s+\w+/, /func\s+\w+/, /var\s+\w+/],
            kotlin: [/fun\s+\w+/, /val\s+\w+/, /var\s+\w+/],
            rust: [/fn\s+\w+/, /let\s+\w+/, /println!/]
        };

        let maxScore = 0;
        let detectedLang = 'javascript';

        Object.entries(patterns).forEach(([language, languagePatterns]) => {
            let score = 0;
            languagePatterns.forEach(pattern => {
                const matches = (code.match(pattern) || []).length;
                score += matches;
            });
            
            if (score > maxScore) {
                maxScore = score;
                detectedLang = language;
            }
        });

        return detectedLang;
    }

    async callGeminiAPI(prompt) {
        const maxRetries = 3;
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                console.log(`Gemini API attempt ${attempt}/${maxRetries}`);
                
                const requestUrl = `${this.apiUrl}?key=${this.apiKey}`;

                const response = await fetch(requestUrl, {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: prompt }] }],
                        generationConfig: {
                            temperature: 0.3,
                            topK: 1,
                            topP: 0.8,
                            maxOutputTokens: 4096
                        }
                    })
                });

                console.log(`API Response Status: ${response.status}`);

                if (!response.ok) {
                    const errorText = await response.text();
                    console.error(`API Error Response: ${errorText}`);
                    
                    if (response.status === 400) {
                        throw new Error(`API_REQUEST_ERROR: Invalid request - ${errorText}`);
                    } else if (response.status === 401) {
                        throw new Error(`API_AUTH_ERROR: Invalid API key`);
                    } else if (response.status === 403) {
                        throw new Error(`API_PERMISSION_ERROR: API access forbidden`);
                    } else if (response.status === 429) {
                        throw new Error(`API_RATE_LIMIT: Rate limit exceeded`);
                    } else {
                        throw new Error(`API_ERROR: HTTP ${response.status}`);
                    }
                }

                const data = await response.json();
                const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
                
                if (!content) {
                    throw new Error('API_EMPTY_RESPONSE: No content in API response');
                }

                return content;

            } catch (error) {
                console.error(`Attempt ${attempt} failed:`, error.message);
                
                if (error.message.includes('API_AUTH_ERROR') || 
                    error.message.includes('API_PERMISSION_ERROR')) {
                    throw error;
                }
                
                if (attempt === maxRetries) {
                    throw new Error(`GEMINI_API_FAILED: All attempts failed. Last error: ${error.message}`);
                }
                
                const delayMs = 1000 * attempt;
                await new Promise(resolve => setTimeout(resolve, delayMs));
            }
        }
    }

    generateAnalysisPrompt(code, language) {
        const truncatedCode = code.length > 4000 ? code.substring(0, 4000) + '\n... (truncated)' : code;
        
        return `Analyze this ${language} code and provide a comprehensive review in JSON format.

CODE TO ANALYZE:
\`\`\`${language}
${truncatedCode}
\`\`\`

Respond with VALID JSON only in this exact format:
{
    "overallScore": 7.5,
    "summary": "Brief summary of code quality",
    "strengths": ["Strength 1", "Strength 2"],
    "issues": [
        {
            "type": "security",
            "severity": "high",
            "title": "Issue title",
            "description": "Detailed description",
            "lineNumber": 5,
            "suggestion": "How to fix this"
        }
    ],
    "suggestions": ["Suggestion 1", "Suggestion 2"],
    "securityScore": 8,
    "performanceScore": 7,
    "maintainabilityScore": 8,
    "readabilityScore": 8
}

Focus on ${language} best practices, security vulnerabilities, performance optimizations, and maintainability improvements.`;
    }

    parseGeminiResponse(rawResponse) {
        try {
            console.log('Parsing Gemini response...');
            
            let cleanResponse = rawResponse.trim();
            cleanResponse = cleanResponse.replace(/```json\s*/gi, '').replace(/```\s*$/gi, '');
            
            const jsonMatch = cleanResponse.match(/\{[\s\S]*\}/);
            
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                console.log('Successfully parsed Gemini response');
                return parsed;
            }
            
            throw new Error('No valid JSON found in response');
            
        } catch (error) {
            console.error('Parse error:', error);
            return this.createFallbackAnalysis();
        }
    }

    createFinalAnalysis(parsedAnalysis, code, detectedLanguage, finalLanguage, processingTime) {
        const codeStats = this.calculateCodeStats(code);
        
        return {
            overallScore: parsedAnalysis.overallScore || 7,
            grade: this.calculateGrade(parsedAnalysis.overallScore || 7),
            summary: parsedAnalysis.summary || "Code analysis completed successfully",
            
            language: {
                detected: detectedLanguage,
                selected: finalLanguage,
                confidence: 0.8
            },
            
            issues: parsedAnalysis.issues || [],
            suggestions: parsedAnalysis.suggestions || ['No specific suggestions'],
            strengths: parsedAnalysis.strengths || ['Code structure is reasonable'],
            
            metrics: {
                security: parsedAnalysis.securityScore || 8,
                performance: parsedAnalysis.performanceScore || 7,
                maintainability: parsedAnalysis.maintainabilityScore || 8,
                readability: parsedAnalysis.readabilityScore || 8,
                complexity: this.calculateSimpleComplexity(code),
                testability: 7
            },
            
            statistics: {
                ...codeStats,
                complexity: {
                    overall: this.calculateSimpleComplexity(code),
                    cyclomatic: this.calculateSimpleComplexity(code),
                    nesting: this.calculateNesting(code)
                }
            },
            
            metadata: {
                version: '3.2.0',
                timestamp: new Date().toISOString(),
                processingTime: `${processingTime}ms`,
                success: true
            }
        };
    }

    calculateCodeStats(code) {
        const lines = code.split('\n');
        const nonEmptyLines = lines.filter(line => line.trim().length > 0);
        
        return {
            totalLines: lines.length,
            codeLines: nonEmptyLines.length,
            emptyLines: lines.length - nonEmptyLines.length,
            averageLineLength: code.length / lines.length,
            functions: this.countFunctions(code),
            classes: this.countClasses(code)
        };
    }

    calculateSimpleComplexity(code) {
        const complexityKeywords = ['if', 'else', 'while', 'for', 'switch', 'case', 'catch'];
        let complexity = 1;
        
        complexityKeywords.forEach(keyword => {
            const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
            const matches = (code.match(regex) || []).length;
            complexity += matches;
        });
        
        return Math.min(complexity, 20);
    }

    calculateNesting(code) {
        const lines = code.split('\n');
        let maxDepth = 0;
        let currentDepth = 0;
        
        lines.forEach(line => {
            const openBraces = (line.match(/\{/g) || []).length;
            const closeBraces = (line.match(/\}/g) || []).length;
            currentDepth += openBraces - closeBraces;
            maxDepth = Math.max(maxDepth, currentDepth);
        });
        
        return maxDepth;
    }

    countFunctions(code) {
        const patterns = [
            /function\s+\w+/gi,
            /\w+\s*:\s*function/gi,
            /=>\s*{/gi,
            /def\s+\w+/gi
        ];
        
        let count = 0;
        patterns.forEach(pattern => {
            count += (code.match(pattern) || []).length;
        });
        
        return count;
    }

    countClasses(code) {
        const patterns = [/class\s+\w+/gi, /interface\s+\w+/gi];
        
        let count = 0;
        patterns.forEach(pattern => {
            count += (code.match(pattern) || []).length;
        });
        
        return count;
    }

    calculateGrade(score) {
        if (score >= 9) return 'A+';
        if (score >= 8.5) return 'A';
        if (score >= 7.5) return 'B+';
        if (score >= 6.5) return 'B';
        if (score >= 5.5) return 'C+';
        if (score >= 4.5) return 'C';
        return 'D';
    }

    createFallbackAnalysis() {
        return {
            overallScore: 6,
            summary: "Basic analysis completed - AI parsing unavailable",
            issues: [],
            suggestions: ["Review code manually for improvements"],
            strengths: ["Code structure appears reasonable"],
            securityScore: 7,
            performanceScore: 6,
            maintainabilityScore: 7,
            readabilityScore: 7
        };
    }

    createErrorResponse(error, language, code, processingTime) {
        console.error('Creating error response:', error.message);
        
        let userMessage = 'Analysis failed due to a technical error. Please try again.';
        let suggestions = ['Try again in a moment', 'Check your internet connection'];
        
        if (error.message.includes('API_KEY_MISSING')) {
            userMessage = 'API key configuration error. Please contact support.';
            suggestions = ['Contact support to configure API access'];
        } else if (error.message.includes('API_AUTH_ERROR')) {
            userMessage = 'API authentication failed. Please contact support.';
            suggestions = ['Contact support to verify API access'];
        } else if (error.message.includes('API_RATE_LIMIT')) {
            userMessage = 'Analysis service is temporarily busy. Please try again in a moment.';
            suggestions = ['Wait a few moments and try again'];
        }
        
        const basicStats = this.calculateCodeStats(code);
        
        return {
            error: true,
            message: userMessage,
            overallScore: 5,
            grade: 'C',
            summary: 'Analysis could not be completed due to technical issues',
            
            language: { 
                detected: language, 
                selected: language, 
                confidence: 0.8 
            },
            
            metrics: {
                security: 6,
                performance: 6,
                maintainability: 6,
                readability: 6,
                complexity: 5,
                testability: 5
            },
            
            statistics: {
                ...basicStats,
                complexity: { overall: 5, cyclomatic: 5, nesting: 2 }
            },
            
            issues: [],
            suggestions,
            strengths: ['Code submitted for analysis'],
            
            metadata: {
                version: '3.2.0',
                timestamp: new Date().toISOString(),
                processingTime: `${processingTime}ms`,
                error: error.message,
                success: false
            }
        };
    }
}

// Create analyzer instance
const codeAnalyzer = new CodeAnalyzer();

// Main service function
const aiService = async (code, language = 'javascript', additionalContext = {}) => {
    try {
        console.log('AI Service called with:', { 
            codeLength: code.length, 
            language
        });
        
        return await codeAnalyzer.analyze(code, language, additionalContext);
    } catch (error) {
        console.error('AI Service Error:', error);
        throw error;
    }
};

// Export the service function
module.exports = aiService;