// src/config/api.js - CORRECTED VERSION WITH ENDPOINT FIXES
// API Configuration for Frontend

// Determine the base API URL based on environment
const getApiBaseUrl = () => {
  // Check environment variable first
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  
  // Production check
  if (window.location.hostname.includes('vercel.app') || 
      window.location.hostname.includes('netlify.app') ||
      window.location.protocol === 'https:') {
    return 'https://codelens-backend-0xl0.onrender.com';
  }
  
  // Development fallback
  if (window.location.hostname === 'localhost' || 
      window.location.hostname === '127.0.0.1') {
    return 'http://localhost:5000';
  }

  // Final fallback to production
  return 'https://codelens-backend-0xl0.onrender.com';
};

const API_BASE_URL = getApiBaseUrl();

console.log('🔗 API Base URL:', API_BASE_URL);

// FIXED: API endpoints to match your actual backend routes
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
  
  // Auth endpoints - NEED TO VERIFY THESE WITH auth.routes.js
  GITHUB_AUTH: `${API_BASE_URL}/api/auth/github`,
  GITHUB_CALLBACK: `${API_BASE_URL}/api/auth/github/callback`,
  VERIFY_TOKEN: `${API_BASE_URL}/api/auth/verify-token`,  // MOST LIKELY CORRECT NAME
  REFRESH_TOKEN: `${API_BASE_URL}/api/auth/refresh`,
  LOGOUT: `${API_BASE_URL}/api/auth/logout`,
  
  // User endpoints - THESE MATCH YOUR user.routes.js EXACTLY
  GET_PROFILE: `${API_BASE_URL}/api/users/profile`,        
  UPDATE_PREFERENCES: `${API_BASE_URL}/api/users/preferences`,  
  UPDATE_PROFILE: `${API_BASE_URL}/api/users/profile`,     
  GET_DASHBOARD: `${API_BASE_URL}/api/users/dashboard`,    
  GET_ACTIVITY: `${API_BASE_URL}/api/users/activity`,      
  UPGRADE_PLAN: `${API_BASE_URL}/api/users/upgrade`,
  
  // Health check
  HEALTH: `${API_BASE_URL}/health`
};

// Token management functions
const getAuthToken = () => {
  return localStorage.getItem('auth_token') || localStorage.getItem('token');
};

const setAuthToken = (token) => {
  if (token) {
    localStorage.setItem('auth_token', token);
    localStorage.setItem('token', token); // Backup key
    console.log('🔑 Token stored successfully');
  }
};

const clearAuthToken = () => {
  localStorage.removeItem('auth_token');
  localStorage.removeItem('token');
  localStorage.removeItem('user_data');
  localStorage.removeItem('user');
  console.log('🚫 Tokens cleared');
};

// IMPROVED: API call function with better debugging and error handling
export const apiCall = async (endpoint, options = {}) => {
  const token = getAuthToken();
  
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
    console.log(`🔗 API Call: ${endpoint}`);
    console.log(`🔑 Token: ${token ? 'Present' : 'Missing'}`);
    
    const response = await fetch(endpoint, defaultOptions);
    
    console.log(`📡 Response [${response.status}]: ${response.statusText || 'No status text'}`);
    
    // Handle different status codes
    if (response.status === 401) {
      console.warn('🚫 Authentication failed - clearing tokens');
      clearAuthToken();
      throw new Error('Authentication required. Please sign in again.');
    }
    
    if (response.status === 404) {
      console.error(`❌ Endpoint not found: ${endpoint}`);
      throw new Error(`API endpoint not found: ${response.status}`);
    }

    if (response.status === 403) {
      console.error('🚫 Forbidden - insufficient permissions');
      throw new Error('Access denied. Insufficient permissions.');
    }

    if (response.status >= 500) {
      console.error('🔥 Server error');
      throw new Error('Server error. Please try again later.');
    }

    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
        console.error(`❌ API Error [${response.status}]:`, errorData);
      } catch (e) {
        const errorText = await response.text();
        console.error(`❌ API Error [${response.status}]:`, errorText);
        errorData = { message: errorText || `HTTP ${response.status}` };
      }
      
      throw new Error(errorData.message || errorData.error || `API Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('✅ API Call successful');
    return data;
    
  } catch (error) {
    console.error('❌ API Call Failed:', error);
    
    // Network errors
    if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
      throw new Error('Network error. Please check your internet connection and try again.');
    }
    
    throw error;
  }
};

// IMPROVED: Authentication function with better error handling
export const authenticateUser = async (token) => {
  try {
    const response = await apiCall(API_ENDPOINTS.VERIFY_TOKEN, {
      method: 'POST',
      body: JSON.stringify({ token }),
    });
    
    // Handle different response formats from your backend
    const userData = response.user || response;
    
    if (userData && userData.id) {
      setAuthToken(token);
      localStorage.setItem('user_data', JSON.stringify(userData));
      console.log('✅ User authenticated successfully');
      return userData;
    }
    
    throw new Error('Invalid response format from server');
  } catch (error) {
    console.error('❌ Authentication failed:', error);
    clearAuthToken();
    throw error;
  }
};

// IMPROVED: Get current user function
export const getCurrentUser = async () => {
  try {
    const response = await apiCall(API_ENDPOINTS.GET_PROFILE);
    
    // Handle your backend's response format
    const userData = response.user || response;
    
    if (userData) {
      localStorage.setItem('user_data', JSON.stringify(userData));
      console.log('✅ User profile retrieved');
      return userData;
    }
    
    throw new Error('No user data received');
  } catch (error) {
    console.error('❌ Get current user failed:', error);
    if (error.message.includes('Authentication required') || 
        error.message.includes('Invalid token')) {
      clearAuthToken();
    }
    throw error;
  }
};

// Code analysis function
export const analyzeCode = async (code, language, options = {}) => {
  try {
    console.log('🔍 Analyzing code...');
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
    console.error('Analysis error:', error);
    throw error;
  }
};

// User profile functions that match your backend response format
export const getUserProfile = async () => {
  try {
    const response = await apiCall(API_ENDPOINTS.GET_PROFILE);
    // Your backend returns { success: true, user: {...}, statistics: {...} }
    return response;
  } catch (error) {
    console.error('Failed to fetch user profile:', error);
    throw error;
  }
};

export const updateUserPreferences = async (preferences) => {
  try {
    console.log('💾 Saving user preferences...');
    const response = await apiCall(API_ENDPOINTS.UPDATE_PREFERENCES, {
      method: 'POST',
      body: JSON.stringify(preferences),
    });
    console.log('✅ Preferences saved');
    return response;
  } catch (error) {
    console.error('Failed to save preferences:', error);
    throw error;
  }
};

export const updateUserProfile = async (profileData) => {
  return await apiCall(API_ENDPOINTS.UPDATE_PROFILE, {
    method: 'PUT',
    body: JSON.stringify(profileData),
  });
};

export const getUserDashboard = async () => {
  return await apiCall(API_ENDPOINTS.GET_DASHBOARD);
};

export const getUserActivity = async (page = 1, limit = 20) => {
  return await apiCall(`${API_ENDPOINTS.GET_ACTIVITY}?page=${page}&limit=${limit}`);
};

// Other API functions
export const getLanguages = async () => {
  return await apiCall(API_ENDPOINTS.GET_LANGUAGES);
};

export const detectLanguage = async (code) => {
  return await apiCall(API_ENDPOINTS.DETECT_LANGUAGE, {
    method: 'POST',
    body: JSON.stringify({ code }),
  });
};

export const logoutUser = async () => {
  try {
    await apiCall(API_ENDPOINTS.LOGOUT, { method: 'POST' });
    console.log('✅ Logout successful');
  } catch (error) {
    console.error('Logout API call failed:', error);
  } finally {
    clearAuthToken();
  }
};

// Health check
export const checkHealth = async () => {
  try {
    const response = await apiCall(API_ENDPOINTS.HEALTH);
    console.log('✅ Backend health check passed:', response.status);
    return response;
  } catch (error) {
    console.error('❌ Backend health check failed:', error);
    throw error;
  }
};

// Export token management functions
export { getAuthToken, setAuthToken, clearAuthToken };

export { API_BASE_URL };

export default {
  API_ENDPOINTS,
  apiCall,
  analyzeCode,
  getLanguages,
  detectLanguage,
  authenticateUser,
  getCurrentUser,
  getUserProfile,
  updateUserPreferences,
  updateUserProfile,
  getUserDashboard,
  getUserActivity,
  logoutUser,
  checkHealth,
  getAuthToken,
  setAuthToken,
  clearAuthToken,
  API_BASE_URL
};