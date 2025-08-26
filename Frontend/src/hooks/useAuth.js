import { useState, useEffect } from 'react';

// Real Authentication Hook - Connected to Backend API
function useAuth() {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);

  // Your deployed backend API base URL
  const API_BASE_URL = (import.meta.env.VITE_API_URL || 'https://codelens-backend-0xl0.onrender.com') + '/api';

  // Check if user is already authenticated on app load
  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      fetchUserProfile(token);
    }
  }, []);

  // Fetch user profile from backend
  const fetchUserProfile = async (token) => {
    try {
      const response = await fetch(`${API_BASE_URL}/users/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
        
        // Show welcome modal for new users
        if (userData.isNewUser) {
          setShowWelcome(true);
        }
      } else {
        // Invalid token, clear it
        localStorage.removeItem('auth_token');
        setUser(null);
      }
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
      localStorage.removeItem('auth_token');
      setUser(null);
    }
  };

  // Refresh user data (called after OAuth success)
  const refreshUser = () => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      fetchUserProfile(token);
    }
  };

  // GitHub OAuth Sign In
  const signIn = async () => {
    setIsLoading(true);
    try {
      // Redirect to GitHub OAuth
      window.location.href = `${API_BASE_URL}/auth/github`;
    } catch (error) {
      console.error('Sign in error:', error);
      setIsLoading(false);
    }
  };

  // Handle OAuth callback (call this from your callback component)
  const handleAuthCallback = async (code) => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/auth/github/callback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code }),
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('auth_token', data.token);
        setUser(data.user);
        
        // Show welcome modal for new users
        if (data.user.isNewUser) {
          setShowWelcome(true);
        }
        return data;
      } else {
        throw new Error('Authentication failed');
      }
    } catch (error) {
      console.error('Auth callback error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Sign Out
  const signOut = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (token) {
        await fetch(`${API_BASE_URL}/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
      }
    } catch (error) {
      console.error('Sign out error:', error);
    } finally {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user_data');
      setUser(null);
      setShowWelcome(false);
    }
  };

  // Save user preferences after onboarding
  const handleWelcomeComplete = async (preferences) => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_BASE_URL}/users/preferences`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(preferences),
      });

      if (response.ok) {
        setUser(prev => ({ ...prev, preferences, isNewUser: false }));
        setShowWelcome(false);
      }
    } catch (error) {
      console.error('Failed to save preferences:', error);
      // Still close welcome modal even if save fails
      setUser(prev => ({ ...prev, preferences, isNewUser: false }));
      setShowWelcome(false);
    }
  };

  // Update review usage (called after code analysis)
  const updateReviewUsage = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_BASE_URL}/reviews/increment`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const updatedUser = await response.json();
        setUser(prev => ({ ...prev, reviewsUsed: updatedUser.reviewsUsed }));
      }
    } catch (error) {
      console.error('Failed to update review usage:', error);
    }
  };

  return { 
    user, 
    signIn, 
    signOut, 
    isLoading, 
    showWelcome, 
    setShowWelcome,
    handleWelcomeComplete,
    handleAuthCallback,
    updateReviewUsage,
    refreshUser  // Added this new function
  };
}

export default useAuth;