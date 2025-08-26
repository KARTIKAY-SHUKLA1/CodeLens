// src/config/api.js
// API Configuration for Frontend

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

// API endpoints
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
  
  // User endpoints
  GET_PROFILE: `${API_BASE_URL}/api/users/profile`,
  UPDATE_PREFERENCES: `${API_BASE_URL}/api/users/preferences`,
  
  // Debug endpoints (for testing)
  TEST_ENV: `${API_BASE_URL}/api/ai/test-env`,
  DEBUG_API: `${API_BASE_URL}/api/ai/debug-api`,
  TEST_ANALYZE: `${API_BASE_URL}/api/ai/test-analyze`
};

// Helper function for making API calls
export const apiCall = async (endpoint, options = {}) => {
  const token = localStorage.getItem('auth_token');
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
    const response = await fetch(endpoint, defaultOptions);
    
    // Log response for debugging
    console.log(`API Response [${response.status}]:`, response.statusText);
    
    if (!response.ok) {
      const errorData = await response.text();
      console.error(`API Error [${response.status}]:`, errorData);
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('API Call Failed:', error);
    throw error;
  }
};

// Specific API functions
export const analyzeCode = async (code, language, options = {}) => {
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

// Export the base URL for use in other components
export { API_BASE_URL };

export default {
  API_ENDPOINTS,
  apiCall,
  analyzeCode,
  getLanguages,
  detectLanguage,
  testConnection,
  API_BASE_URL
};