import { useState } from 'react';

// Enhanced Authentication Hook
function useAuth() {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);

  const signIn = async () => {
    setIsLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const mockUser = {
        id: '12345',
        name: 'Kartikay Shukla',
        email: 'kartikay@example.com',
        avatar: 'https://github.com/github.png',
        githubUsername: 'kartikayshukla',
        plan: 'free',
        reviewsUsed: 7,
        reviewsLimit: 10,
        isNewUser: true // This would come from your backend
      };
      
      setUser(mockUser);
      
      // Show welcome modal for new users
      if (mockUser.isNewUser) {
        setShowWelcome(true);
      }
    } catch (error) {
      console.error('Sign in error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = () => {
    setUser(null);
    setShowWelcome(false);
  };

  const handleWelcomeComplete = (preferences) => {
    // In real app, save to backend
    console.log('User preferences:', preferences);
    setUser(prev => ({ ...prev, preferences, isNewUser: false }));
  };

  return { 
    user, 
    signIn, 
    signOut, 
    isLoading, 
    showWelcome, 
    setShowWelcome,
    handleWelcomeComplete 
  };
}

export default useAuth;