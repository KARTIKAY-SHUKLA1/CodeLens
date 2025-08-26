// src/config/api.js
// API Configuration for Frontend - FIXED VERSION

// Determine the base API URL based on environment
const getApiBaseUrl = () => {
  // Force production URL if we're on Vercel
  if (window.location.hostname.includes('vercel.app')) {
    return 'https://codelens-backend-0xl0.onrender.com';
  }
  
  // If running in development (localhost)
  if (window.location.hostname === 'localhost') {
    if (import.meta.env.VITE_API_URL) {
      return import.meta.env.VITE_API_URL;
    }
    return 'http://localhost:5000';
  }

  // Production fallback
  return import.meta.env.VITE_API_URL || 'https://codelens-backend-0xl0.onrender.com';
};

// Create the API configuration
const API_BASE_URL = getApiBaseUrl();

console.log('API Base URL:', API_BASE_URL);

// API endpoints - FIXED: Consistent URL construction
export const API_ENDPOINTS = {
  // AI Analysis endpoints
  ANALYZE_CODE: `${API_BASE_URL}/api/ai/analyze`,
  GET_LANGUAGES: `${API_BASE_URL}/api/ai/languages`,
  DETECT_LANGUAGE: `${API_BASE_URL}/api/ai/detect-language`,
  
  // Review endpoints
  GET_REVIEWS: `${API_BASE_URL}/api/reviews`,
  CREATE_REVIEW: `${API_BASE_URL}/api/reviews`,
  UPDATE_REVIEW: `${API_BASE_URL}/api/reviews`,
  DELETE_REVIEW: `${API_BASE_URL}/api/reviews`,
  INCREMENT_USAGE: `${API_BASE_URL}/api/reviews/increment`,
  
  // Auth endpoints
  GITHUB_AUTH: `${API_BASE_URL}/api/auth/github`,
  GITHUB_CALLBACK: `${API_BASE_URL}/api/auth/github/callback`,
  LOGOUT: `${API_BASE_URL}/api/auth/logout`,
  GET_ME: `${API_BASE_URL}/api/auth/me`, // ADDED: This endpoint exists in your backend
  
  // User endpoints - FIXED: These should match your backend routes
  GET_PROFILE: `${API_BASE_URL}/api/users/profile`,
  UPDATE_PREFERENCES: `${API_BASE_URL}/api/users/preferences`,
  
  // Debug endpoints (for testing)
  TEST_ENV: `${API_BASE_URL}/api/ai/test-env`,
  DEBUG_API: `${API_BASE_URL}/api/ai/debug-api`,
  TEST_ANALYZE: `${API_BASE_URL}/api/ai/test-analyze`
};

// Helper function for making API calls - FIXED: Better error handling
export const apiCall = async (endpoint, options = {}) => {
  const token = localStorage.getItem('auth_token'); // FIXED: Consistent token key
  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...options.headers,
    },
    credentials: 'include',
    ...options,
  };

  try {
    console.log(`Making API call to: ${endpoint}`);
    console.log('With token:', token ? 'Present' : 'Missing');
    
    const response = await fetch(endpoint, defaultOptions);
    
    // Log response for debugging
    console.log(`API Response [${response.status}]:`, response.statusText);
    
    // FIXED: Better error handling for different status codes
    if (response.status === 401) {
      // Token expired or invalid - clear auth data
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user_data');
      console.warn('Authentication failed - token cleared');
      throw new Error('Authentication required. Please sign in again.');
    }
    
    if (response.status === 404) {
      console.error(`Endpoint not found: ${endpoint}`);
      throw new Error(`API endpoint not found: ${response.status}`);
    }

    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch (e) {
        errorData = { message: await response.text() };
      }
      console.error(`API Error [${response.status}]:`, errorData);
      throw new Error(errorData.message || `API Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('API Call Failed:', error);
    throw error;
  }
};

// FIXED: Updated API functions with better error handling
export const analyzeCode = async (code, language, options = {}) => {
  try {
    return await apiCall(API_ENDPOINTS.ANALYZE_CODE, {
      method: 'POST',
      body: JSON.stringify({
        code,
        language,
        selectedLanguage: options.selectedLanguage,
        preferences: options.preferences || {
          strictness: 'balanced',
          focusAreas: ['quality', 'security', 'performance'],
          verbosity: 'detailed'
        }
      }),
    });
  } catch (error) {
    // If analyze fails, try localhost as fallback for development
    if (API_BASE_URL.includes('onrender.com') && window.location.hostname === 'localhost') {
      console.warn('Production API failed, trying localhost fallback...');
      try {
        return await apiCall('http://localhost:5000/api/ai/analyze', {
          method: 'POST',
          body: JSON.stringify({
            code,
            language,
            selectedLanguage: options.selectedLanguage,
            preferences: options.preferences || {
              strictness: 'balanced',
              focusAreas: ['quality', 'security', 'performance'],
              verbosity: 'detailed'
            }
          }),
          headers: {
            'Content-Type': 'application/json',
          }
        });
      } catch (fallbackError) {
        console.error('Localhost fallback also failed:', fallbackError);
        throw error; // Throw original error
      }
    }
    throw error;
  }
};

export const getLanguages = async () => {
  return await apiCall(API_ENDPOINTS.GET_LANGUAGES);
};

export const detectLanguage = async (code) => {
  return await apiCall(API_ENDPOINTS.DETECT_LANGUAGE, {
    method: 'POST',
    body: JSON.stringify({ code }),
  });
};

// Test connection to backend
export const testConnection = async () => {
  try {
    const response = await apiCall(API_ENDPOINTS.TEST_ENV);
    console.log('Backend connection test:', response);
    return response;
  } catch (error) {
    console.error('Backend connection failed:', error);
    throw error;
  }
};

// ADDED: Helper function to get user profile
export const getUserProfile = async () => {
  return await apiCall(API_ENDPOINTS.GET_PROFILE);
};

// ADDED: Helper function to update preferences
export const updateUserPreferences = async (preferences) => {
  return await apiCall(API_ENDPOINTS.UPDATE_PREFERENCES, {
    method: 'POST',
    body: JSON.stringify(preferences),
  });
};

// Export the base URL for use in other components
export { API_BASE_URL };

export default {
  API_ENDPOINTS,
  apiCall,
  analyzeCode,
  getLanguages,
  detectLanguage,
  testConnection,
  getUserProfile,
  updateUserPreferences,
  API_BASE_URL
};