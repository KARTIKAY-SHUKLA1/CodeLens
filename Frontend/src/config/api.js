// src/config/api.js - FIXED VERSION
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

console.log('API Base URL:', API_BASE_URL);

// FIXED: Consistent API endpoints matching your backend routes
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
  
  // Auth endpoints - FIXED: Using correct endpoints from your backend
  GITHUB_AUTH: `${API_BASE_URL}/api/auth/github`,
  GITHUB_CALLBACK: `${API_BASE_URL}/api/auth/github/callback`,
  VERIFY_TOKEN: `${API_BASE_URL}/api/auth/verify-token`,
  LOGOUT: `${API_BASE_URL}/api/auth/logout`,
  GET_ME: `${API_BASE_URL}/api/auth/me`, // This exists in your backend
  
  // User endpoints - FIXED: These match your backend exactly
  GET_PROFILE: `${API_BASE_URL}/api/users/profile`,
  UPDATE_PREFERENCES: `${API_BASE_URL}/api/users/preferences`,
  UPDATE_PROFILE: `${API_BASE_URL}/api/users/profile`,
  GET_DASHBOARD: `${API_BASE_URL}/api/users/dashboard`,
  GET_ACTIVITY: `${API_BASE_URL}/api/users/activity`,
  
  // Health check
  HEALTH: `${API_BASE_URL}/health`
};

// FIXED: Better token management
const getAuthToken = () => {
  return localStorage.getItem('auth_token') || localStorage.getItem('token');
};

const setAuthToken = (token) => {
  localStorage.setItem('auth_token', token);
  localStorage.setItem('token', token); // Backup key
};

const clearAuthToken = () => {
  localStorage.removeItem('auth_token');
  localStorage.removeItem('token');
  localStorage.removeItem('user_data');
  localStorage.removeItem('user');
};

// FIXED: Improved API call function with better error handling
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
    
    console.log(`📡 Response [${response.status}]: ${response.statusText}`);
    
    // Handle different status codes
    if (response.status === 401) {
      console.warn('🚫 Authentication failed - clearing tokens');
      clearAuthToken();
      
      // If it's not a login-related endpoint, throw auth error
      if (!endpoint.includes('/auth/')) {
        throw new Error('Authentication required. Please sign in again.');
      }
    }
    
    if (response.status === 404) {
      console.error(`❌ Endpoint not found: ${endpoint}`);
      throw new Error(`API endpoint not found: ${response.status}`);
    }

    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch (e) {
        errorData = { message: await response.text() || `HTTP ${response.status}` };
      }
      
      console.error(`💥 API Error [${response.status}]:`, errorData);
      throw new Error(errorData.message || `API Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('✅ API Call successful');
    return data;
    
  } catch (error) {
    console.error('❌ API Call Failed:', error);
    throw error;
  }
};

// FIXED: Authentication functions
export const authenticateUser = async (token) => {
  try {
    const response = await apiCall(API_ENDPOINTS.VERIFY_TOKEN, {
      method: 'POST',
      body: JSON.stringify({ token }),
    });
    
    if (response.success && response.user) {
      setAuthToken(token);
      localStorage.setItem('user_data', JSON.stringify(response.user));
      return response.user;
    }
    
    throw new Error('Token verification failed');
  } catch (error) {
    clearAuthToken();
    throw error;
  }
};

export const getCurrentUser = async () => {
  try {
    const response = await apiCall(API_ENDPOINTS.GET_ME);
    
    if (response.success && response.user) {
      localStorage.setItem('user_data', JSON.stringify(response.user));
      return response.user;
    }
    
    throw new Error('Failed to get current user');
  } catch (error) {
    console.error('Get current user failed:', error);
    clearAuthToken();
    throw error;
  }
};

// FIXED: Code analysis function with fallback
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
    // Only try localhost fallback if we're in development and production failed
    if (API_BASE_URL.includes('onrender.com') && window.location.hostname === 'localhost') {
      console.warn('🔄 Production API failed, trying localhost fallback...');
      try {
        return await fetch('http://localhost:5000/api/ai/analyze', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(getAuthToken() && { 'Authorization': `Bearer ${getAuthToken()}` }),
          },
          credentials: 'include',
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
        }).then(res => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.json();
        });
      } catch (fallbackError) {
        console.error('💥 Localhost fallback also failed:', fallbackError);
      }
    }
    throw error;
  }
};

// FIXED: User profile functions matching your backend
export const getUserProfile = async () => {
  return await apiCall(API_ENDPOINTS.GET_PROFILE);
};

export const updateUserPreferences = async (preferences) => {
  return await apiCall(API_ENDPOINTS.UPDATE_PREFERENCES, {
    method: 'POST',
    body: JSON.stringify(preferences),
  });
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
    console.log('🏥 Backend health:', response);
    return response;
  } catch (error) {
    console.error('💀 Backend health check failed:', error);
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