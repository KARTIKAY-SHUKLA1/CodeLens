import React, { useState, useEffect } from 'react';
import { User, Clock, Code, TrendingUp, Calendar, Star, RefreshCw, AlertCircle } from 'lucide-react';
import { useTheme } from '../components/ThemeProvider';
import { apiCall, API_ENDPOINTS } from '../config/api';

// Fixed Profile Component with Real Database Integration
function Profile({ user }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statistics, setStatistics] = useState({
    totalReviews: 0,
    averageScore: 0,
    topLanguages: [],
    creditsRemaining: 0,
    completedReviews: 0,
    monthlyTrend: {}
  });
  const { isDark } = useTheme();

  // Fetch real review history from backend
  useEffect(() => {
    if (user?.id) {
      fetchReviewHistory();
      fetchUserStatistics();
    }
  }, [user]);

  const fetchReviewHistory = async () => {
  try {
    setLoading(true);
    setError(null);

    const response = await apiCall('/api/users/history', 'GET');

    console.log("📡 Reviews response:", response);
if (response && response.success && Array.isArray(response.reviews)) {
  const formattedReviews = response.reviews.map(review => ({
    id: review.id,
    language: review.language || "Unknown",
    score: review.overall_score || 0,
    date: new Date(review.created_at).toLocaleDateString(),
    fullDate: review.created_at,
    lines: review.lines || 0,
    title: review.title || review.file_name || `${review.language || "Code"} Review`,
    fileName: review.file_name || "",
    status: review.status || "completed",
    issuesCount: review.issues_count || 0,
    suggestionsCount: review.suggestions_count || 0,
    tags: review.tags || []
  }));


      setReviews(formattedReviews);
      console.log(`✅ Loaded ${formattedReviews.length} reviews`);
    } else {
      setReviews([]);
    }
  } catch (err) {
    console.error("❌ Error fetching review history:", err);
    setError("Unable to load review history. Please try again.");
    setReviews([]);
  } finally {
    setLoading(false);
  }
};
const fetchUserStatistics = async () => {
  try {
    console.log("📡 Fetching user stats + history from backend...");

    // ✅ Real API call
    const response = await apiCall('/api/users/dashboard', 'GET');

    if (response.success) {
  const reviewData = response.dashboard?.recentReviews || [];
  const summary = response.dashboard?.summary || {};

  // Top languages (based on recent reviews)
  const langCount = {};
  reviewData.forEach((r) => {
    if (r.language) {
      langCount[r.language] = (langCount[r.language] || 0) + 1;
    }
  });
  const topLanguages = Object.entries(langCount)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([language, count]) => ({ language, count }));

  setStatistics({
    totalReviews: summary.totalReviews || reviewData.length,
    averageScore: summary.averageScore || 0,
    completedReviews: summary.totalReviews || reviewData.length,
    topLanguages,
    creditsRemaining: summary.creditsLimit - summary.creditsUsed || 0,
    languagesReviewed: Object.keys(langCount).length,
    languageDistribution: langCount,
  });

    console.log("✅ Statistics updated:", {
  totalReviews: summary.totalReviews,
  averageScore: summary.averageScore,
  topLanguages
});
    } else {
      console.error("❌ Failed to fetch stats:", response.message);
    }
  } catch (err) {
    console.error("❌ Error fetching statistics:", err);
  }
};


  const getScoreColor = (score) => {
    if (score >= 8) return 'text-green-400';
    if (score >= 6) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getLanguageColor = (language) => {
    const colors = {
      'JavaScript': 'bg-yellow-500',
      'Python': 'bg-blue-500',
      'Java': 'bg-orange-500',
      'TypeScript': 'bg-blue-600',
      'React': 'bg-cyan-500',
      'Node.js': 'bg-green-600',
      'C++': 'bg-purple-600',
      'Go': 'bg-teal-500',
      'C#': 'bg-purple-500',
      'PHP': 'bg-indigo-500',
      'Ruby': 'bg-red-500',
      'Swift': 'bg-orange-400'
    };
    return colors[language] || 'bg-gray-500';
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      'completed': { color: 'bg-green-100 text-green-800', text: 'Completed' },
      'pending': { color: 'bg-yellow-100 text-yellow-800', text: 'Analyzing...' },
      'error': { color: 'bg-red-100 text-red-800', text: 'Failed' }
    };
    
    const config = statusConfig[status] || statusConfig.completed;
    return (
      <span className={`px-2 py-1 text-xs rounded-full ${config.color}`}>
        {config.text}
      </span>
    );
  };

  const refreshData = () => {
    if (user?.id) {
      fetchReviewHistory();
      fetchUserStatistics();
    }
  };

  return (
    <div className={`min-h-screen p-6 ${
      isDark ? 'bg-slate-900 text-slate-100' : 'bg-slate-50 text-slate-800'
    }`}>
      <div className="max-w-4xl mx-auto">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className={`text-3xl font-bold mb-2 ${
              isDark ? 'text-slate-100' : 'text-slate-800'
            }`}>User Profile</h1>
            <p className={isDark ? 'text-slate-400' : 'text-slate-600'}>
              Manage your account and review history
            </p>
          </div>
          <button
            onClick={refreshData}
            disabled={loading}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
              isDark 
                ? 'bg-slate-700 hover:bg-slate-600 text-slate-300' 
                : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
            } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {user ? (
          <>
            {/* Profile Header */}
            <div className={`rounded-xl p-6 border mb-8 shadow-lg ${
              isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
            }`}>
              <div className="flex items-center gap-4 mb-6">
                <img 
                  src={user.avatar} 
                  alt={user.name}
                  className="w-20 h-20 rounded-full border-4 border-blue-400 shadow-lg"
                />
                <div>
                  <h2 className={`text-2xl font-bold ${
                    isDark ? 'text-slate-100' : 'text-slate-800'
                  }`}>{user.name}</h2>
                  <p className={isDark ? 'text-slate-400' : 'text-slate-600'}>{user.email}</p>
                  <p className="text-sm text-blue-400 font-medium">@{user.githubUsername}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-3 rounded-lg bg-slate-500/10">
                  <div className="text-2xl font-bold text-blue-400">{user.reviewsUsed || 0}</div>
                  <div className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    Reviews Used
                  </div>
                </div>
                <div className="text-center p-3 rounded-lg bg-slate-500/10">
                  <div className="text-2xl font-bold text-emerald-400">
                    {statistics.creditsRemaining}
                  </div>
                  <div className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    Remaining
                  </div>
                </div>
                <div className="text-center p-3 rounded-lg bg-slate-500/10">
                  <div className="text-2xl font-bold text-violet-400">{statistics.averageScore}</div>
                  <div className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    Avg Score
                  </div>
                </div>
                <div className="text-center p-3 rounded-lg bg-slate-500/10">
                  <div className="text-2xl font-bold text-yellow-400 capitalize">{user.plan || 'free'}</div>
                  <div className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    Plan
                  </div>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className={`flex gap-1 mb-6 p-1 rounded-xl ${
              isDark ? 'bg-slate-800' : 'bg-slate-200'
            }`}>
              {[
                { id: 'overview', label: 'Overview' },
                { id: 'history', label: 'Review History' },
                { id: 'analytics', label: 'Analytics' },
                { id: 'settings', label: 'Settings' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-2 rounded-lg transition-all font-medium ${
                    activeTab === tab.id 
                      ? 'bg-gradient-to-r from-blue-500 to-violet-500 text-white shadow-lg' 
                      : isDark
                        ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-700'
                        : 'text-slate-600 hover:text-slate-800 hover:bg-slate-300'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Recent Activity */}
                <div className={`rounded-xl p-6 border shadow-lg ${
                  isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
                }`}>
                  <h3 className={`text-lg font-semibold mb-4 flex items-center gap-2 ${
                    isDark ? 'text-slate-200' : 'text-slate-800'
                  }`}>
                    <Clock className="w-5 h-5" />
                    Recent Activity ({reviews.length} total reviews)
                  </h3>
                  
                  {loading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
                      <span className="ml-3 text-slate-500">Loading reviews...</span>
                    </div>
                  ) : error ? (
                    <div className="text-center py-8">
                      <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-400" />
                      <p className="text-red-400 mb-2">{error}</p>
                      <button 
                        onClick={refreshData}
                        className="px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg text-white text-sm transition-colors"
                      >
                        Retry
                      </button>
                    </div>
                  ) : reviews.length === 0 ? (
                    <div className="text-center py-8">
                      <Code className={`w-12 h-12 mx-auto mb-4 ${
                        isDark ? 'text-slate-600' : 'text-slate-400'
                      }`} />
                      <p className={`mb-4 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                        No reviews yet. Start by analyzing some code!
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {reviews.slice(0, 5).map(review => (
                        <div key={review.id} className={`flex items-center justify-between p-3 rounded-lg transition-colors ${
                          isDark ? 'bg-slate-700/50 hover:bg-slate-700' : 'bg-slate-100 hover:bg-slate-200'
                        }`}>
                          <div className="flex items-center gap-3">
                            <div className={`w-3 h-3 rounded-full ${getLanguageColor(review.language)}`}></div>
                            <div>
                              <div className={`text-sm font-medium flex items-center gap-2 ${
                                isDark ? 'text-slate-300' : 'text-slate-700'
                              }`}>
                                {review.title}
                                {getStatusBadge(review.status)}
                              </div>
                              <div className={`text-xs flex items-center gap-2 ${
                                isDark ? 'text-slate-500' : 'text-slate-600'
                              }`}>
                                <span>{review.language}</span>
                                <span>•</span>
                                <span>{review.lines} lines</span>
                                {review.fileName && (
                                  <>
                                    <span>•</span>
                                    <span>{review.fileName}</span>
                                  </>
                                )}
                                {review.issuesCount > 0 && (
                                  <>
                                    <span>•</span>
                                    <span className="text-yellow-400">{review.issuesCount} issues</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {review.status === 'completed' && (
                              <span className={`text-sm font-bold ${getScoreColor(review.score)}`}>
                                {review.score}/10
                              </span>
                            )}
                            <span className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-600'}`}>
                              {review.date}
                            </span>
                            {review.isFavorite && <Star className="w-3 h-3 text-yellow-400 fill-current" />}
                            {review.isPublic && <span className="text-xs text-blue-400">Public</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className={`rounded-xl p-6 border shadow-lg ${
                    isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
                  }`}>
                    <h3 className={`text-lg font-semibold mb-4 flex items-center gap-2 ${
                      isDark ? 'text-slate-200' : 'text-slate-800'
                    }`}>
                      <TrendingUp className="w-5 h-5" />
                      Top Languages
                    </h3>
                    {statistics.topLanguages.length > 0 ? (
                      <div className="space-y-2">
                        {statistics.topLanguages.map(({ language, count }) => (
                          <div key={language} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className={`w-3 h-3 rounded-full ${getLanguageColor(language)}`}></div>
                              <span className={`text-sm ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                                {language}
                              </span>
                            </div>
                            <span className={`text-sm font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                              {count} review{count > 1 ? 's' : ''}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                        No language data yet
                      </p>
                    )}
                  </div>

                  <div className={`rounded-xl p-6 border shadow-lg ${
                    isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
                  }`}>
                    <h3 className={`text-lg font-semibold mb-4 ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                      Review Summary
                    </h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className={isDark ? 'text-slate-400' : 'text-slate-600'}>Total Reviews:</span>
                        <span className={`font-medium ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                          {statistics.totalReviews}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className={isDark ? 'text-slate-400' : 'text-slate-600'}>Completed:</span>
                        <span className={`font-medium ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                          {statistics.completedReviews}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className={isDark ? 'text-slate-400' : 'text-slate-600'}>Average Score:</span>
                        <span className={`font-medium ${getScoreColor(statistics.averageScore)}`}>
                          {statistics.averageScore}/10
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'history' && (
              <div className={`rounded-xl p-6 border shadow-lg ${
                isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
              }`}>
                <div className="flex justify-between items-center mb-4">
                  <h3 className={`text-lg font-semibold flex items-center gap-2 ${
                    isDark ? 'text-slate-200' : 'text-slate-800'
                  }`}>
                    <Calendar className="w-5 h-5" />
                    All Reviews ({reviews.length})
                  </h3>
                  <button
                    onClick={refreshData}
                    disabled={loading}
                    className={`px-3 py-1 rounded text-sm transition-colors ${
                      isDark 
                        ? 'bg-slate-700 hover:bg-slate-600 text-slate-300' 
                        : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                    } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {loading ? 'Loading...' : 'Refresh'}
                  </button>
                </div>
                
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
                    <span className="ml-3 text-slate-500">Loading your review history...</span>
                  </div>
                ) : error ? (
                  <div className="text-center py-8">
                    <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-400" />
                    <p className="text-red-400 mb-2">{error}</p>
                    <button 
                      onClick={refreshData}
                      className="px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg text-white text-sm transition-colors"
                    >
                      Retry
                    </button>
                  </div>
                ) : reviews.length === 0 ? (
                  <div className="text-center py-8">
                    <Code className={`w-12 h-12 mx-auto mb-4 ${
                      isDark ? 'text-slate-600' : 'text-slate-400'
                    }`} />
                    <p className={`mb-4 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                      No reviews found. Start analyzing your code to see history here.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {reviews.map(review => (
                      <div key={review.id} className={`flex items-center justify-between p-4 rounded-lg transition-colors cursor-pointer group ${
                        isDark ? 'bg-slate-700/50 hover:bg-slate-700 border border-slate-600' : 'bg-slate-50 hover:bg-slate-100 border border-slate-200'
                      }`}>
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <div className={`w-3 h-3 rounded-full ${getLanguageColor(review.language)}`}></div>
                            <div className={`font-medium ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                              {review.title}
                            </div>
                            {getStatusBadge(review.status)}
                            {review.isFavorite && <Star className="w-4 h-4 text-yellow-400 fill-current" />}
                            {review.isPublic && <span className="text-xs text-blue-400 bg-blue-400/10 px-2 py-1 rounded">Public</span>}
                          </div>
                          <div className={`text-sm flex items-center gap-4 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                            <span>{review.language}</span>
                            <span>{review.lines} lines</span>
                            <span>{review.date}</span>
                            {review.fileName && <span>{review.fileName}</span>}
                            {review.issuesCount > 0 && (
                              <span className="text-yellow-400">{review.issuesCount} issues</span>
                            )}
                            {review.suggestionsCount > 0 && (
                              <span className="text-blue-400">{review.suggestionsCount} suggestions</span>
                            )}
                          </div>
                          {review.tags.length > 0 && (
                            <div className="flex gap-1 mt-2">
                              {review.tags.slice(0, 3).map((tag, index) => (
                                <span key={index} className={`px-2 py-1 text-xs rounded-full ${
                                  isDark ? 'bg-slate-600 text-slate-300' : 'bg-slate-200 text-slate-700'
                                }`}>
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="text-right ml-4">
                          {review.status === 'completed' ? (
                            <div className={`text-lg font-bold ${getScoreColor(review.score)}`}>
                              {review.score}/10
                            </div>
                          ) : (
                            <div className={`text-sm ${isDark ? 'text-slate-500' : 'text-slate-600'}`}>
                              {review.status === 'pending' ? 'Analyzing...' : 'Failed'}
                            </div>
                          )}
                          <div className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-600'}`}>
                            Quality Score
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'analytics' && (
              <div className="space-y-6">
                <div className={`rounded-xl p-6 border shadow-lg ${
                  isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
                }`}>
                  <h3 className={`text-lg font-semibold mb-4 ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                    Your Coding Analytics
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="text-center p-4 rounded-lg bg-blue-500/10">
                      <div className="text-2xl font-bold text-blue-400">{statistics.totalReviews}</div>
                      <div className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Total Reviews</div>
                    </div>
                    <div className="text-center p-4 rounded-lg bg-green-500/10">
                      <div className="text-2xl font-bold text-green-400">{statistics.completedReviews}</div>
                      <div className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Completed</div>
                    </div>
                    <div className="text-center p-4 rounded-lg bg-purple-500/10">
                      <div className="text-2xl font-bold text-purple-400">{statistics.averageScore}</div>
                      <div className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Avg Score</div>
                    </div>
                    <div className="text-center p-4 rounded-lg bg-yellow-500/10">
                      <div className="text-2xl font-bold text-yellow-400">{statistics.topLanguages.length}</div>
                      <div className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Languages Used</div>
                    </div>
                  </div>

                  {/* Language breakdown */}
                  {statistics.topLanguages.length > 0 && (
                    <div className="mt-6">
                      <h4 className={`font-medium mb-3 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                        Language Distribution
                      </h4>
                      <div className="space-y-2">
                        {statistics.topLanguages.map(({ language, count }) => {
                          const percentage = ((count / statistics.totalReviews) * 100).toFixed(1);
                          return (
                            <div key={language} className="flex items-center gap-3">
                              <div className={`w-3 h-3 rounded-full ${getLanguageColor(language)}`}></div>
                              <div className="flex-1 flex justify-between items-center">
                                <span className={`text-sm ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                                  {language}
                                </span>
                                <div className="flex items-center gap-2">
                                  <div className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                                    {count} reviews ({percentage}%)
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'settings' && (
              <div className="space-y-6">
                <div className={`rounded-xl p-6 border shadow-lg ${
                  isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
                }`}>
                  <h3 className={`text-lg font-semibold mb-4 ${
                    isDark ? 'text-slate-200' : 'text-slate-800'
                  }`}>Account Settings</h3>
                  <div className="space-y-4">
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${
                        isDark ? 'text-slate-300' : 'text-slate-700'
                      }`}>Display Name</label>
                      <input 
                        type="text" 
                        defaultValue={user.name}
                        className={`w-full p-3 border rounded-lg outline-none transition-colors ${
                          isDark 
                            ? 'bg-slate-700 border-slate-600 focus:border-blue-400 text-slate-200' 
                            : 'bg-white border-slate-300 focus:border-blue-500 text-slate-800'
                        } focus:ring-2 focus:ring-blue-400/20`}
                      />
                    </div>
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${
                        isDark ? 'text-slate-300' : 'text-slate-700'
                      }`}>Email</label>
                      <input 
                        type="email" 
                        defaultValue={user.email}
                        className={`w-full p-3 border rounded-lg outline-none transition-colors ${
                          isDark 
                            ? 'bg-slate-700 border-slate-600 focus:border-blue-400 text-slate-200' 
                            : 'bg-white border-slate-300 focus:border-blue-500 text-slate-800'
                        } focus:ring-2 focus:ring-blue-400/20`}
                      />
                    </div>
                    <button className="px-6 py-3 bg-gradient-to-r from-blue-500 to-violet-600 hover:from-blue-600 hover:to-violet-700 rounded-lg transition-all text-white font-medium shadow-lg hover:shadow-xl">
                      Save Changes
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className={`rounded-xl p-8 border text-center shadow-lg ${
            isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
          }`}>
            <User className={`w-12 h-12 mx-auto mb-4 ${
              isDark ? 'text-slate-600' : 'text-slate-400'
            }`} />
            <p className={`mb-4 ${
              isDark ? 'text-slate-400' : 'text-slate-600'
            }`}>Please sign in to view your profile</p>
            <button className="px-6 py-3 bg-gradient-to-r from-blue-500 to-violet-600 hover:from-blue-600 hover:to-violet-700 rounded-lg transition-all text-white font-medium shadow-lg hover:shadow-xl">
              Sign In
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default Profile;