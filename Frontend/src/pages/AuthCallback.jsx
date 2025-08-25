import { API_ENDPOINTS } from "../config/api";
import React, { useEffect, useState } from 'react';

const AuthCallback = ({ onNavigate, onAuthSuccess }) => {
  const [status, setStatus] = useState('processing');
  const [error, setError] = useState(null);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get the authorization code from URL params
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const state = urlParams.get('state');
        const error = urlParams.get('error');

        if (error) {
          throw new Error(`OAuth Error: ${error}`);
        }

        if (!code) {
          throw new Error('Authorization code not found');
        }

        console.log('Processing OAuth callback with code:', code);
        setStatus('authenticating');

        // Send the code to your backend
        const response = await fetch(`${API_ENDPOINTS.GITHUB_CALLBACK}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            code,
            state
          })
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || 'Authentication failed');
        }

        // Store the JWT token
        if (data.token) {
          localStorage.setItem('auth_token', data.token);
          localStorage.setItem('user_data', JSON.stringify(data.user));
        }

        setStatus('success');
        
        // Call the auth success callback to refresh user state
        if (onAuthSuccess) {
          onAuthSuccess(data.user);
        }
        
        // Redirect to dashboard after a brief delay
        setTimeout(() => {
          onNavigate('dashboard');
          // Clean up URL params after successful auth
          window.history.replaceState({}, document.title, window.location.pathname);
        }, 1500);

      } catch (error) {
        console.error('Auth callback error:', error);
        setError(error.message);
        setStatus('error');
        
        // Redirect to home page after error
        setTimeout(() => {
          onNavigate('home');
          // Clean up URL params after error
          window.history.replaceState({}, document.title, window.location.pathname);
        }, 3000);
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
            <p className="text-red-600 mt-2">
              {error || 'Something went wrong during authentication'}
            </p>
            <p className="text-gray-500 text-sm mt-3">
              Redirecting to home page...
            </p>
            <button
              onClick={() => onNavigate('home')}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Go to Home
            </button>
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