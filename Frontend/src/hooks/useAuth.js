import { useState, useEffect, useCallback, useRef } from 'react';
import { API_ENDPOINTS, getUserProfile, updateUserPreferences, apiCall } from '../config/api';

function useAuth() {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [initialized, setInitialized] = useState(false);
  
  // Use ref to prevent multiple simultaneous requests
  const isFetching = useRef(false);
  const authFailureCount = useRef(0);
  const MAX_AUTH_FAILURES = 3;

  // Token validation helper
  const isTokenValid = useCallback((token) => {
    if (!token) return false;
    
    try {
      // Check if JWT token and not expired
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.exp * 1000 > Date.now();
    } catch {
      return false;
    }
  }, []);

  // Clear all authentication data
  const clearAuthData = useCallback(() => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('token'); // Also clear 'token' if it exists
    localStorage.removeItem('user_data');
    setUser(null);
    setShowWelcome(false);
    isFetching.current = false;
  }, []);

  // FIXED: Simplified fetchUserProfile without circular dependencies
  const fetchUserProfile = useCallback(async () => {
    // Prevent multiple simultaneous fetches
    if (isFetching.current || isLoading) {
      console.log('Already fetching user profile, skipping...');
      return;
    }

    const token = localStorage.getItem('auth_token');
    if (!token) {
      setInitialized(true);
      return;
    }

    // Validate token before making request
    if (!isTokenValid(token)) {
      console.log('Token is expired or invalid, clearing auth data');
      clearAuthData();
      setInitialized(true);
      return;
    }

    isFetching.current = true;
    setIsLoading(true);

    try {
      console.log('Fetching user profile...');
      const response = await getUserProfile();
      console.log('User profile response:', response);
      
      const userData = response.user || response;
      
      if (userData && userData.id) {
        setUser(userData);
        console.log('User set successfully:', userData.id);
        
        // Reset failure count on success
        authFailureCount.current = 0;
        
        // Show welcome modal for new users
        if (userData.isNewUser) {
          setShowWelcome(true);
        }
      } else {
        throw new Error('Invalid user data received');
      }
      
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
      
      // Increment failure count
      authFailureCount.current++;
      
      // Check if it's an auth error
      const isAuthError = error.message.includes('Authentication required') || 
                         error.message.includes('Invalid token') ||
                         error.message.includes('401') ||
                         error.message.includes('403') ||
                         error.status === 401 ||
                         error.status === 403;
      
      if (isAuthError || authFailureCount.current >= MAX_AUTH_FAILURES) {
        console.log('Clearing invalid auth data due to auth failure or max attempts');
        clearAuthData();
        
        // Prevent infinite loops by redirecting after max failures
        if (authFailureCount.current >= MAX_AUTH_FAILURES) {
          console.log('Max auth failures reached, redirecting to login');
          window.location.href = '/login';
          return;
        }
      }
    } finally {
      setIsLoading(false);
      setInitialized(true);
      isFetching.current = false;
    }
  }, [isTokenValid, clearAuthData, isLoading]);

  // FIXED: Simplified useEffect without circular dependencies
  useEffect(() => {
    if (initialized || isFetching.current) return;
    
    console.log('useAuth useEffect - initializing...');
    
    const token = localStorage.getItem('auth_token');
    console.log('useAuth useEffect - token exists:', !!token);
    
    if (token) {
      fetchUserProfile();
    } else {
      setInitialized(true);
    }
  }, [initialized]); // Only depend on initialized flag

  // Refresh user data (called after OAuth success)
  const refreshUser = useCallback(() => {
    const token = localStorage.getItem('auth_token');
    console.log('Refreshing user, token exists:', !!token);
    
    if (token && !isFetching.current) {
      setInitialized(false); // Allow re-fetch
      authFailureCount.current = 0; // Reset failure count
    }
  }, []);

  // GitHub OAuth Sign In
  const signIn = async () => {
    setIsLoading(true);
    try {
      console.log('Starting GitHub OAuth...');
      console.log('Redirecting to:', API_ENDPOINTS.GITHUB_AUTH);
      window.location.href = API_ENDPOINTS.GITHUB_AUTH;
    } catch (error) {
      console.error('Sign in error:', error);
      setIsLoading(false);
    }
  };

  // Handle OAuth callback
  const handleAuthCallback = async (code, state = null) => {
    if (isFetching.current) {
      console.log('Auth callback already in progress, skipping...');
      return;
    }

    setIsLoading(true);
    isFetching.current = true;

    try {
      console.log('Handling auth callback with code:', code ? 'present' : 'missing');
      
      const response = await apiCall(API_ENDPOINTS.GITHUB_CALLBACK, {
        method: 'POST',
        body: JSON.stringify({ code, state }),
      });

      console.log('Auth callback response:', response);
      
      if (response.success && response.token && response.user) {
        localStorage.setItem('auth_token', response.token);
        localStorage.setItem('user_data', JSON.stringify(response.user));
        setUser(response.user);
        
        if (response.user.isNewUser) {
          setShowWelcome(true);
        }
        
        console.log('Authentication successful for user:', response.user.id);
        authFailureCount.current = 0; // Reset failure count
        return response;
      } else {
        throw new Error('Invalid response format from server');
      }
      
    } catch (error) {
      console.error('Auth callback error:', error);
      clearAuthData();
      throw error;
    } finally {
      setIsLoading(false);
      setInitialized(true);
      isFetching.current = false;
    }
  };

  // Sign Out
  const signOut = async () => {
    if (isFetching.current) return;
    
    isFetching.current = true;
    
    try {
      const token = localStorage.getItem('auth_token');
      if (token) {
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
    } finally {
      clearAuthData();
      setInitialized(false);
      authFailureCount.current = 0;
    }
  };

  // Save preferences after onboarding
  const handleWelcomeComplete = async (preferences) => {
    try {
      console.log('Saving onboarding preferences:', preferences);
      const response = await updateUserPreferences(preferences);
      
      if (response.success && response.user) {
        setUser(response.user);
      } else {
        setUser(prev => ({ ...prev, preferences, isNewUser: false }));
      }
      
      setShowWelcome(false);
      console.log('Welcome completed successfully');
      return response;
    } catch (error) {
      console.error('Failed to save preferences:', error);
      setUser(prev => ({ ...prev, preferences, isNewUser: false }));
      setShowWelcome(false);
    }
  };

  // Update review usage
  const updateReviewUsage = (creditsInfo) => {
    if (creditsInfo && user) {
      setUser(prev => ({ 
        ...prev, 
        reviewsUsed: creditsInfo.used,
        reviewsLimit: creditsInfo.limit
      }));
    }
  };

  // Helper functions
  const isAuthenticated = () => {
    return !!user && !!localStorage.getItem('auth_token');
  };

  const getAuthToken = () => {
    return localStorage.getItem('auth_token');
  };

  const setUserData = (userData, token = null) => {
    console.log('DEBUG: setUserData exists?', typeof setUserData);
    console.log('DEBUG: user exists?', !!userData);
    
    if (!userData) {
      console.warn('setUserData called with null/undefined userData');
      return;
    }
    
    setUser(userData);
    if (token) {
      localStorage.setItem('auth_token', token);
    }
    localStorage.setItem('user_data', JSON.stringify(userData));
    console.log('User data set manually:', userData.id || 'no-id');
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