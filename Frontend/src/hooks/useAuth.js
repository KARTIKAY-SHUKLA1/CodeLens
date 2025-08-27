import { useState, useEffect } from 'react';
import { API_ENDPOINTS, getUserProfile, updateUserPreferences, apiCall } from '../config/api';

// CORRECTED Authentication Hook
function useAuth() {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);

  // Check if user is already authenticated on app load
  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    console.log('useAuth useEffect - token exists:', !!token);
    
    if (token) {
      fetchUserProfile();
    }
  }, []);

  // CORRECTED: Fetch user profile with proper error handling
  const fetchUserProfile = async () => {
    try {
      setIsLoading(true);
      console.log('Fetching user profile...');
      
      // Use the getUserProfile function which handles your backend response format
      const response = await getUserProfile();
      console.log('User profile response:', response);
      
      // Your backend returns { success: true, user: {...}, statistics: {...} }
      const userData = response.user || response;
      
      if (userData && userData.id) {
        setUser(userData);
        console.log('User set successfully:', userData.id);
        
        // Show welcome modal for new users
        if (userData.isNewUser) {
          setShowWelcome(true);
        }
      } else {
        throw new Error('Invalid user data received');
      }
      
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
      
      // Only clear tokens if it's an auth error (401)
      if (error.message.includes('Authentication required') || 
          error.message.includes('Invalid token') ||
          error.message.includes('401')) {
        console.log('Clearing invalid auth data');
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user_data');
        setUser(null);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Refresh user data (called after OAuth success)
  const refreshUser = () => {
    const token = localStorage.getItem('auth_token');
    console.log('Refreshing user, token exists:', !!token);
    if (token) {
      fetchUserProfile();
    }
  };

  // GitHub OAuth Sign In
  const signIn = async () => {
    setIsLoading(true);
    try {
      console.log('Starting GitHub OAuth...');
      console.log('Redirecting to:', API_ENDPOINTS.GITHUB_AUTH);
      // Redirect to GitHub OAuth using the centralized endpoint
      window.location.href = API_ENDPOINTS.GITHUB_AUTH;
    } catch (error) {
      console.error('Sign in error:', error);
      setIsLoading(false);
    }
  };

  // CORRECTED: Handle OAuth callback with better validation
  const handleAuthCallback = async (code, state = null) => {
    setIsLoading(true);
    try {
      console.log('Handling auth callback with code:', code ? 'present' : 'missing');
      
      const response = await apiCall(API_ENDPOINTS.GITHUB_CALLBACK, {
        method: 'POST',
        body: JSON.stringify({ code, state }),
      });

      console.log('Auth callback response:', response);
      
      // Your backend returns { success: true, token: "...", user: {...} }
      if (response.success && response.token && response.user) {
        localStorage.setItem('auth_token', response.token);
        localStorage.setItem('user_data', JSON.stringify(response.user));
        setUser(response.user);
        
        // Show welcome modal for new users
        if (response.user.isNewUser) {
          setShowWelcome(true);
        }
        
        console.log('Authentication successful for user:', response.user.id);
        return response;
      } else {
        throw new Error('Invalid response format from server');
      }
      
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

  // CORRECTED: Sign Out
  const signOut = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (token) {
        // Use the correct logout endpoint
        await apiCall(API_ENDPOINTS.LOGOUT, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
      }
    } catch (error) {
      console.error('Sign out error:', error);
      // Don't throw - still proceed with local cleanup
    } finally {
      // Always clear local data regardless of API call success
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user_data');
      setUser(null);
      setShowWelcome(false);
    }
  };

  // CORRECTED: Save user preferences after onboarding
  const handleWelcomeComplete = async (preferences) => {
    try {
      console.log('Saving onboarding preferences:', preferences);
      const response = await updateUserPreferences(preferences);
      
      // Your backend returns { success: true, user: {...} }
      if (response.success && response.user) {
        setUser(response.user);
      } else {
        // Update local state even if API call has different format
        setUser(prev => ({ ...prev, preferences, isNewUser: false }));
      }
      
      setShowWelcome(false);
      console.log('Welcome completed successfully');
      return response;
    } catch (error) {
      console.error('Failed to save preferences:', error);
      // Still close welcome modal and update local state even if API call fails
      setUser(prev => ({ ...prev, preferences, isNewUser: false }));
      setShowWelcome(false);
      // Don't throw the error - just log it
    }
  };

  // Update review usage (called after code analysis)
  const updateReviewUsage = (creditsInfo) => {
    if (creditsInfo && user) {
      setUser(prev => ({ 
        ...prev, 
        reviewsUsed: creditsInfo.used,
        reviewsLimit: creditsInfo.limit
      }));
    }
  };

  // Helper to check if user is authenticated
  const isAuthenticated = () => {
    return !!user && !!localStorage.getItem('auth_token');
  };

  // Helper to get current auth token
  const getAuthToken = () => {
    return localStorage.getItem('auth_token');
  };

  // Helper to manually set user data (for testing/debugging)
  const setUserData = (userData, token = null) => {
    setUser(userData);
    if (token) {
      localStorage.setItem('auth_token', token);
    }
    localStorage.setItem('user_data', JSON.stringify(userData));
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
    getAuthToken,
    setUserData
  };
}

export default useAuth;