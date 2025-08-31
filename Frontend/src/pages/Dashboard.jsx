import { API_ENDPOINTS, getAuthToken } from '../config/api';
import React, { useState } from 'react';
import { Code, Sparkles, CheckCircle, AlertTriangle, XCircle, Shield, Zap, Wrench, Eye, Target, TrendingUp, Clock, FileText } from 'lucide-react';
import { languageDetector } from '../utils/languageDetector';
import { useTheme } from '../components/ThemeProvider';
import useAuth from '../hooks/useAuth';

function Dashboard({ onNavigate, user }) {
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('javascript');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [error, setError] = useState(null);
  const [warnings, setWarnings] = useState([]);
  const [autoDetectedLang, setAutoDetectedLang] = useState(null);

  // Get theme using the hook
  const { isDark } = useTheme();
  // Get all auth functions
const authHook = useAuth();
const { setUserData, updateReviewUsage } = authHook;
  
  const theme = isDark ? 'dark' : 'light';

  const languages = [
    { id: 'javascript', name: 'JavaScript', color: 'text-yellow-400', icon: '🟨' },
    { id: 'python', name: 'Python', color: 'text-blue-400', icon: '🐍' },
    { id: 'java', name: 'Java', color: 'text-red-400', icon: '☕' },
    { id: 'cpp', name: 'C++', color: 'text-purple-400', icon: '⚡' },
    { id: 'go', name: 'Go', color: 'text-cyan-400', icon: '🏹' },
    { id: 'rust', name: 'Rust', color: 'text-orange-400', icon: '🦀' },
    { id: 'typescript', name: 'TypeScript', color: 'text-blue-500', icon: '📘' },
    { id: 'php', name: 'PHP', color: 'text-indigo-400', icon: '🐘' },
    { id: 'ruby', name: 'Ruby', color: 'text-red-500', icon: '💎' },
    { id: 'swift', name: 'Swift', color: 'text-orange-500', icon: '🦉' },
    { id: 'kotlin', name: 'Kotlin', color: 'text-purple-500', icon: '🎯' },
    { id: 'csharp', name: 'C#', color: 'text-green-500', icon: '#️⃣' }
  ];

  const handleAnalyze = async () => {
    if (!code.trim()) return;

    if (user && user.reviewsUsed >= user.reviewsLimit) {
      alert("You've reached your review limit! Upgrade to Pro for unlimited reviews.");
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setWarnings([]);
    setAnalysis(null);

    try {
      // DETECT LANGUAGE AUTOMATICALLY
      const detectedLanguage = languageDetector.detectLanguage(code);
      setAutoDetectedLang(detectedLanguage);

      // Check for language mismatch
      let warningsArray = [];
      if (detectedLanguage !== language && detectedLanguage !== "plaintext") {
        warningsArray.push({
          type: "language_mismatch",
          message: `Code appears to be ${
            languages.find((l) => l.id === detectedLanguage)?.name || detectedLanguage
          } but ${languages.find((l) => l.id === language)?.name} is selected. Analysis will use detected language for better accuracy.`,
          detectedLanguage: detectedLanguage,
          selectedLanguage: language,
        });
      }

      // Use detected language if not plaintext
      const finalLanguage = detectedLanguage !== "plaintext" ? detectedLanguage : language;

      // Get token safely
      const token = getAuthToken();

      const response = await fetch(API_ENDPOINTS.ANALYZE_CODE, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({
          code,
          language: finalLanguage,
          selectedLanguage: language,
          preferences: {
            strictness: "balanced",
            focusAreas: ["quality", "security", "performance"],
            verbosity: "detailed",
          },
        }),
      });

      // ADD DEBUG LOGGING HERE
      console.log("Response status:", response.status);
      console.log("Response ok:", response.ok);
      
      const result = await response.json();
      
      // ADD MORE DEBUG LOGGING
      console.log("Full API Response:", result);
      console.log("Result success field:", result.success);
      console.log("Result analysis field:", result.analysis);

      // MODIFIED SUCCESS CHECK - try both conditions
      if (!response.ok || (!result.success && !result.analysis)) {
        console.error("API Error - Result:", result);
        throw new Error(result.error?.message || result.message || "Analysis failed");
      }

      // Merge warnings
      if (result.warnings) warningsArray = [...warningsArray, ...result.warnings];
      setWarnings(warningsArray);

      // CORRECTED: Handle the actual backend response structure
      const analysisData = result.data?.analysis || result.analysis || result.data || result;
      
      console.log("Setting analysis data:", analysisData);

      // Set the analysis safely
      setAnalysis({
        ...analysisData,
        detectedLanguage,
        selectedLanguage: language,
        finalLanguage,
      });

      // FIXED: Update user credits if analysis was successful and user state management is available
      if (result.creditsInfo && setUserData && user) {
        // Update the user's credit usage
        const updatedUser = {
          ...user,
          reviewsUsed: result.creditsInfo.used,
          reviewsLimit: result.creditsInfo.limit
        };
        setUserData(updatedUser);
        console.log('Updated user credits:', result.creditsInfo);
      } else if (updateReviewUsage && result.creditsInfo) {
        // Alternative: use the specific update function
        updateReviewUsage(result.creditsInfo);
      }

    } catch (err) {
      console.error("Analysis error:", err);
      setError({
        type: "analysis_error",
        title: "Analysis Failed",
        message: err.message || "Unable to analyze code. Please try again.",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Rest of your component code remains the same...
  const getScoreColor = (score) => {
    if (score >= 9) return 'text-emerald-400';
    if (score >= 7) return 'text-blue-400';
    if (score >= 5) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getGradeBadge = (grade) => {
    const colors = {
      'A+': 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
      'A': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      'B+': 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
      'B': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      'C+': 'bg-orange-500/20 text-orange-400 border-orange-500/30',
      'C': 'bg-red-500/20 text-red-400 border-red-500/30',
      'D': 'bg-red-600/20 text-red-500 border-red-600/30'
    };
    return colors[grade] || colors['C'];
  };

  // Theme-aware classes
  const getThemeClasses = () => {
    if (theme === 'light') {
      return {
        background: 'bg-white text-slate-900',
        cardBg: 'bg-white border-slate-200',
        textPrimary: 'text-slate-900',
        textSecondary: 'text-slate-600',
        textMuted: 'text-slate-500',
        inputBg: 'bg-white border-slate-300 text-slate-900 focus:border-blue-500'
      };
    }
    return {
      background: 'bg-slate-900 text-slate-100',
      cardBg: 'bg-slate-800 border-slate-700',
      textPrimary: 'text-slate-100',
      textSecondary: 'text-slate-300',
      textMuted: 'text-slate-400',
      inputBg: 'bg-slate-800 border-slate-600 text-slate-200 focus:border-blue-400'
    };
  };

  const themeClasses = getThemeClasses();

  return (
    <div className={`min-h-screen ${themeClasses.background}`}>
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className={`text-3xl font-bold mb-2 ${themeClasses.textPrimary}`}>Code Review Dashboard</h1>
              <p className={themeClasses.textMuted}>
                Paste your code below for AI-powered analysis across {languages.length} programming languages
              </p>
            </div>
            {user && (
              <div className="text-right">
                <div className={`text-sm ${themeClasses.textMuted}`}>Reviews Used</div>
                <div className="text-lg font-bold">
                  <span className={user.reviewsUsed >= user.reviewsLimit ? 'text-red-400' : 'text-emerald-400'}>
                    {user.reviewsUsed}
                  </span>
                  <span className={themeClasses.textMuted}>/{user.reviewsLimit}</span>
                </div>
                {user.reviewsUsed >= user.reviewsLimit && (
                  <button 
                    onClick={() => onNavigate('pricing')}
                    className="text-xs text-blue-400 hover:text-blue-300 underline underline-offset-2"
                  >
                    Upgrade to Pro
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Code Input */}
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <label className={`text-sm font-medium ${themeClasses.textSecondary}`}>Language:</label>
                <select 
                  value={language} 
                  onChange={(e) => {
                    setLanguage(e.target.value);
                    setAutoDetectedLang(null);
                    setError(null);
                    setWarnings([]);
                  }}
                  className={`border rounded-lg px-3 py-2 text-sm min-w-[140px] ${themeClasses.inputBg} focus:ring-blue-400/20 focus:ring-2 focus:ring-opacity-20 outline-none transition-colors`}
                >
                  {languages.map(lang => (
                    <option key={lang.id} value={lang.id}>
                      {lang.icon} {lang.name}
                    </option>
                  ))}
                </select>
              </div>
              
              {/* Show detected language hint */}
              {autoDetectedLang && autoDetectedLang !== language && autoDetectedLang !== 'plaintext' && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-blue-400">
                    Detected: {languages.find(l => l.id === autoDetectedLang)?.name}
                  </span>
                  <button
                    onClick={() => setLanguage(autoDetectedLang)}
                    className="text-xs text-blue-400 hover:text-blue-300 underline"
                  >
                    Switch
                  </button>
                </div>
              )}
            </div>

            {/* Enhanced Warnings Display */}
            {warnings.length > 0 && (
              <div className="space-y-2">
                {warnings.map((warning, index) => (
                  <div key={index} className="p-3 border border-yellow-500/30 bg-yellow-500/10 rounded-lg">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-4 h-4 text-yellow-400 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm text-yellow-400">{warning.message}</p>
                        {warning.type === 'language_mismatch' && warning.detectedLanguage && (
                          <button
                            onClick={() => {
                              setLanguage(warning.detectedLanguage);
                              setWarnings([]);
                            }}
                            className="mt-2 text-xs text-blue-400 hover:text-blue-300 underline"
                          >
                            Switch to {languages.find(l => l.id === warning.detectedLanguage)?.name} →
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Code Input Area */}
            <div className={`rounded-xl border shadow-lg ${themeClasses.cardBg}`}>
              <div className={`flex items-center justify-between p-4 border-b ${theme === 'light' ? 'border-slate-200' : 'border-slate-700'}`}>
                <div className="flex items-center gap-2">
                  <span className={`text-sm ${themeClasses.textMuted}`}>Input Code</span>
                  <span className={`text-xs px-2 py-1 rounded-full ${languages.find(l => l.id === language)?.color} ${theme === 'light' ? 'bg-slate-100' : 'bg-slate-700'}`}>
                    {languages.find(l => l.id === language)?.icon} {languages.find(l => l.id === language)?.name}
                  </span>
                  {autoDetectedLang && autoDetectedLang !== language && autoDetectedLang !== 'plaintext' && (
                    <span className="text-xs px-2 py-1 rounded-full bg-blue-500/20 text-blue-400">
                      Auto-detected: {languages.find(l => l.id === autoDetectedLang)?.name}
                    </span>
                  )}
                </div>
                <button
                  onClick={handleAnalyze}
                  disabled={!code.trim() || isAnalyzing || (user && user.reviewsUsed >= user.reviewsLimit)}
                  className="px-4 py-2 bg-gradient-to-r from-blue-500 to-violet-600 hover:from-blue-600 hover:to-violet-700 disabled:from-slate-400 disabled:to-slate-500 disabled:cursor-not-allowed rounded-lg text-sm font-medium transition-all flex items-center gap-2 text-white shadow-lg hover:shadow-xl disabled:shadow-none"
                >
                  {isAnalyzing ? (
                    <>
                      <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Analyze Code
                    </>
                  )}
                </button>
              </div>
              <textarea
                value={code}
                onChange={(e) => {
                  setCode(e.target.value);
                  // Auto-detect language as user types (optional)
                  if (e.target.value.trim()) {
                    const detected = languageDetector.detectLanguage(e.target.value);
                    if (detected !== 'plaintext' && detected !== autoDetectedLang) {
                      setAutoDetectedLang(detected);
                    }
                  }
                }}
                placeholder={`Paste your ${languages.find(l => l.id === language)?.name} code here...`}
                className={`w-full h-96 p-4 bg-transparent resize-none outline-none font-mono text-sm ${themeClasses.textPrimary} ${theme === 'light' ? 'placeholder-slate-400' : 'placeholder-slate-500'} transition-colors`}
              />
            </div>
          </div>

          {/* Analysis Results - Rest of the component remains the same */}
          <div className="space-y-4">
            <h2 className={`text-xl font-semibold ${themeClasses.textPrimary}`}>Analysis Results</h2>
            
            {!analysis && !isAnalyzing && !error && (
              <div className={`rounded-xl p-8 border text-center shadow-lg ${themeClasses.cardBg}`}>
                <Code className={`w-12 h-12 mx-auto mb-4 ${theme === 'light' ? 'text-slate-300' : 'text-slate-600'}`} />
                <p className={`mb-2 font-medium ${themeClasses.textMuted}`}>Paste code and click "Analyze" to get started</p>
                <p className={`text-sm ${themeClasses.textMuted}`}>Supports {languages.length} programming languages with AI-powered insights</p>
              </div>
            )}

            {isAnalyzing && (
              <div className={`rounded-xl p-8 border text-center shadow-lg ${themeClasses.cardBg}`}>
                <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className={`mb-2 font-medium ${themeClasses.textMuted}`}>
                  Analyzing your {languages.find(l => l.id === (autoDetectedLang && autoDetectedLang !== 'plaintext' ? autoDetectedLang : language))?.name} code...
                </p>
                <p className={`text-sm ${themeClasses.textMuted}`}>Using advanced AI analysis with language-specific insights</p>
              </div>
            )}

            {analysis && (
              <div className="space-y-6">
                {/* Show language analysis info */}
                {analysis.detectedLanguage && analysis.detectedLanguage !== analysis.selectedLanguage && analysis.detectedLanguage !== 'plaintext' && (
                  <div className="rounded-lg p-3 bg-blue-500/10 border border-blue-500/30">
                    <div className="flex items-center gap-2 text-sm text-blue-400">
                      <CheckCircle className="w-4 h-4" />
                      <span>
                        Analysis completed using {languages.find(l => l.id === analysis.finalLanguage)?.name} 
                        (auto-detected from your code)
                      </span>
                    </div>
                  </div>
                )}

                {/* Overall Score */}
                <div className={`rounded-xl p-6 border shadow-lg ${themeClasses.cardBg}`}>
                  <div className="flex items-center justify-between mb-4">
                    <span className={`text-lg font-semibold ${themeClasses.textPrimary}`}>Code Quality Score</span>
                    <div className="flex items-center gap-3">
                      <span className={`px-3 py-1 rounded-full text-sm font-bold border ${getGradeBadge(analysis.grade)}`}>
                        {analysis.grade}
                      </span>
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 text-yellow-400 fill-current">★</div>
                        <span className={`text-2xl font-bold ${getScoreColor(analysis.overallScore)}`}>
                          {analysis.overallScore}/10
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {analysis.finalLanguage && (
                    <div className={`flex items-center gap-2 text-sm ${themeClasses.textMuted} mb-4`}>
                      <span className={languages.find(l => l.id === analysis.finalLanguage)?.color}>
                        {languages.find(l => l.id === analysis.finalLanguage)?.icon} {languages.find(l => l.id === analysis.finalLanguage)?.name}
                      </span>
                      {analysis.language?.confidence && (
                        <span>• {Math.round(analysis.language.confidence * 100)}% confidence</span>
                      )}
                    </div>
                  )}

                  <div className={`text-sm ${themeClasses.textMuted} mb-4`}>{analysis.summary}</div>

                  {/* Detailed Metrics */}
                  {analysis.metrics && (
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                      <MetricCard icon={Shield} label="Security" value={analysis.metrics.security} theme={theme} />
                      <MetricCard icon={Zap} label="Performance" value={analysis.metrics.performance} theme={theme} />
                      <MetricCard icon={Wrench} label="Maintainability" value={analysis.metrics.maintainability} theme={theme} />
                      <MetricCard icon={Eye} label="Readability" value={analysis.metrics.readability} theme={theme} />
                      <MetricCard icon={Target} label="Complexity" value={analysis.metrics.complexity} theme={theme} />
                      <MetricCard icon={TrendingUp} label="Testability" value={analysis.metrics.testability} theme={theme} />
                    </div>
                  )}
                </div>

                {/* Code Statistics */}
                {analysis.statistics && (
                  <div className={`rounded-xl p-6 border shadow-lg ${themeClasses.cardBg}`}>
                    <h3 className={`text-lg font-semibold mb-4 ${themeClasses.textPrimary}`}>Code Statistics</h3>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className={`text-center p-3 rounded-lg ${theme === 'light' ? 'bg-slate-100' : 'bg-slate-700/50'}`}>
                        <div className={`text-sm ${themeClasses.textMuted}`}>Lines</div>
                        <div className={`font-bold ${themeClasses.textPrimary}`}>{analysis.statistics.totalLines}</div>
                      </div>
                      <div className={`text-center p-3 rounded-lg ${theme === 'light' ? 'bg-slate-100' : 'bg-slate-700/50'}`}>
                        <div className={`text-sm ${themeClasses.textMuted}`}>Functions</div>
                        <div className={`font-bold ${themeClasses.textPrimary}`}>{analysis.statistics.functions}</div>
                      </div>
                      <div className={`text-center p-3 rounded-lg ${theme === 'light' ? 'bg-slate-100' : 'bg-slate-700/50'}`}>
                        <div className={`text-sm ${themeClasses.textMuted}`}>Comments</div>
                        <div className={`font-bold ${themeClasses.textPrimary}`}>{analysis.statistics.commentLines}</div>
                      </div>
                      <div className={`text-center p-3 rounded-lg ${theme === 'light' ? 'bg-slate-100' : 'bg-slate-700/50'}`}>
                        <div className={`text-sm ${themeClasses.textMuted}`}>Complexity</div>
                        <div className={`font-bold ${
                          analysis.statistics.complexity?.overall > 20 ? 'text-red-400' :
                          analysis.statistics.complexity?.overall > 10 ? 'text-yellow-400' : 'text-emerald-400'
                        }`}>
                          {analysis.statistics.complexity?.overall || 'N/A'}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Issues */}
                {analysis.issues && analysis.issues.length > 0 && (
                  <div className={`rounded-xl p-6 border shadow-lg ${themeClasses.cardBg}`}>
                    <h3 className={`text-lg font-semibold mb-4 ${themeClasses.textPrimary}`}>Issues Found</h3>
                    <div className="space-y-3 max-h-64 overflow-y-auto">
                      {analysis.issues.map((issue, index) => (
                        <div key={index} className={`flex items-start gap-3 p-3 rounded-lg ${theme === 'light' ? 'bg-slate-100' : 'bg-slate-700/30'}`}>
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                            issue.severity === 'critical' ? 'bg-red-500/20' :
                            issue.severity === 'high' ? 'bg-orange-500/20' :
                            issue.severity === 'medium' ? 'bg-yellow-500/20' : 'bg-blue-500/20'
                          }`}>
                            <span className={`text-xs font-bold ${
                              issue.severity === 'critical' ? 'text-red-400' :
                              issue.severity === 'high' ? 'text-orange-400' :
                              issue.severity === 'medium' ? 'text-yellow-400' : 'text-blue-400'
                            }`}>
                              {issue.severity === 'critical' ? '!' : 
                               issue.severity === 'high' ? '⚠' : 
                               issue.severity === 'medium' ? '●' : 'ℹ'}
                            </span>
                          </div>
                          <div>
                            <div className={`font-medium text-sm ${
                              issue.severity === 'critical' ? 'text-red-400' :
                              issue.severity === 'high' ? 'text-orange-400' :
                              issue.severity === 'medium' ? 'text-yellow-400' : 'text-blue-400'
                            }`}>
                              {issue.title}
                            </div>
                            <div className={`text-sm ${themeClasses.textMuted}`}>{issue.description}</div>
                            {issue.suggestion && (
                              <div className={`text-xs ${themeClasses.textMuted} mt-1`}>💡 {issue.suggestion}</div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Suggestions */}
                {analysis.suggestions && analysis.suggestions.length > 0 && (
                  <div className={`rounded-xl p-6 border shadow-lg ${themeClasses.cardBg}`}>
                    <h3 className={`text-lg font-semibold mb-4 ${themeClasses.textPrimary}`}>Recommendations</h3>
                    <ul className="space-y-2">
                      {analysis.suggestions.map((suggestion, index) => (
                        <li key={index} className={`flex items-center gap-2 text-sm ${themeClasses.textMuted}`}>
                          <div className="w-1.5 h-1.5 bg-blue-400 rounded-full"></div>
                          {suggestion}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Code Smells */}
                {analysis.codeSmells && analysis.codeSmells.length > 0 && (
                  <div className={`rounded-xl p-6 border shadow-lg ${themeClasses.cardBg}`}>
                    <h3 className={`text-lg font-semibold mb-4 ${themeClasses.textPrimary}`}>Code Smells Detected</h3>
                    <div className="space-y-2">
                      {analysis.codeSmells.map((smell, index) => (
                        <div key={index} className="flex items-center gap-2 text-sm text-orange-400">
                          <AlertTriangle className="w-4 h-4" />
                          {smell}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Processing Metadata */}
                {analysis.metadata && (
                  <div className={`rounded-xl p-4 border shadow-lg ${themeClasses.cardBg}`}>
                    <div className={`flex items-center justify-between text-sm ${themeClasses.textMuted}`}>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {analysis.metadata.processingTime}
                        </div>
                        <div className="flex items-center gap-1">
                          <FileText className="w-4 h-4" />
                          v{analysis.metadata.version}
                        </div>
                      </div>
                      <div>ID: {analysis.metadata.analysisId?.slice(-8)}</div>
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {/* General Error */}
            {error && (
              <div className="rounded-xl p-6 border shadow-lg bg-red-500/10 border-red-500/30">
                <div className="flex items-start gap-3">
                  <XCircle className="w-5 h-5 text-red-400 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-red-400">{error.title}</h4>
                    <p className="text-sm text-slate-300 mt-1">{error.message}</p>
                    <button
                      onClick={() => setError(null)}
                      className="mt-2 text-sm text-blue-400 hover:text-blue-300 underline underline-offset-2"
                    >
                      Try Again
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Enhanced Metric Card Component with theme support
const MetricCard = ({ icon: Icon, label, value, theme = 'dark' }) => {
  const bgClass = theme === 'light' ? 'bg-slate-100' : 'bg-slate-700/30';
  const textClass = theme === 'light' ? 'text-slate-500' : 'text-slate-400';
  
  return (
    <div className={`text-center p-3 rounded-lg ${bgClass}`}>
      <div className="flex items-center justify-center gap-2 mb-1">
        <Icon className={`w-4 h-4 ${textClass}`} />
        <div className={`text-xs ${textClass}`}>{label}</div>
      </div>
      <div className={`font-bold ${
        value >= 8 ? 'text-emerald-400' :
        value >= 6 ? 'text-yellow-400' : 'text-red-400'
      }`}>
        {value}/10
      </div>
    </div>
  );
};

export default Dashboard;