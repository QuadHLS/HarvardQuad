import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

export const AuthCallback: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleAuthCallback = async () => {
      // Check for OAuth errors in URL parameters
      const urlParams = new URLSearchParams(window.location.search);
      const errorParam = urlParams.get('error');
      const errorDescription = urlParams.get('error_description');
      
      if (errorParam) {
        let errorMessage = 'OAuth authentication failed.';
        
        // Provide specific error messages based on OAuth error codes
        switch (errorParam) {
          case 'access_denied':
            errorMessage = 'Google login was cancelled or denied. Please try again.';
            break;
          case 'server_error':
            errorMessage = 'Server error during Google login. Please try again.';
            break;
          case 'temporarily_unavailable':
            errorMessage = 'Google login is temporarily unavailable. Please try again later.';
            break;
          default:
            errorMessage = errorDescription || 'Google login failed. Please try again.';
        }
        
        // Redirect to login page with error message
        const encodedError = encodeURIComponent(errorMessage);
        window.history.pushState({}, '', `/auth?error=${encodedError}`);
        window.dispatchEvent(new PopStateEvent('popstate'));
        return;
      }
      
      try {
        const { data, error } = await supabase.auth.getSession();

        if (error) {
          setError(error.message);
          return;
        }

        if (data.session) {
          // Check if user is a club account
          const userMetadata = data.session.user?.app_metadata;
          const isClubAccount = userMetadata?.user_type === 'club_account';
          
          // Redirect club accounts to their dedicated page
          if (isClubAccount) {
            window.history.pushState({}, '', '/club-account');
          } else {
            // Regular users go to main app
          window.history.pushState({}, '', '/');
          }
          window.dispatchEvent(new PopStateEvent('popstate'));
        } else {
          // No session, redirect to login
          window.history.pushState({}, '', '/');
          window.dispatchEvent(new PopStateEvent('popstate'));
        }
      } catch (err) {
        console.error('AuthCallback: Error processing callback:', err instanceof Error ? err.message : "Unknown error");
        setError('An unexpected error occurred');
      } finally {
        setLoading(false);
      }
    };

    handleAuthCallback();
  }, []);

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center z-50 fade-in-overlay" style={{ backgroundColor: '#faf3ef' }}>
        <div className="text-center">
          <img
            src="/QUAD.svg"
            alt="Quad Logo"
            className="w-24 h-24 mx-auto"
          />
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-700 mx-auto mt-4"></div>
        </div>
      </div>
    );
  }


  return null;
};
