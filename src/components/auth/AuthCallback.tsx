import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

export const AuthCallback: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nativeReturnUrl, setNativeReturnUrl] = useState<string | null>(null);

  useEffect(() => {
    const handleAuthCallback = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      // When opened in-app browser from native: try to open app automatically, no screen if possible
      if (urlParams.get('native') === '1' && window.location.hash) {
        const returnUrl = `harvardquad://auth/callback${window.location.hash}`;
        const tryOpenApp = () => {
          try {
            window.location.href = returnUrl;
            window.close();
          } catch {
            // ignore
          }
        };
        tryOpenApp();
        setTimeout(tryOpenApp, 100);
        setTimeout(tryOpenApp, 400);
        // Hidden iframe sometimes triggers scheme open in in-app browsers
        try {
          const iframe = document.createElement('iframe');
          iframe.style.display = 'none';
          iframe.src = returnUrl;
          document.body.appendChild(iframe);
          setTimeout(() => document.body.removeChild(iframe), 500);
        } catch {
          // ignore
        }
        // Only show "Open Harvard Quad" button if still here after 2.5s (redirect was blocked)
        setTimeout(() => {
          setNativeReturnUrl(returnUrl);
          setLoading(false);
        }, 2500);
        return;
      }
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
      <div className="landing-bg fixed inset-0 flex items-center justify-center z-50 fade-in-overlay">
        <div className="text-center">
          <img
            src="/QUAD.svg"
            alt="Quad Logo"
            className="w-24 h-24 mx-auto"
          />
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#27251f] mx-auto mt-4"></div>
        </div>
      </div>
    );
  }

  // Fallback: redirect was blocked, show tappable control so tap opens app
  if (nativeReturnUrl) {
    return (
      <div className="landing-bg fixed inset-0 flex flex-col items-center justify-center p-6">
        <img src="/QUAD.svg" alt="Quad" className="w-20 h-20 mb-6" />
        <p className="text-[#27251f] font-medium text-center mb-8">
          You’re signed in. Tap below to return to the app.
        </p>
        <a
          href={nativeReturnUrl}
          onClick={(e) => {
            e.preventDefault();
            window.location.href = nativeReturnUrl;
          }}
          className="inline-block bg-[#27251f] text-[#f7f8f3] font-medium px-8 py-4 rounded-lg no-underline hover:bg-[#27251f]/90 cursor-pointer"
        >
          Open Harvard Quad
        </a>
      </div>
    );
  }

  return null;
};
