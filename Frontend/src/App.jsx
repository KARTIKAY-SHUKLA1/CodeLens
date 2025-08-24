import React, { useState } from 'react';

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

// Main App Component
export default function CodeLensApp() {
  const [currentPage, setCurrentPage] = useState('home');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, signIn, signOut, isLoading, showWelcome, setShowWelcome, handleWelcomeComplete } = useAuth();

  const handleNavigate = (page) => {
    setCurrentPage(page);
    setIsMobileMenuOpen(false);
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
      default:
        return <LandingPage onNavigate={handleNavigate} user={user} signIn={signIn} isLoading={isLoading} />;
    }
  };

  return (
    <ThemeProvider>
      <div className="min-h-screen">
        {currentPage !== 'home' && (
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
        
        {/* Welcome Modal */}
        <WelcomeModal 
          user={user}
          isOpen={showWelcome}
          onClose={() => setShowWelcome(false)}
          onComplete={handleWelcomeComplete}
        />
        
        {/* Footer - only show SimpleFooter on home page */}
        {currentPage === 'home' && <SimpleFooter />}
      </div>
    </ThemeProvider>
  );
}