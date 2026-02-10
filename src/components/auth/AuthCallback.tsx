import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

export const AuthCallback: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleAuthCallback = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const errorParam = urlParams.get('error');
      const errorDescription = urlParams.get('error_description');
      
      if (errorParam) {
        let errorMessage = 'OAuth authentication failed.';
        
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
          const userMetadata = data.session.user?.app_metadata;
          const isClubAccount = userMetadata?.user_type === 'club_account';
          
          if (isClubAccount) {
            window.history.pushState({}, '', '/club-account');
          } else {
            window.history.pushState({}, '', '/');
          }
          window.dispatchEvent(new PopStateEvent('popstate'));
        } else {
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
      <div className="min-h-screen flex items-center justify-center bg-[#FBF9F5]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#d47455]"></div>
      </div>
    );
  }

  return null;
};
