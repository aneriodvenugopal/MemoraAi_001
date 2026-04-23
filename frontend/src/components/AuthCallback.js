/**
 * AuthCallback Component
 * Handles Google OAuth callback with session_id in URL fragment
 * REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
 */
import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const AuthCallback = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const hasProcessed = useRef(false);

  useEffect(() => {
    // Prevent double processing in StrictMode
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const processAuth = async () => {
      try {
        // Get session_id from URL fragment (hash)
        const hash = window.location.hash;
        const sessionId = hash?.split('session_id=')[1]?.split('&')[0];

        if (!sessionId) {
          console.error('No session_id found in URL');
          toast.error('Authentication failed - no session');
          navigate('/login');
          return;
        }

        // Exchange session_id for user data
        const response = await fetch(`${API_URL}/api/auth/google/session`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ session_id: sessionId })
        });

        const data = await response.json();

        if (response.ok && data.access_token) {
          // Store token and user data
          localStorage.setItem('token', data.access_token);
          localStorage.setItem('user', JSON.stringify(data.user));
          
          // Update auth context
          await login(data.access_token, data.user);
          
          toast.success(`Welcome${data.user.is_new_user ? '! Account created' : ' back'}, ${data.user.name}!`);
          
          // Navigate to dashboard with user data (skips auth check)
          navigate('/dashboard', { 
            replace: true,
            state: { user: data.user }
          });
        } else {
          console.error('Auth failed:', data);
          toast.error(data.detail || 'Authentication failed');
          navigate('/login');
        }
      } catch (error) {
        console.error('Auth error:', error);
        toast.error('Something went wrong. Please try again.');
        navigate('/login');
      }
    };

    processAuth();
  }, [navigate, login]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <div className="text-center">
        <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
        <p className="text-gray-600 text-lg">Completing sign in...</p>
        <p className="text-gray-400 text-sm mt-2">Please wait while we set up your account</p>
      </div>
    </div>
  );
};

export default AuthCallback;
