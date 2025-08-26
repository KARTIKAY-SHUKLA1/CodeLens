import { useState, useEffect } from 'react';
import { API_ENDPOINTS, getUserProfile, updateUserPreferences } from '../config/api';

// FIXED Real Authentication Hook - Consistent with API config
function useAuth() {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);

  // Check if user is already authenticated on app load
  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      fetchUserProfile();
    }
  }, []);

  // FIXED: Fetch user profile using the centralized API config
  const fetchUserProfile = async () => {
    try {
      setIsLoading(true);
      const userData = await getUserProfile();
      setUser(userData);
      
      // Show welcome modal for new users
      if (userData.isNewUser) {
        setShowWelcome(true);
      }
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
      // Clear invalid token
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user_data');
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Refresh user data (called after OAuth success)
  const refreshUser = () => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      fetchUserProfile();
    }
  };

  // FIXED: GitHub OAuth Sign In - Use API_ENDPOINTS
  const signIn = async () => {
    setIsLoading(true);
    try {
      // Redirect to GitHub OAuth using the centralized endpoint
      window.location.href = API_ENDPOINTS.GITHUB_AUTH;
    } catch (error) {
      console.error('Sign in error:', error);
      setIsLoading(false);
    }
  };

  // FIXED: Handle OAuth callback - Use API_ENDPOINTS
  const handleAuthCallback = async (code, state = null) => {
    setIsLoading(true);
    try {
      const response = await fetch(API_ENDPOINTS.GITHUB_CALLBACK, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code, state }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Authentication failed');
      }

      const data = await response.json();
      
      // Store the JWT token and user data
      if (data.token) {
        localStorage.setItem('auth_token', data.token);
        localStorage.setItem('user_data', JSON.stringify(data.user));
        setUser(data.user);
        
        // Show welcome modal for new users
        if (data.user.isNewUser) {
          setShowWelcome(true);
        }
      } else {
        throw new Error('No token received from server');
      }
      
      return data;
    } catch (error) {
      console.error('Auth callback error:', error);
      // Clear any partial auth data
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user_data');
      setUser(null);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // FIXED: Sign Out - Use API_ENDPOINTS
  const signOut = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (token) {
        await fetch(API_ENDPOINTS.LOGOUT, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
      }
    } catch (error) {
      console.error('Sign out error:', error);
    } finally {
      // Always clear local data regardless of API call success
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user_data');
      setUser(null);
      setShowWelcome(false);
    }
  };

  // FIXED: Save user preferences after onboarding
  const handleWelcomeComplete = async (preferences) => {
    try {
      const updatedUser = await updateUserPreferences(preferences);
      setUser(prev => ({ ...prev, preferences, isNewUser: false }));
      setShowWelcome(false);
      return updatedUser;
    } catch (error) {
      console.error('Failed to save preferences:', error);
      // Still close welcome modal and update local state even if API call fails
      setUser(prev => ({ ...prev, preferences, isNewUser: false }));
      setShowWelcome(false);
      // Don't throw the error - just log it
    }
  };

  // FIXED: Update review usage (called after code analysis)
  const updateReviewUsage = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        console.warn('No auth token found for review usage update');
        return;
      }

      const response = await fetch(API_ENDPOINTS.INCREMENT_USAGE, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const updatedData = await response.json();
        setUser(prev => ({ ...prev, reviewsUsed: updatedData.reviewsUsed }));
      } else {
        console.error('Failed to update review usage:', response.statusText);
      }
    } catch (error) {
      console.error('Failed to update review usage:', error);
    }
  };

  // ADDED: Helper to check if user is authenticated
  const isAuthenticated = () => {
    return !!user && !!localStorage.getItem('auth_token');
  };

  // ADDED: Helper to get current auth token
  const getAuthToken = () => {
    return localStorage.getItem('auth_token');
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
    refreshUser,
    isAuthenticated,
    getAuthToken
  };
}

export default useAuth;