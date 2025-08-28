// Navigation.jsx - FIXED VERSION
import React from 'react';
import { Menu, X, Home, MessageSquare, User, Settings, CreditCard, LogOut, Sun, Moon, Code, Github } from 'lucide-react';
import { useTheme } from './ThemeProvider';
import { API_ENDPOINTS } from '../config/api'; // ADD THIS IMPORT

// Enhanced Navigation with Improved Colors
function Navigation({ currentPage, onNavigate, isMobileMenuOpen, setIsMobileMenuOpen, user, signOut }) {
  const { isDark, toggleTheme } = useTheme();
  
  const navItems = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'dashboard', label: 'Dashboard', icon: MessageSquare },
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'pricing', label: 'Pricing', icon: CreditCard },
  ];

  // FIXED: GitHub OAuth Sign In function
  const handleGitHubSignIn = () => {
    console.log('Redirecting to GitHub OAuth:', API_ENDPOINTS.GITHUB_AUTH);
    window.location.href = API_ENDPOINTS.GITHUB_AUTH;
  };

  return (
    <>
      <nav className={`relative z-50 px-6 py-4 backdrop-blur-sm border-b shadow-sm ${
        isDark 
          ? 'bg-slate-900/95 border-slate-700' 
          : 'bg-white/95 border-slate-200'
      }`}>
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 via-violet-500 to-teal-500 rounded-lg flex items-center justify-center shadow-lg">
              <Code className="w-5 h-5 text-white" />
            </div>
            <span className={`text-xl font-bold drop-shadow-sm ${
              isDark ? 'text-slate-100' : 'text-slate-800'
            }`}>CodeLens</span>
          </div>
          
          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            {navItems.map(item => (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`hover:text-blue-400 transition-colors font-medium ${
                  currentPage === item.id 
                    ? 'text-blue-400' 
                    : isDark ? 'text-slate-300 hover:text-blue-400' : 'text-slate-600 hover:text-blue-500'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
          
          <div className="flex items-center gap-4">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className={`p-2 rounded-lg transition-all duration-200 ${
                isDark 
                  ? 'hover:bg-slate-700 text-slate-400 hover:text-slate-200' 
                  : 'hover:bg-slate-100 text-slate-500 hover:text-slate-700'
              }`}
              title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            {user ? (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <img 
                    src={user.avatar} 
                    alt={user.name}
                    className="w-8 h-8 rounded-full border-2 border-blue-400 shadow-sm"
                  />
                  <div className="hidden sm:block">
                    <div className={`text-sm font-medium ${
                      isDark ? 'text-slate-200' : 'text-slate-800'
                    }`}>{user.name}</div>
                    <div className={`text-xs capitalize ${
                      isDark ? 'text-slate-500' : 'text-slate-600'
                    }`}>{user.plan} plan</div>
                  </div>
                </div>
                <button
                  onClick={signOut}
                  className={`px-3 py-1.5 text-sm transition-colors flex items-center gap-1 ${
                    isDark 
                      ? 'text-slate-400 hover:text-slate-200' 
                      : 'text-slate-600 hover:text-slate-800'
                  }`}
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            ) : (
              <>
                {/* FIXED: Use GitHub OAuth instead of generic signIn */}
                <button 
                  onClick={handleGitHubSignIn}
                  className={`px-4 py-2 text-sm transition-colors flex items-center gap-2 ${
                    isDark 
                      ? 'hover:text-blue-400 text-slate-300' 
                      : 'hover:text-blue-500 text-slate-600'
                  }`}
                >
                  <Github className="w-4 h-4" />
                  Sign In
                </button>
                <button 
                  onClick={handleGitHubSignIn}
                  className="px-4 py-2 bg-gradient-to-r from-blue-500 via-violet-500 to-teal-500 rounded-lg text-sm font-medium hover:from-blue-600 hover:via-violet-600 hover:to-teal-600 transition-all transform hover:scale-105 text-white shadow-lg hover:shadow-xl flex items-center gap-2"
                >
                  <Github className="w-4 h-4" />
                  Get Started
                </button>
              </>
            )}
            
            {/* Mobile menu button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className={`md:hidden p-2 rounded-lg transition-colors ${
                isDark 
                  ? 'hover:bg-slate-700 text-slate-300' 
                  : 'hover:bg-slate-100 text-slate-700'
              }`}
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Navigation */}
      {isMobileMenuOpen && (
        <div className={`md:hidden fixed inset-x-0 top-20 z-40 backdrop-blur-sm border-b shadow-lg ${
          isDark 
            ? 'bg-slate-900/95 border-slate-700' 
            : 'bg-white/95 border-slate-200'
        }`}>
          <div className="px-6 py-4 space-y-3">
            {navItems.map(item => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onNavigate(item.id);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                    currentPage === item.id 
                      ? 'bg-blue-500/20 text-blue-400 shadow-lg' 
                      : isDark
                        ? 'hover:bg-slate-800 text-slate-300 hover:text-slate-100'
                        : 'hover:bg-slate-100 text-slate-700 hover:text-slate-900'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {item.label}
                </button>
              );
            })}
            
            {/* FIXED: Add GitHub Sign In to mobile menu */}
            {!user && (
              <button
                onClick={() => {
                  handleGitHubSignIn();
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                  isDark
                    ? 'hover:bg-slate-800 text-slate-300 hover:text-slate-100'
                    : 'hover:bg-slate-100 text-slate-700 hover:text-slate-900'
                }`}
              >
                <Github className="w-5 h-5" />
                Sign In with GitHub
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}

// Home Navigation Component - FIXED VERSION
function HomeNavigation({ onNavigate, user, signOut, isLoading }) {
  const { isDark, toggleTheme } = useTheme();
  
  // FIXED: GitHub OAuth Sign In function
  const handleGitHubSignIn = () => {
    console.log('Redirecting to GitHub OAuth:', API_ENDPOINTS.GITHUB_AUTH);
    window.location.href = API_ENDPOINTS.GITHUB_AUTH;
  };
  
  return (
    <nav className={`relative z-50 px-6 py-4 backdrop-blur-sm border-b ${
      isDark 
        ? 'bg-slate-900/95 border-slate-700' 
        : 'bg-white/95 border-slate-200'
    }`}>
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 via-violet-500 to-teal-500 rounded-lg flex items-center justify-center shadow-lg">
            <Code className="w-5 h-5 text-white" />
          </div>
          <span className={`text-xl font-bold drop-shadow-sm ${
            isDark ? 'text-slate-100' : 'text-slate-800'
          }`}>CodeLens</span>
        </div>
        <div className="hidden md:flex items-center gap-8">
          <button 
            onClick={() => onNavigate('home')} 
            className={`transition-colors font-medium ${
              isDark 
                ? 'hover:text-blue-400 text-slate-300' 
                : 'hover:text-blue-500 text-slate-600'
            }`}
          >
            Home
          </button>
          <button 
            onClick={() => onNavigate('dashboard')} 
            className={`transition-colors font-medium ${
              isDark 
                ? 'hover:text-blue-400 text-slate-300' 
                : 'hover:text-blue-500 text-slate-600'
            }`}
          >
            Dashboard
          </button>
          <button 
            onClick={() => onNavigate('pricing')} 
            className={`transition-colors font-medium ${
              isDark 
                ? 'hover:text-blue-400 text-slate-300' 
                : 'hover:text-blue-500 text-slate-600'
            }`}
          >
            Pricing
          </button>
        </div>
        <div className="flex items-center gap-4">
          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className={`p-2 rounded-lg transition-colors ${
              isDark 
                ? 'hover:bg-slate-700 text-slate-400 hover:text-slate-200' 
                : 'hover:bg-slate-100 text-slate-500 hover:text-slate-700'
            }`}
            title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
          
          {user ? (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <img 
                  src={user.avatar} 
                  alt={user.name}
                  className="w-8 h-8 rounded-full border-2 border-blue-400 shadow-sm"
                />
                <div className="hidden sm:block">
                  <div className={`text-sm font-medium ${
                    isDark ? 'text-slate-200' : 'text-slate-800'
                  }`}>{user.name}</div>
                  <div className={`text-xs capitalize ${
                    isDark ? 'text-slate-500' : 'text-slate-600'
                  }`}>{user.plan} plan</div>
                </div>
              </div>
              <button
                onClick={signOut}
                className={`px-3 py-1.5 text-sm transition-colors flex items-center gap-1 ${
                  isDark 
                    ? 'text-slate-400 hover:text-slate-200' 
                    : 'text-slate-600 hover:text-slate-800'
                }`}
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          ) : (
            <>
              {/* FIXED: Use GitHub OAuth instead of generic signIn */}
              <button 
                onClick={handleGitHubSignIn}
                disabled={isLoading}
                className={`px-4 py-2 text-sm transition-colors disabled:opacity-50 flex items-center gap-2 ${
                  isDark 
                    ? 'hover:text-blue-400 text-slate-300' 
                    : 'hover:text-blue-500 text-slate-600'
                }`}
              >
                <Github className="w-4 h-4" />
                {isLoading ? 'Signing In...' : 'Sign In'}
              </button>
              <button 
                onClick={handleGitHubSignIn}
                disabled={isLoading}
                className="px-4 py-2 bg-gradient-to-r from-blue-500 via-violet-500 to-teal-500 rounded-lg text-sm font-medium hover:from-blue-600 hover:via-violet-600 hover:to-teal-600 transition-all transform hover:scale-105 disabled:opacity-50 text-white shadow-lg hover:shadow-xl disabled:transform-none flex items-center gap-2"
              >
                <Github className="w-4 h-4" />
                Get Started
              </button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

export { Navigation, HomeNavigation };