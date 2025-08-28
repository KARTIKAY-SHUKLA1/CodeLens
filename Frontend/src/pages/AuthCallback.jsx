// src/pages/AuthCallback.jsx - CORRECTED VERSION
import React, { useEffect, useState } from 'react';
import { API_ENDPOINTS } from "../config/api";

const AuthCallback = ({ onNavigate, onAuthSuccess }) => {
  const [status, setStatus] = useState('processing');
  const [error, setError] = useState(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get URL params
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const state = urlParams.get('state');
        const token = urlParams.get('token');
        const userDataParam = urlParams.get('user');
        const isNewUser = urlParams.get('isNewUser') === 'true';
        const urlError = urlParams.get('error');
        const errorMessage = urlParams.get('message');

        console.log('AuthCallback - URL params:', { 
          code: !!code, 
          state: !!state, 
          token: !!token, 
          userData: !!userDataParam,
          isNewUser,
          urlError,
          errorMessage
        });

        // ENHANCED: Handle different types of auth errors from backend
        if (urlError) {
          console.error('Auth error from backend:', urlError, errorMessage);
          
          let userFriendlyMessage = errorMessage;
          let shouldRetry = false;
          
          switch (urlError) {
            case 'invalid_state':
              userFriendlyMessage = 'Security validation failed. This may happen if you waited too long or opened multiple sign-in tabs.';
              shouldRetry = true;
              break;
            case 'state_expired':
              userFriendlyMessage = 'Sign-in session expired. Please try again.';
              shouldRetry = true;
              break;
            case 'no_code':
              userFriendlyMessage = 'GitHub did not provide authorization. Please try signing in again.';
              shouldRetry = true;
              break;
            case 'token_exchange_failed':
              userFriendlyMessage = 'Failed to connect with GitHub. Please try again.';
              shouldRetry = true;
              break;
            case 'database_error':
              userFriendlyMessage = 'Database error occurred. Please try again or contact support.';
              shouldRetry = true;
              break;
            case 'callback_failed':
              userFriendlyMessage = 'Authentication failed due to server error. Please try again.';
              shouldRetry = true;
              break;
            default:
              userFriendlyMessage = errorMessage || `Authentication failed: ${urlError}`;
              shouldRetry = true;
          }
          
          setError(userFriendlyMessage);
          setMessage(shouldRetry ? 'You can try signing in again.' : '');
          setStatus('error');
          
          // Auto redirect after showing error
          setTimeout(() => {
            if (onNavigate) {
              onNavigate('home');
            }
            window.history.replaceState({}, document.title, window.location.pathname);
          }, 5000);
          return;
        }

        // ENHANCED: Handle successful auth redirect from backend (with token in URL)
        if (token && userDataParam) {
          console.log('Direct auth success from backend redirect');
          setStatus('authenticating');
          
          try {
            const userData = JSON.parse(decodeURIComponent(userDataParam));
            
            // Validate user data
            if (!userData.id || !userData.name) {
              throw new Error('Invalid user data received from server');
            }
            
            // Store auth data
            localStorage.setItem('auth_token', token);
            localStorage.setItem('user_data', JSON.stringify(userData));
            
            setStatus('success');
            setMessage(isNewUser ? 'Welcome to CodeLens!' : 'Welcome back!');
            
            // Call auth success callback
            if (onAuthSuccess) {
              try {
                await onAuthSuccess(userData);
              } catch (callbackError) {
                console.warn('Auth success callback failed:', callbackError);
                // Don't fail the whole auth process if callback fails
              }
            }
            
            // Redirect to dashboard
            setTimeout(() => {
              if (onNavigate) {
                onNavigate('dashboard');
              }
              window.history.replaceState({}, document.title, window.location.pathname);
            }, 1500);
            
            return;
          } catch (parseError) {
            console.error('Failed to parse user data from URL:', parseError);
            setError('Failed to process authentication data from server');
            setStatus('error');
            setTimeout(() => {
              if (onNavigate) {
                onNavigate('home');
              }
              window.history.replaceState({}, document.title, window.location.pathname);
            }, 4000);
            return;
          }
        }

        // Original OAuth callback handling (code-based)
        if (code) {
          console.log('Processing OAuth callback with authorization code');
          setStatus('authenticating');
          setMessage('Exchanging authorization code for access token...');

          const response = await fetch(API_ENDPOINTS.GITHUB_CALLBACK, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include', // Include cookies for session
            body: JSON.stringify({
              code,
              ...(state && { state })
            })
          });

          if (!response.ok) {
            let errorMessage;
            try {
              const errorData = await response.json();
              console.error('API callback error:', errorData);
              
              // Handle specific API errors
              switch (errorData.error) {
                case 'INVALID_STATE':
                  errorMessage = 'Security validation failed. Please try signing in again.';
                  break;
                case 'TOKEN_EXCHANGE_FAILED':
                  errorMessage = 'Failed to connect with GitHub. Please check your connection and try again.';
                  break;
                case 'USER_DATA_FAILED':
                  errorMessage = 'Failed to retrieve your GitHub profile. Please try again.';
                  break;
                case 'AUTH_FAILED':
                  errorMessage = 'Authentication failed. Please try again.';
                  break;
                default:
                  errorMessage = errorData.message || errorData.error || `HTTP ${response.status}`;
              }
            } catch (e) {
              errorMessage = `Authentication failed with status ${response.status}`;
            }
            throw new Error(errorMessage);
          }

          const data = await response.json();
          console.log('Auth callback response success:', { 
            hasToken: !!data.token, 
            hasUser: !!data.user,
            isNewUser: data.isNewUser 
          });

          if (!data.success) {
            throw new Error(data.message || 'Authentication was not successful');
          }

          if (!data.token) {
            throw new Error('No authentication token received from server');
          }

          if (!data.user) {
            throw new Error('No user data received from server');
          }

          // Store the JWT token and user data
          localStorage.setItem('auth_token', data.token);
          localStorage.setItem('user_data', JSON.stringify(data.user));

          setStatus('success');
          setMessage(data.isNewUser ? 'Account created successfully!' : 'Welcome back!');
          
          if (onAuthSuccess) {
            try {
              await onAuthSuccess(data.user);
            } catch (callbackError) {
              console.warn('Auth success callback failed:', callbackError);
              // Don't fail the whole auth process if callback fails
            }
          }
          
          setTimeout(() => {
            if (onNavigate) {
              onNavigate('dashboard');
            }
            window.history.replaceState({}, document.title, window.location.pathname);
          }, 1500);

          return;
        }

        // No code, token, or error - invalid callback
        console.error('Invalid auth callback - no authorization data found');
        setError('Invalid authentication callback. Please try signing in again.');
        setStatus('error');
        
        setTimeout(() => {
          if (onNavigate) {
            onNavigate('home');
          }
          window.history.replaceState({}, document.title, window.location.pathname);
        }, 4000);

      } catch (error) {
        console.error('Auth callback error:', error);
        
        // Clear any partial auth data
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user_data');
        
        setError(error.message);
        setStatus('error');
        setMessage('Please try signing in again from the home page.');
        
        setTimeout(() => {
          if (onNavigate) {
            onNavigate('home');
          }
          window.history.replaceState({}, document.title, window.location.pathname);
        }, 5000);
      }
    };

    // Small delay to ensure DOM is ready
    const timer = setTimeout(handleCallback, 100);
    return () => clearTimeout(timer);
  }, [onNavigate, onAuthSuccess]);

  // Simple CSS loading spinner
  const LoadingSpinner = () => (
    <div className="flex justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>
  );

  const renderContent = () => {
    switch (status) {
      case 'processing':
        return (
          <div className="text-center">
            <LoadingSpinner />
            <h2 className="text-xl font-semibold text-gray-800 mt-4">
              Processing Authentication
            </h2>
            <p className="text-gray-600 mt-2">
              Validating your GitHub credentials...
            </p>
          </div>
        );

      case 'authenticating':
        return (
          <div className="text-center">
            <LoadingSpinner />
            <h2 className="text-xl font-semibold text-gray-800 mt-4">
              Signing You In
            </h2>
            <p className="text-gray-600 mt-2">
              {message || 'Creating your CodeLens profile...'}
            </p>
          </div>
        );

      case 'success':
        return (
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-green-800 mt-4">
              Authentication Successful!
            </h2>
            <p className="text-green-600 mt-2 mb-2">
              {message || 'You have been signed in successfully.'}
            </p>
            <p className="text-gray-500 text-sm">
              Redirecting to your dashboard...
            </p>
          </div>
        );

      case 'error':
        return (
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-red-800 mt-4">
              Authentication Failed
            </h2>
            <p className="text-red-600 mt-2 mb-4 text-sm max-w-md mx-auto">
              {error || 'Something went wrong during authentication'}
            </p>
            
            {message && (
              <p className="text-gray-600 text-sm mb-4">
                {message}
              </p>
            )}
            
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-left max-w-md mx-auto mb-4">
              <p className="text-red-700 font-medium mb-2">Troubleshooting tips:</p>
              <ul className="text-red-600 text-xs space-y-1 list-disc list-inside">
                <li>Clear your browser cookies and try again</li>
                <li>Make sure you're connected to the internet</li>
                <li>Try using an incognito/private browser window</li>
                <li>Disable browser extensions temporarily</li>
                <li>Contact support if the problem persists</li>
              </ul>
            </div>
            
            <p className="text-gray-500 text-sm mb-4">
              Redirecting to home page in a few seconds...
            </p>
            
            <div className="flex gap-2 justify-center">
              <button
                onClick={() => onNavigate && onNavigate('home')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
              >
                Go to Home
              </button>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm"
              >
                Try Again
              </button>
            </div>
          </div>
        );

      default:
        return (
          <div className="text-center">
            <p className="text-gray-600">Loading...</p>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
        <div className="flex items-center justify-center mb-8">
          <div className="text-2xl font-bold text-blue-600">CodeLens</div>
        </div>
        {renderContent()}
      </div>
    </div>
  );
};

export default AuthCallback;