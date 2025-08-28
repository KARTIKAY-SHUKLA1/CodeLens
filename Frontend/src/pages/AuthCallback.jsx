import React, { useEffect, useState } from 'react';
import { API_ENDPOINTS } from "../config/api";

const AuthCallback = ({ onNavigate, onAuthSuccess }) => {
  const [status, setStatus] = useState('processing');
  const [error, setError] = useState(null);

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

        // ADDED: Handle auth error redirects from backend
        if (urlError) {
          console.error('Auth error from backend:', urlError, errorMessage);
          setError(errorMessage || `Authentication failed: ${urlError}`);
          setStatus('error');
          
          // Auto redirect after showing error
          setTimeout(() => {
            if (onNavigate) {
              onNavigate('home');
            }
            window.history.replaceState({}, document.title, window.location.pathname);
          }, 4000);
          return;
        }

        // ADDED: Handle successful auth redirect from backend (with token in URL)
        if (token && userDataParam) {
          console.log('Direct auth success from backend redirect');
          try {
            const userData = JSON.parse(decodeURIComponent(userDataParam));
            
            // Store auth data
            localStorage.setItem('auth_token', token);
            localStorage.setItem('user_data', JSON.stringify(userData));
            
            setStatus('success');
            
            // Call auth success callback
            if (onAuthSuccess) {
              try {
                await onAuthSuccess(userData);
              } catch (callbackError) {
                console.warn('Auth success callback failed:', callbackError);
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
            setError('Failed to process authentication data');
            setStatus('error');
            return;
          }
        }

        // Original OAuth callback handling (code-based)
        if (code) {
          console.log('Processing OAuth callback with code');
          setStatus('authenticating');

          const response = await fetch(API_ENDPOINTS.GITHUB_CALLBACK, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              code,
              ...(state && { state })
            })
          });

          if (!response.ok) {
            let errorMessage;
            try {
              const errorData = await response.json();
              errorMessage = errorData.message || errorData.error || `HTTP ${response.status}`;
            } catch (e) {
              errorMessage = `Authentication failed with status ${response.status}`;
            }
            throw new Error(errorMessage);
          }

          const data = await response.json();
          console.log('Auth callback response:', data);

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
          
          if (onAuthSuccess) {
            try {
              await onAuthSuccess(data.user);
            } catch (callbackError) {
              console.warn('Auth success callback failed:', callbackError);
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
        console.error('Invalid auth callback - no code or token found');
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
        
        setTimeout(() => {
          if (onNavigate) {
            onNavigate('home');
          }
          window.history.replaceState({}, document.title, window.location.pathname);
        }, 4000);
      }
    };

    handleCallback();
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
              Processing authentication...
            </h2>
            <p className="text-gray-600 mt-2">
              Please wait while we verify your GitHub account
            </p>
          </div>
        );

      case 'authenticating':
        return (
          <div className="text-center">
            <LoadingSpinner />
            <h2 className="text-xl font-semibold text-gray-800 mt-4">
              Signing you in...
            </h2>
            <p className="text-gray-600 mt-2">
              Creating your CodeLens profile
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
            <p className="text-green-600 mt-2">
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
            <p className="text-red-600 mt-2 mb-4">
              {error || 'Something went wrong during authentication'}
            </p>
            
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-left">
              <p className="text-red-700 font-medium mb-1">Common solutions:</p>
              <ul className="text-red-600 text-xs space-y-1">
                <li>• Clear your browser cookies and try again</li>
                <li>• Make sure you're connected to the internet</li>
                <li>• Try signing in again from the home page</li>
                <li>• Contact support if the problem persists</li>
              </ul>
            </div>
            
            <p className="text-gray-500 text-sm mt-4">
              Redirecting to home page in a few seconds...
            </p>
            
            <div className="flex gap-2 justify-center mt-4">
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
        return null;
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