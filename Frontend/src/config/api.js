// src/config/api.js - FIXED VERSION
// API Configuration for Frontend

// Use production URL
const API_BASE_URL = 'https://codelens-backend-0xl0.onrender.com';

console.log('API Base URL:', API_BASE_URL);

// API endpoints
export const API_ENDPOINTS = {
  // AI Analysis endpoints
  ANALYZE_CODE: `${API_BASE_URL}/api/ai/analyze`,
  REVIEW_CODE: `${API_BASE_URL}/api/ai/review`,
  GET_LANGUAGES: `${API_BASE_URL}/api/ai/languages`,
  DETECT_LANGUAGE: `${API_BASE_URL}/api/ai/detect-language`,
  
  // Review endpoints
  GET_REVIEWS: `${API_BASE_URL}/api/reviews`,
  GET_REVIEW_HISTORY: `${API_BASE_URL}/api/reviews/history`,
  GET_REVIEW_STATS: `${API_BASE_URL}/api/reviews/stats`,
  CREATE_REVIEW: `${API_BASE_URL}/api/reviews`,
  UPDATE_REVIEW: `${API_BASE_URL}/api/reviews`,
  DELETE_REVIEW: `${API_BASE_URL}/api/reviews`,
  GET_PUBLIC_REVIEWS: `${API_BASE_URL}/api/reviews/public`,
  ANALYZE_REVIEW: `${API_BASE_URL}/api/reviews`,
  TOGGLE_FAVORITE: `${API_BASE_URL}/api/reviews`,
  INCREMENT_USAGE: `${API_BASE_URL}/api/reviews/increment`,
  
  // Auth endpoints
  GITHUB_AUTH: `${API_BASE_URL}/api/auth/github`,
  GITHUB_CALLBACK: `${API_BASE_URL}/api/auth/github/callback`,
  VERIFY_TOKEN: `${API_BASE_URL}/api/auth/verify-token`,
  GET_ME: `${API_BASE_URL}/api/auth/me`,
  LOGOUT: `${API_BASE_URL}/api/auth/logout`,
  
  // User endpoints
  GET_PROFILE: `${API_BASE_URL}/api/users/profile`,
  UPDATE_PREFERENCES: `${API_BASE_URL}/api/users/preferences`,
  UPDATE_PROFILE: `${API_BASE_URL}/api/users/profile`,
  GET_DASHBOARD: `${API_BASE_URL}/api/users/dashboard`,
  GET_ACTIVITY: `${API_BASE_URL}/api/users/activity`,
  GET_USER_HISTORY: `${API_BASE_URL}/api/users/history`,
  UPGRADE_PLAN: `${API_BASE_URL}/api/users/upgrade`,
  
  // Payment endpoints
  CREATE_CHECKOUT_SESSION: `${API_BASE_URL}/api/payments/create-checkout-session`,
  SUBSCRIPTION_STATUS: `${API_BASE_URL}/api/payments/subscription-status`,
  BILLING_PORTAL: `${API_BASE_URL}/api/payments/billing-portal`,
  
  // Health check
  HEALTH: `${API_BASE_URL}/health`
};

// FIXED: Simplified token management - use only 'auth_token'
const getAuthToken = () => {
  return localStorage.getItem('auth_token');
};

const setAuthToken = (token) => {
  if (token) {
    localStorage.setItem('auth_token', token);
    console.log('Token stored successfully');
  }
};

const clearAuthToken = () => {
  localStorage.removeItem('auth_token');
  localStorage.removeItem('token'); // Clean up any legacy tokens
  localStorage.removeItem('user_data');
  localStorage.removeItem('user');
  console.log('Tokens cleared');
};

// FIXED: Token validation helper
const isTokenValid = (token) => {
  if (!token) return false;
  
  try {
    // For JWT tokens, check expiration
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp * 1000 > Date.now();
  } catch {
    // For non-JWT tokens, assume valid if exists
    return true;
  }
};

// FIXED: Improved API call function with proper error handling
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
    
    console.log(`📡 Response [${response.status}]:`, response.statusText);
    
    // Handle different status codes
    if (response.status === 401) {
      console.log('Authentication failed - clearing tokens');
      clearAuthToken();
      throw new Error('Authentication required. Please sign in again.');
    }
    
    if (response.status === 404) {
      console.error(`Endpoint not found: ${endpoint}`);
      throw new Error('API endpoint not found');
    }

    if (response.status === 403) {
      console.error('Forbidden - insufficient permissions');
      throw new Error('Access denied. Insufficient permissions.');
    }

    if (response.status >= 500) {
      console.error('Server error');
      throw new Error('Server error. Please try again later.');
    }

    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
        console.error(`API Error [${response.status}]:`, errorData);
      } catch (e) {
        const errorText = await response.text();
        console.error(`API Error [${response.status}]:`, errorText);
        errorData = { message: errorText || `HTTP ${response.status}` };
      }
      
      throw new Error(errorData.message || errorData.error || `API Error: ${response.status}`);
    }

    const data = await response.json();
    console.log('✅ API Call successful');
    return data;
    
  } catch (error) {
    console.error('❌ API Call Failed:', error);
    
    // Network errors
    if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
      throw new Error('Network error. Please check your internet connection.');
    }
    
    throw error;
  }
};

// Code analysis function
export const analyzeCode = async (code, language, options = {}) => {
  try {
    console.log('Analyzing code...');
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

// Review history functions
export const getReviewHistory = async (page = 1, limit = 50) => {
  try {
    console.log('Fetching review history...');
    return await apiCall(`${API_ENDPOINTS.GET_REVIEW_HISTORY}?page=${page}&limit=${limit}`);
  } catch (error) {
    console.error('Failed to fetch review history:', error);
    throw error;
  }
};

export const getReviewStats = async () => {
  try {
    console.log('Fetching review statistics...');
    return await apiCall(API_ENDPOINTS.GET_REVIEW_STATS);
  } catch (error) {
    console.error('Failed to fetch review stats:', error);
    throw error;
  }
};

// Review management functions
export const getReviews = async (options = {}) => {
  const { page = 1, limit = 10, language, status, search } = options;
  let endpoint = `${API_ENDPOINTS.GET_REVIEWS}?page=${page}&limit=${limit}`;
  
  if (language) endpoint += `&language=${encodeURIComponent(language)}`;
  if (status) endpoint += `&status=${encodeURIComponent(status)}`;
  if (search) endpoint += `&search=${encodeURIComponent(search)}`;
  
  return await apiCall(endpoint);
};

export const createReview = async (reviewData) => {
  return await apiCall(API_ENDPOINTS.CREATE_REVIEW, {
    method: 'POST',
    body: JSON.stringify(reviewData),
  });
};

export const updateReview = async (reviewId, updates) => {
  return await apiCall(`${API_ENDPOINTS.UPDATE_REVIEW}/${reviewId}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
};

export const deleteReview = async (reviewId) => {
  return await apiCall(`${API_ENDPOINTS.DELETE_REVIEW}/${reviewId}`, {
    method: 'DELETE',
  });
};

export const analyzeReview = async (reviewId) => {
  return await apiCall(`${API_ENDPOINTS.ANALYZE_REVIEW}/${reviewId}/analyze`, {
    method: 'POST',
  });
};

export const toggleFavorite = async (reviewId) => {
  return await apiCall(`${API_ENDPOINTS.TOGGLE_FAVORITE}/${reviewId}/favorite`, {
    method: 'POST',
  });
};

export const getPublicReviews = async (options = {}) => {
  const { page = 1, limit = 10, language } = options;
  let endpoint = `${API_ENDPOINTS.GET_PUBLIC_REVIEWS}?page=${page}&limit=${limit}`;
  
  if (language) endpoint += `&language=${encodeURIComponent(language)}`;
  
  return await apiCall(endpoint);
};

export const incrementReviewUsage = async () => {
  return await apiCall(API_ENDPOINTS.INCREMENT_USAGE, {
    method: 'POST',
  });
};

// User preferences function - FIXED to handle backend response structure
export const updateUserPreferences = async (preferences) => {
  try {
    console.log('Saving user preferences...');
    const response = await apiCall(API_ENDPOINTS.UPDATE_PREFERENCES, {
      method: 'POST',
      body: JSON.stringify(preferences),
    });
    console.log('Preferences saved');
    return response;
  } catch (error) {
    console.error('Failed to save preferences:', error);
    throw error;
  }
};

// Authentication function - FIXED
export const authenticateUser = async (token) => {
  try {
    // Validate token before storing
    if (!isTokenValid(token)) {
      throw new Error('Invalid or expired token');
    }
    
    const response = await apiCall(API_ENDPOINTS.VERIFY_TOKEN, {
      method: 'POST',
      body: JSON.stringify({ token }),
    });
    
    // Handle the response structure from your backend
    const userData = response.user || response;
    
    if (userData && userData.id) {
      setAuthToken(token);
      localStorage.setItem('user_data', JSON.stringify(userData));
      console.log('User authenticated successfully');
      return userData;
    }
    
    throw new Error('Invalid response format from server');
  } catch (error) {
    console.error('Authentication failed:', error);
    clearAuthToken();
    throw error;
  }
};

// FIXED: Get user profile function to handle backend response structure
export const getUserProfile = async () => {
  try {
    console.log('Fetching user profile...');
    const response = await apiCall(API_ENDPOINTS.GET_PROFILE);
    
    // Your backend returns { success: true, user: {...}, statistics: {...} }
    if (response.success && response.user) {
      const userData = response.user;
      localStorage.setItem('user_data', JSON.stringify(userData));
      console.log('User profile retrieved successfully');
      return userData;
    }
    
    // Fallback for direct user data response
    if (response.id) {
      localStorage.setItem('user_data', JSON.stringify(response));
      return response;
    }
    
    throw new Error('No user data received');
  } catch (error) {
    console.error('Failed to fetch user profile:', error);
    throw error;
  }
};

// Get current user function - FIXED
export const getCurrentUser = async () => {
  try {
    const response = await apiCall(API_ENDPOINTS.GET_PROFILE);
    
    // Handle your backend's response structure
    const userData = response.success ? response.user : response;
    
    if (userData && userData.id) {
      localStorage.setItem('user_data', JSON.stringify(userData));
      console.log('Current user retrieved');
      return userData;
    }
    
    throw new Error('No user data received');
  } catch (error) {
    console.error('Get current user failed:', error);
    if (error.message.includes('Authentication required') || 
        error.message.includes('Invalid token')) {
      clearAuthToken();
    }
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

export const getUserHistory = async (page = 1, limit = 20) => {
  return await apiCall(`${API_ENDPOINTS.GET_USER_HISTORY}?page=${page}&limit=${limit}`);
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
    console.log('Logout successful');
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
    console.log('Backend health check passed:', response);
    return response;
  } catch (error) {
    console.error('Backend health check failed:', error);
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
  getReviewHistory,
  getReviewStats,
  getReviews,
  createReview,
  updateReview,
  deleteReview,
  analyzeReview,
  toggleFavorite,
  getPublicReviews,
  incrementReviewUsage,
  logoutUser,
  checkHealth,
  getAuthToken,
  setAuthToken,
  clearAuthToken,
  API_BASE_URL
};