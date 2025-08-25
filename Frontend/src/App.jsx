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
  const { user, signIn, signOut, isLoading, showWelcome, setShowWelcome, handleWelcomeComplete } = useAuth();

  // Check for OAuth callback on app load
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');
    
    // If we have OAuth parameters, show the callback page
    if (code || state) {
      setCurrentPage('auth-callback');
    }
  }, []);

  const handleNavigate = (page) => {
    setCurrentPage(page);
    setIsMobileMenuOpen(false);
  };

  const handleAuthSuccess = (userData) => {
    // After successful auth, the localStorage is already set by AuthCallback
    // We can trigger a page refresh or manually update the user state
    // For now, let's just let the useAuth hook detect the change
    console.log('Auth successful for user:', userData);
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