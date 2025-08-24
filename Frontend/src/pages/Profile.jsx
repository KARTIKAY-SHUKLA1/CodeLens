import React, { useState } from 'react';
import { User } from 'lucide-react';
import { useTheme } from '../components/ThemeProvider';

// Enhanced Profile Component with Improved Colors
function Profile({ user }) {
  const [activeTab, setActiveTab] = useState('overview');
  const { isDark } = useTheme();
  
  const reviews = [
    { id: 1, language: 'JavaScript', score: 8.5, date: '2025-01-10', lines: 45 },
    { id: 2, language: 'Python', score: 9.2, date: '2025-01-09', lines: 67 },
    { id: 3, language: 'Java', score: 7.8, date: '2025-01-08', lines: 123 },
  ];

  return (
    <div className={`min-h-screen p-6 ${
      isDark ? 'bg-slate-900 text-slate-100' : 'bg-slate-50 text-slate-800'
    }`}>
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className={`text-3xl font-bold mb-2 ${
            isDark ? 'text-slate-100' : 'text-slate-800'
          }`}>User Profile</h1>
          <p className={isDark ? 'text-slate-400' : 'text-slate-600'}>
            Manage your account and review history
          </p>
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
                  <div className="text-2xl font-bold text-blue-400">{user.reviewsUsed}</div>
                  <div className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    Reviews Used
                  </div>
                </div>
                <div className="text-center p-3 rounded-lg bg-slate-500/10">
                  <div className="text-2xl font-bold text-emerald-400">
                    {user.reviewsLimit - user.reviewsUsed}
                  </div>
                  <div className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    Remaining
                  </div>
                </div>
                <div className="text-center p-3 rounded-lg bg-slate-500/10">
                  <div className="text-2xl font-bold text-violet-400">8.3</div>
                  <div className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    Avg Score
                  </div>
                </div>
                <div className="text-center p-3 rounded-lg bg-slate-500/10">
                  <div className="text-2xl font-bold text-yellow-400 capitalize">{user.plan}</div>
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
                <div className={`rounded-xl p-6 border shadow-lg ${
                  isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
                }`}>
                  <h3 className={`text-lg font-semibold mb-4 ${
                    isDark ? 'text-slate-200' : 'text-slate-800'
                  }`}>Recent Activity</h3>
                  <div className="space-y-3">
                    {reviews.slice(0, 3).map(review => (
                      <div key={review.id} className={`flex items-center justify-between p-3 rounded-lg transition-colors ${
                        isDark ? 'bg-slate-700/50 hover:bg-slate-700' : 'bg-slate-100 hover:bg-slate-200'
                      }`}>
                        <div className="flex items-center gap-3">
                          <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                          <span className={`text-sm ${
                            isDark ? 'text-slate-300' : 'text-slate-700'
                          }`}>{review.language} code reviewed</span>
                          <span className={`text-xs ${
                            isDark ? 'text-slate-500' : 'text-slate-600'
                          }`}>{review.lines} lines</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-emerald-400">{review.score}/10</span>
                          <span className={`text-xs ${
                            isDark ? 'text-slate-500' : 'text-slate-600'
                          }`}>{review.date}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'history' && (
              <div className={`rounded-xl p-6 border shadow-lg ${
                isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
              }`}>
                <h3 className={`text-lg font-semibold mb-4 ${
                  isDark ? 'text-slate-200' : 'text-slate-800'
                }`}>All Reviews</h3>
                <div className="space-y-3">
                  {reviews.map(review => (
                    <div key={review.id} className={`flex items-center justify-between p-4 rounded-lg transition-colors cursor-pointer ${
                      isDark ? 'bg-slate-700/50 hover:bg-slate-700 border border-slate-600' : 'bg-slate-50 hover:bg-slate-100 border border-slate-200'
                    }`}>
                      <div>
                        <div className={`font-medium ${
                          isDark ? 'text-slate-200' : 'text-slate-800'
                        }`}>{review.language} Review</div>
                        <div className={`text-sm ${
                          isDark ? 'text-slate-400' : 'text-slate-600'
                        }`}>{review.lines} lines • {review.date}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-emerald-400">{review.score}/10</div>
                        <div className={`text-xs ${
                          isDark ? 'text-slate-500' : 'text-slate-600'
                        }`}>Quality Score</div>
                      </div>
                    </div>
                  ))}
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