import React, { useState } from 'react';
import { Sparkles, ArrowRight, CheckCircle } from 'lucide-react';
import { useTheme } from './ThemeProvider';

// Enhanced Welcome Modal for New Users - IMPROVED COLORS
function WelcomeModal({ user, isOpen, onClose, onComplete }) {
  const [step, setStep] = useState(1);
  const [preferences, setPreferences] = useState({
    favoriteLanguages: [],
    experience: '',
    notifications: true,
    goals: []
  });
  const { isDark } = useTheme();

  const languages = [
    { id: 'javascript', name: 'JavaScript', icon: '🟨' },
    { id: 'python', name: 'Python', icon: '🐍' },
    { id: 'java', name: 'Java', icon: '☕' },
    { id: 'typescript', name: 'TypeScript', icon: '🔘' },
    { id: 'cpp', name: 'C++', icon: '⚡' },
    { id: 'go', name: 'Go', icon: '🐹' }
  ];

  const goals = [
    { id: 'improve', name: 'Improve Code Quality', icon: '📈' },
    { id: 'learn', name: 'Learn Best Practices', icon: '📚' },
    { id: 'security', name: 'Security Review', icon: '🔒' },
    { id: 'performance', name: 'Performance Optimization', icon: '⚡' }
  ];

  const handleLanguageToggle = (langId) => {
    setPreferences(prev => ({
      ...prev,
      favoriteLanguages: prev.favoriteLanguages.includes(langId)
        ? prev.favoriteLanguages.filter(id => id !== langId)
        : [...prev.favoriteLanguages, langId]
    }));
  };

  const handleGoalToggle = (goalId) => {
    setPreferences(prev => ({
      ...prev,
      goals: prev.goals.includes(goalId)
        ? prev.goals.filter(id => id !== goalId)
        : [...prev.goals, goalId]
    }));
  };

  const handleComplete = () => {
    onComplete(preferences);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className={`w-full max-w-lg rounded-2xl p-8 shadow-2xl border ${
        isDark 
          ? 'bg-slate-800 border-slate-600 shadow-black/50' 
          : 'bg-white border-slate-200 shadow-slate-900/10'
      }`}>
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 via-violet-500 to-teal-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h2 className={`text-2xl font-bold mb-3 ${
            isDark ? 'text-slate-100' : 'text-slate-800'
          }`}>
            Welcome to CodeLens, {user?.name?.split(' ')[0]}! 🎉
          </h2>
          <p className={`${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            Let's personalize your experience in just a few steps
          </p>
        </div>

        {step === 1 && (
          <div className="space-y-6">
            <h3 className={`text-lg font-semibold ${
              isDark ? 'text-slate-200' : 'text-slate-800'
            }`}>
              Which languages do you work with?
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {languages.map(lang => (
                <button
                  key={lang.id}
                  onClick={() => handleLanguageToggle(lang.id)}
                  className={`p-4 rounded-xl border-2 transition-all duration-200 ${
                    preferences.favoriteLanguages.includes(lang.id)
                      ? 'border-blue-500 bg-blue-500/10 shadow-lg transform scale-105'
                      : isDark 
                        ? 'border-slate-600 bg-slate-700/50 hover:border-slate-500 hover:bg-slate-700'
                        : 'border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  <div className="text-2xl mb-2">{lang.icon}</div>
                  <div className={`text-sm font-medium ${
                    isDark ? 'text-slate-200' : 'text-slate-700'
                  }`}>
                    {lang.name}
                  </div>
                </button>
              ))}
            </div>
            <div className="flex justify-between items-center pt-4">
              <div className={`text-sm ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                Step 1 of 3
              </div>
              <button
                onClick={() => setStep(2)}
                disabled={preferences.favoriteLanguages.length === 0}
                className="px-6 py-3 bg-gradient-to-r from-blue-500 to-violet-600 hover:from-blue-600 hover:to-violet-700 disabled:from-slate-400 disabled:to-slate-500 disabled:cursor-not-allowed rounded-xl text-white font-medium transition-all duration-200 shadow-lg hover:shadow-xl disabled:shadow-none"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <h3 className={`text-lg font-semibold ${
              isDark ? 'text-slate-200' : 'text-slate-800'
            }`}>
              What are your main goals?
            </h3>
            <div className="space-y-3">
              {goals.map(goal => (
                <button
                  key={goal.id}
                  onClick={() => handleGoalToggle(goal.id)}
                  className={`w-full p-4 rounded-xl border-2 transition-all duration-200 text-left ${
                    preferences.goals.includes(goal.id)
                      ? 'border-blue-500 bg-blue-500/10 shadow-lg'
                      : isDark 
                        ? 'border-slate-600 bg-slate-700/50 hover:border-slate-500 hover:bg-slate-700'
                        : 'border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{goal.icon}</span>
                    <span className={`font-medium ${
                      isDark ? 'text-slate-200' : 'text-slate-700'
                    }`}>
                      {goal.name}
                    </span>
                  </div>
                </button>
              ))}
            </div>
            <div className="flex justify-between items-center pt-4">
              <button
                onClick={() => setStep(1)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  isDark 
                    ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-700'
                    : 'text-slate-600 hover:text-slate-800 hover:bg-slate-100'
                }`}
              >
                Back
              </button>
              <button
                onClick={() => setStep(3)}
                disabled={preferences.goals.length === 0}
                className="px-6 py-3 bg-gradient-to-r from-blue-500 to-violet-600 hover:from-blue-600 hover:to-violet-700 disabled:from-slate-400 disabled:to-slate-500 disabled:cursor-not-allowed rounded-xl text-white font-medium transition-all duration-200 shadow-lg hover:shadow-xl disabled:shadow-none"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <h3 className={`text-lg font-semibold ${
              isDark ? 'text-slate-200' : 'text-slate-800'
            }`}>
              Almost done! 🚀
            </h3>
            <div className={`p-4 rounded-xl ${
              isDark ? 'bg-slate-700/50' : 'bg-slate-100'
            }`}>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className={`text-sm ${
                    isDark ? 'text-slate-400' : 'text-slate-600'
                  }`}>Languages</span>
                  <span className={`text-sm font-medium ${
                    isDark ? 'text-slate-200' : 'text-slate-800'
                  }`}>
                    {preferences.favoriteLanguages.length} selected
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className={`text-sm ${
                    isDark ? 'text-slate-400' : 'text-slate-600'
                  }`}>Goals</span>
                  <span className={`text-sm font-medium ${
                    isDark ? 'text-slate-200' : 'text-slate-800'
                  }`}>
                    {preferences.goals.length} selected
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-500/15 border border-emerald-500/30">
              <CheckCircle className="w-5 h-5 text-emerald-500" />
              <span className={`text-sm font-medium ${
                isDark ? 'text-emerald-400' : 'text-emerald-700'
              }`}>
                You get 10 free reviews to start!
              </span>
            </div>
            <div className="flex justify-between items-center pt-4">
              <button
                onClick={() => setStep(2)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  isDark 
                    ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-700'
                    : 'text-slate-600 hover:text-slate-800 hover:bg-slate-100'
                }`}
              >
                Back
              </button>
              <button
                onClick={handleComplete}
                className="px-8 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl text-white font-semibold hover:from-emerald-600 hover:to-teal-700 transition-all duration-200 flex items-center gap-2 shadow-lg hover:shadow-xl"
              >
                Get Started
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default WelcomeModal;