import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth';

function AuthCallback() {
  const [status, setStatus] = useState('processing');
  const [error, setError] = useState(null);
  
  // CORRECTED: Destructure directly from useAuth() call
  const { handleAuthCallback, setUserData } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('token');
        const userString = urlParams.get('user');
        const isNewUser = urlParams.get('isNewUser') === 'true';
        const error = urlParams.get('error');
        const message = urlParams.get('message');

        console.log('AuthCallback received:', { 
          hasToken: !!token, 
          hasUser: !!userString, 
          isNewUser, 
          error, 
          message 
        });

        // Handle error cases
        if (error) {
          console.error('OAuth error:', error, message);
          setError(message || error);
          setStatus('error');
          
          // Redirect to home page after 3 seconds
          setTimeout(() => {
            navigate('/');
          }, 3000);
          return;
        }

        // Handle success case - token and user data in URL
        if (token && userString) {
          try {
            const userData = JSON.parse(decodeURIComponent(userString));
            console.log('Parsed user data:', userData);

            // Store token and user data
            localStorage.setItem('auth_token', token);
            localStorage.setItem('user_data', JSON.stringify(userData));
            
            // CORRECTED: setUserData should now be available
            if (setUserData && typeof setUserData === 'function') {
              setUserData(userData, token);
              console.log('User data set via setUserData');
            } else {
              console.warn('setUserData not available, data stored in localStorage only');
            }
            
            setStatus('success');
            console.log('Authentication successful');

            // Clear URL parameters
            window.history.replaceState({}, document.title, window.location.pathname);

            // Redirect based on user type
            setTimeout(() => {
              if (isNewUser) {
                navigate('/onboarding'); // or wherever you handle new user setup
              } else {
                navigate('/dashboard');
              }
            }, 1500);

          } catch (parseError) {
            console.error('Failed to parse user data:', parseError);
            setError('Invalid user data received from server');
            setStatus('error');
          }
        } 
        // Handle case where we need to exchange code for token
        else {
          const code = urlParams.get('code');
          const state = urlParams.get('state');

          if (code) {
            console.log('Exchanging code for token...');
            const response = await handleAuthCallback(code, state);
            
            if (response.success) {
              setStatus('success');
              console.log('Code exchange successful');
              
              setTimeout(() => {
                if (response.user?.isNewUser) {
                  navigate('/onboarding');
                } else {
                  navigate('/dashboard');
                }
              }, 1500);
            } else {
              throw new Error('Failed to exchange code for token');
            }
          } else {
            throw new Error('No authentication data received');
          }
        }

      } catch (error) {
        console.error('Auth callback error:', error);
        setError(error.message || 'Authentication failed');
        setStatus('error');
        
        // Redirect to home page after 3 seconds
        setTimeout(() => {
          navigate('/');
        }, 3000);
      }
    };

    handleCallback();
  }, [handleAuthCallback, setUserData, navigate]);

  const renderStatus = () => {
    switch (status) {
      case 'processing':
        return (
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">
              Completing Authentication...
            </h2>
            <p className="text-gray-600">Please wait while we sign you in.</p>
          </div>
        );
      
      case 'success':
        return (
          <div className="text-center">
            <div className="rounded-full h-12 w-12 bg-green-100 mx-auto mb-4 flex items-center justify-center">
              <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-green-800 mb-2">
              Authentication Successful!
            </h2>
            <p className="text-gray-600">Redirecting to your dashboard...</p>
          </div>
        );
      
      case 'error':
        return (
          <div className="text-center">
            <div className="rounded-full h-12 w-12 bg-red-100 mx-auto mb-4 flex items-center justify-center">
              <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-red-800 mb-2">
              Authentication Failed
            </h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <button 
              onClick={() => navigate('/')}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
            >
              Return Home
            </button>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        {renderStatus()}
      </div>
    </div>
  );
}

export default AuthCallback;