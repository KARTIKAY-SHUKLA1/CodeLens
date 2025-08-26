import React, { useState, useEffect } from 'react';

// Import all the components
import { ThemeProvider } from './components/ThemeProvider';
import useAuth from './hooks/useAuth';
import WelcomeModal from './components/WelcomeModal';
import { Navigation, HomeNavigation } from './components/Navigation';
import { Footer, SimpleFooter } from './components/Footer';
import LandingPage from './pages/LandingPage';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import Pricing from './pages/Pricing';
import AuthCallback from './pages/AuthCallback';

// Main App Component
export default function CodeLensApp() {
  const [currentPage, setCurrentPage] = useState('home');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, signIn, signOut, isLoading, showWelcome, setShowWelcome, handleWelcomeComplete, refreshUser } = useAuth();

  // Check for OAuth callback or token on app load
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const token = urlParams.get('token');
    const userParam = urlParams.get('user');
    const error = urlParams.get('error');
    
    // Handle error from OAuth
    if (error) {
      console.error('OAuth Error:', error);
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
      return;
    }
    
    // Handle token from backend redirect (GitHub OAuth success)
    if (token && userParam) {
      try {
        const userData = JSON.parse(decodeURIComponent(userParam));
        localStorage.setItem('auth_token', token);
        localStorage.setItem('user_data', JSON.stringify(userData));
        
        // Refresh user state in useAuth hook
        refreshUser();
        
        // Show welcome modal for new users
        if (userData.isNewUser) {
          setShowWelcome(true);
        }
        
        // Navigate to dashboard
        setCurrentPage('dashboard');
        
        // Clean up URL params
        window.history.replaceState({}, document.title, window.location.pathname);
      } catch (error) {
        console.error('Failed to process auth token:', error);
        // Clean up URL
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
    // Handle OAuth code (if you still want to support the frontend flow)
    else if (code) {
      setCurrentPage('auth-callback');
    }
  }, [refreshUser, setShowWelcome]);

  const handleNavigate = (page) => {
    setCurrentPage(page);
    setIsMobileMenuOpen(false);
  };

  const handleAuthSuccess = (userData) => {
    console.log('Auth successful for user:', userData);
    // Refresh user state
    refreshUser();
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'home':
        return <LandingPage onNavigate={handleNavigate} user={user} signIn={signIn} isLoading={isLoading} />;
      case 'dashboard':
        return <Dashboard onNavigate={handleNavigate} user={user} />;
      case 'profile':
        return <Profile user={user} />;
      case 'pricing':
        return <Pricing user={user} onNavigate={handleNavigate} />;
      case 'auth-callback':
        return <AuthCallback onNavigate={handleNavigate} onAuthSuccess={handleAuthSuccess} />;
      default:
        return <LandingPage onNavigate={handleNavigate} user={user} signIn={signIn} isLoading={isLoading} />;
    }
  };

  return (
    <ThemeProvider>
      <div className="min-h-screen">
        {currentPage !== 'home' && currentPage !== 'auth-callback' && (
          <Navigation 
            currentPage={currentPage} 
            onNavigate={handleNavigate}
            isMobileMenuOpen={isMobileMenuOpen}
            setIsMobileMenuOpen={setIsMobileMenuOpen}
            user={user}
            signOut={signOut}
          />
        )}
        
        {currentPage === 'home' && (
          <HomeNavigation 
            onNavigate={handleNavigate} 
            user={user} 
            signIn={signIn} 
            signOut={signOut} 
            isLoading={isLoading} 
          />
        )}
        
        {renderPage()}
        
        {/* Welcome Modal - don't show on callback page */}
        {currentPage !== 'auth-callback' && (
          <WelcomeModal 
            user={user}
            isOpen={showWelcome}
            onClose={() => setShowWelcome(false)}
            onComplete={handleWelcomeComplete}
          />
        )}
        
        {/* Footer - only show SimpleFooter on home page */}
        {currentPage === 'home' && <SimpleFooter />}
      </div>
    </ThemeProvider>
  );
}