import React, { useState } from 'react';
import { ChevronRight, Mail, Lock, User } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

interface AuthScreenProps {
  onBack?: () => void;
}

export function AuthScreensStandalone({ onBack }: AuthScreenProps) {
  const { signIn, signInWithGoogle, resetPassword } = useAuth();
  const [mode, setMode] = useState<'welcome' | 'choose-signup' | 'signin' | 'signup' | 'forgot'>('welcome');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setLoading(true);
    const { error: err } = await signIn(email.trim(), password);
    setLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/validate-harvard-email`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({ email: email.trim() }),
        }
      );
      const result = await response.json();
      if (!result.success) {
        setError(result.error || 'Please use your Harvard Law School email address.');
        setLoading(false);
        return;
      }
      const { error: err } = await supabase.auth.signUp({
        email: email.toLowerCase().trim(),
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: { full_name: fullName.trim() || undefined },
        },
      });
      setLoading(false);
      if (err) {
        setError(err.message);
        return;
      }
      setError('');
      setSuccessMessage('Check your email to confirm your account, then sign in.');
      setMode('signin');
    } catch {
      setLoading(false);
      setError('Unable to create account. Please try again.');
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setLoading(true);
    const { error: err } = await resetPassword(email.trim());
    setLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    setError('');
    setSuccessMessage('Check your email for the reset link.');
    setMode('signin');
    setEmail('');
    setPassword('');
  };

  if (mode === 'welcome') {
    return (
      <div
        className="landing-bg flex flex-col overflow-hidden"
        style={{
          minHeight: 'var(--app-height, 100vh)',
          height: 'var(--app-height, 100vh)',
          maxHeight: 'var(--app-height, 100vh)',
          paddingTop: 'env(safe-area-inset-top)',
          paddingBottom: 'env(safe-area-inset-bottom)',
          paddingLeft: 'env(safe-area-inset-left)',
          paddingRight: 'env(safe-area-inset-right)',
        }}
      >
        {/* Header - back top left, then logo */}
        <div className="px-6 pt-6 pb-4 flex-shrink-0 w-full">
          {onBack && (
            <button
              onClick={onBack}
              className="text-sm text-[#787771] hover:text-[#27251f] px-4 py-2 rounded-full bg-white/50 hover:bg-white/70 transition-colors -ml-2"
            >
              ← Back
            </button>
          )}
          <div className="w-full flex items-center justify-center" style={{ paddingTop: '1.5rem' }}>
            <img 
              src="/QUAD.svg" 
              alt="Quad Logo" 
              className="w-28 h-28 object-contain mx-auto"
            />
          </div>
        </div>

        {/* Content - less top padding to balance logo moving down so heading/buttons stay in place */}
        <div
          className="flex-1 flex flex-col items-center justify-start px-6 pb-10 min-h-0 bg-transparent"
          style={{ paddingTop: '5rem' }}
        >
          <h1 
            className="text-4xl text-center text-[#27251f] mb-4" 
            style={{ fontWeight: 600 }}
          >
            Welcome to<br />Quad
          </h1>
          <p 
            className="text-base text-center text-[#787771] mb-10 max-w-sm leading-relaxed" 
          >
            Your all-in-one platform for classes, collaboration, and community
          </p>

          <div className="w-full flex justify-center" style={{ marginTop: '0' }}>
            <div className="space-y-4 shrink-0" style={{ width: '440px', maxWidth: 'calc(100vw - 48px)' }}>
              <button
                onClick={() => { setError(''); setSuccessMessage(''); setMode('signin'); }}
                className="w-full px-6 py-5 rounded-full border-2 border-[#d47455] bg-transparent text-[#27251f] hover:bg-[#d47455]/10 transition-colors"
                style={{ fontWeight: 600 }}
              >
                Sign In
              </button>

              <button
                onClick={() => { setError(''); setSuccessMessage(''); setMode('choose-signup'); }}
                className="w-full flex items-center justify-center gap-2 px-6 py-5 rounded-full bg-[#d47455] text-white hover:bg-[#c26645] transition-colors shadow-sm"
                style={{ fontWeight: 600 }}
              >
                Create Account
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Footer - terms */}
        <div className="px-6 pt-2 pb-6 flex-shrink-0 bg-transparent">
          <p className="text-xs text-[#787771] text-center w-full" >
            By continuing, you agree to our{' '}
            <a href="/terms" className="text-[#d47455] hover:underline">
              Terms of Service
            </a>
            {' '}and{' '}
            <a href="/privacy" className="text-[#d47455] hover:underline">
              Privacy Policy
            </a>
          </p>
        </div>
      </div>
    );
  }

  if (mode === 'choose-signup') {
    return (
      <div
        className="landing-bg flex flex-col overflow-hidden"
        style={{
          minHeight: 'var(--app-height, 100vh)',
          height: 'var(--app-height, 100vh)',
          maxHeight: 'var(--app-height, 100vh)',
          paddingTop: 'env(safe-area-inset-top)',
          paddingBottom: 'env(safe-area-inset-bottom)',
          paddingLeft: 'env(safe-area-inset-left)',
          paddingRight: 'env(safe-area-inset-right)',
        }}
      >
        <div className="px-6 pt-6 pb-4 flex-shrink-0 w-full">
          <button
            onClick={() => { setError(''); setSuccessMessage(''); setMode('welcome'); }}
            className="text-sm text-[#787771] hover:text-[#27251f] px-4 py-2 rounded-full bg-white/50 hover:bg-white/70 transition-colors -ml-2"
          >
            ← Back
          </button>
        </div>
        <div
          className="flex-1 flex flex-col items-center justify-start px-6 pb-10 min-h-0 bg-transparent"
          style={{ paddingTop: '6.5rem' }}
        >
          <h1
            className="text-3xl text-center text-[#27251f] mb-2"
            style={{ fontWeight: 600 }}
          >
            Create your account
          </h1>
          <p
            className="text-sm text-center text-[#787771] mb-8 max-w-sm mt-6"
          >
            Continue with Google or sign up with your email
          </p>
          {error && (
            <p className="text-sm text-red-600 mb-4 w-full max-w-sm text-center" >
              {error}
            </p>
          )}
          <div className="w-full max-w-sm space-y-4 mt-32">
            <div className="w-full">
              <button
                type="button"
                className="gsi-material-button w-full"
                disabled={loading}
                onClick={async () => {
                  setError('');
                  setLoading(true);
                  const { error: err } = await signInWithGoogle();
                  if (err) {
                    setError(err.message);
                    setLoading(false);
                  }
                }}
              >
                <div className="gsi-material-button-state" />
                <div className="gsi-material-button-content-wrapper">
                  <div className="gsi-material-button-icon">
                    <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" xmlnsXlink="http://www.w3.org/1999/xlink" style={{ display: 'block' }}>
                      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                      <path fill="none" d="M0 0h48v48H0z" />
                    </svg>
                  </div>
                  <span className="gsi-material-button-contents">Continue with Google</span>
                  <span style={{ display: 'none' }}>Continue with Google</span>
                </div>
              </button>
            </div>
            <div className="flex items-center gap-3 my-3">
              <div className="flex-1 h-px bg-black/10" />
              <p className="text-sm text-[#787771] shrink-0" >
                or
              </p>
              <div className="flex-1 h-px bg-black/10" />
            </div>
            <button
              type="button"
              onClick={() => { setError(''); setSuccessMessage(''); setMode('signup'); }}
              className="gsi-material-button w-full"
            >
              <div className="gsi-material-button-state" />
              <div className="gsi-material-button-content-wrapper">
                <div className="gsi-material-button-icon">
                  <img src="/QUAD.svg" alt="" className="w-5 h-5 object-contain" aria-hidden />
                </div>
                <span className="gsi-material-button-contents">Continue with Quad</span>
              </div>
            </button>
          </div>
        </div>
        <style>{`
          .gsi-material-button {
            -moz-user-select: none;
            -webkit-user-select: none;
            -ms-user-select: none;
            -webkit-appearance: none;
            background-color: white;
            background-image: none;
            border: 1px solid #d1d5db;
            -webkit-border-radius: 10px;
            border-radius: 10px;
            -webkit-box-sizing: border-box;
            box-sizing: border-box;
            color: #27251f;
            cursor: pointer;
            font-family: 'Roboto', arial, sans-serif;
            font-size: 14px;
            height: 54px;
            letter-spacing: 0.25px;
            outline: none;
            overflow: hidden;
            padding: 0 12px;
            position: relative;
            text-align: center;
            -webkit-transition: background-color .218s, border-color .218s, box-shadow .218s;
            transition: background-color .218s, border-color .218s, box-shadow .218s;
            vertical-align: middle;
            white-space: nowrap;
            width: auto;
            max-width: 400px;
            min-width: min-content;
          }
          .gsi-material-button.w-full {
            width: 100%;
            max-width: 100%;
          }
          .gsi-material-button .gsi-material-button-icon {
            height: 20px;
            min-width: 20px;
            width: 20px;
          }
          .gsi-material-button .gsi-material-button-content-wrapper {
            -webkit-align-items: center;
            align-items: center;
            display: flex;
            -webkit-flex-direction: row;
            flex-direction: row;
            -webkit-flex-wrap: nowrap;
            flex-wrap: nowrap;
            height: 100%;
            justify-content: center;
            gap: 10px;
            position: relative;
            width: 100%;
          }
          .gsi-material-button .gsi-material-button-contents {
            font-family: 'Roboto', arial, sans-serif;
            font-weight: 500;
            overflow: hidden;
            text-overflow: ellipsis;
            vertical-align: top;
          }
          .gsi-material-button .gsi-material-button-state {
            -webkit-transition: opacity .218s;
            transition: opacity .218s;
            bottom: 0;
            left: 0;
            opacity: 0;
            position: absolute;
            right: 0;
            top: 0;
          }
          .gsi-material-button:disabled {
            cursor: default;
            background-color: #ffffff61;
            border-color: #e5e7eb;
          }
          .gsi-material-button:disabled .gsi-material-button-contents,
          .gsi-material-button:disabled .gsi-material-button-icon {
            opacity: 38%;
          }
          .gsi-material-button:not(:disabled):active .gsi-material-button-state,
          .gsi-material-button:not(:disabled):focus .gsi-material-button-state {
            background-color: #303030;
            opacity: 12%;
          }
          .gsi-material-button:not(:disabled):hover {
            -webkit-box-shadow: 0 1px 2px 0 rgba(60, 64, 67, .30), 0 1px 3px 1px rgba(60, 64, 67, .15);
            box-shadow: 0 1px 2px 0 rgba(60, 64, 67, .30), 0 1px 3px 1px rgba(60, 64, 67, .15);
          }
          .gsi-material-button:not(:disabled):hover .gsi-material-button-state {
            background-color: #303030;
            opacity: 8%;
          }
        `}</style>
      </div>
    );
  }

  if (mode === 'signin') {
    return (
      <div
        className="landing-bg flex flex-col overflow-hidden"
        style={{
          minHeight: 'var(--app-height, 100vh)',
          height: 'var(--app-height, 100vh)',
          maxHeight: 'var(--app-height, 100vh)',
          paddingTop: 'env(safe-area-inset-top)',
          paddingBottom: 'env(safe-area-inset-bottom)',
          paddingLeft: 'env(safe-area-inset-left)',
          paddingRight: 'env(safe-area-inset-right)',
        }}
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-4 flex-shrink-0 w-full">
          <button
            onClick={() => { setError(''); setSuccessMessage(''); setMode('welcome'); }}
            className="text-sm text-[#787771] hover:text-[#27251f] px-4 py-2 rounded-full bg-white/50 hover:bg-white/70 transition-colors -ml-2"
          >
            ← Back
          </button>
        </div>

        {/* Content - scrollable, centered container */}
        <div className="flex-1 min-h-0 overflow-y-auto flex flex-col bg-transparent">
          <div className="flex-1 px-6 py-4 max-w-sm mx-auto w-full bg-transparent">
            <h1 
              className="text-3xl text-[#27251f] mb-3 mt-0" 
              style={{ fontWeight: 600 }}
            >
              Welcome back
            </h1>
            <p 
              className="text-sm text-[#787771] mb-8" 
            >
              Sign in to continue to your dashboard
            </p>

            {error && (
              <p className="text-sm text-red-600 mb-5" >
                {error}
              </p>
            )}
            {successMessage && (
              <p className="text-sm text-primary mb-5" >
                {successMessage}
              </p>
            )}

            <form onSubmit={handleSignIn} className="space-y-6">
            <div className="w-full">
              <button
                type="button"
                className="gsi-material-button w-full"
                disabled={loading}
                onClick={async () => {
                  setError('');
                  setLoading(true);
                  const { error: err } = await signInWithGoogle();
                  if (err) {
                    setError(err.message);
                    setLoading(false);
                  }
                }}
              >
                <div className="gsi-material-button-state" />
                <div className="gsi-material-button-content-wrapper">
                  <div className="gsi-material-button-icon">
                    <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" xmlnsXlink="http://www.w3.org/1999/xlink" style={{ display: 'block' }}>
                      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                      <path fill="none" d="M0 0h48v48H0z" />
                    </svg>
                  </div>
                  <span className="gsi-material-button-contents">Continue with Google</span>
                  <span style={{ display: 'none' }}>Continue with Google</span>
                </div>
              </button>
            </div>
            <style>{`
              .gsi-material-button {
                -moz-user-select: none;
                -webkit-user-select: none;
                -ms-user-select: none;
                -webkit-appearance: none;
                background-color: white;
                background-image: none;
                border: 1px solid #d1d5db;
                -webkit-border-radius: 10px;
                border-radius: 10px;
                -webkit-box-sizing: border-box;
                box-sizing: border-box;
                color: #27251f;
                cursor: pointer;
                font-family: 'Roboto', arial, sans-serif;
                font-size: 14px;
                height: 40px;
                letter-spacing: 0.25px;
                outline: none;
                overflow: hidden;
                padding: 0 12px;
                position: relative;
                text-align: center;
                -webkit-transition: background-color .218s, border-color .218s, box-shadow .218s;
                transition: background-color .218s, border-color .218s, box-shadow .218s;
                vertical-align: middle;
                white-space: nowrap;
                width: auto;
                max-width: 400px;
                min-width: min-content;
              }
              .gsi-material-button.w-full {
                width: 100%;
                max-width: 100%;
              }
              .gsi-material-button .gsi-material-button-icon {
                height: 20px;
                min-width: 20px;
                width: 20px;
              }
              .gsi-material-button .gsi-material-button-content-wrapper {
                -webkit-align-items: center;
                align-items: center;
                display: flex;
                -webkit-flex-direction: row;
                flex-direction: row;
                -webkit-flex-wrap: nowrap;
                flex-wrap: nowrap;
                height: 100%;
                justify-content: center;
                gap: 10px;
                position: relative;
                width: 100%;
              }
              .gsi-material-button .gsi-material-button-contents {
                font-family: 'Roboto', arial, sans-serif;
                font-weight: 500;
                overflow: hidden;
                text-overflow: ellipsis;
                vertical-align: top;
              }
              .gsi-material-button .gsi-material-button-state {
                -webkit-transition: opacity .218s;
                transition: opacity .218s;
                bottom: 0;
                left: 0;
                opacity: 0;
                position: absolute;
                right: 0;
                top: 0;
              }
              .gsi-material-button:disabled {
                cursor: default;
                background-color: #ffffff61;
                border-color: #e5e7eb;
              }
              .gsi-material-button:disabled .gsi-material-button-contents,
              .gsi-material-button:disabled .gsi-material-button-icon {
                opacity: 38%;
              }
              .gsi-material-button:not(:disabled):active .gsi-material-button-state,
              .gsi-material-button:not(:disabled):focus .gsi-material-button-state {
                background-color: #303030;
                opacity: 12%;
              }
              .gsi-material-button:not(:disabled):hover {
                -webkit-box-shadow: 0 1px 2px 0 rgba(60, 64, 67, .30), 0 1px 3px 1px rgba(60, 64, 67, .15);
                box-shadow: 0 1px 2px 0 rgba(60, 64, 67, .30), 0 1px 3px 1px rgba(60, 64, 67, .15);
              }
              .gsi-material-button:not(:disabled):hover .gsi-material-button-state {
                background-color: #303030;
                opacity: 8%;
              }
            `}</style>

            <div className="flex items-center gap-3 mt-0 mb-1">
              <div className="flex-1 h-px bg-black/10" />
              <p className="text-sm text-[#787771] shrink-0" >
                or sign in with Quad
              </p>
              <div className="flex-1 h-px bg-black/10" />
            </div>

            <div>
              <label 
                className="block text-sm mb-2.5 text-[#27251f]" 
                style={{ fontWeight: 500 }}
              >
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#787771]" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your.email@law.school.edu"
                  required
                  className="w-full pl-11 pr-4 py-3 rounded-lg border border-[#e8e4db] bg-white focus:outline-none focus:ring-2 focus:ring-[#d47455] focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label 
                className="block text-sm mb-2.5 text-[#27251f]" 
                style={{ fontWeight: 500 }}
              >
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#787771]" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  className="w-full pl-11 pr-4 py-3 rounded-lg border border-[#e8e4db] bg-white focus:outline-none focus:ring-2 focus:ring-[#d47455] focus:border-transparent"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2">
                <input 
                  type="checkbox" 
                  className="w-4 h-4 rounded border-[#e8e4db] accent-[#d47455] focus:ring-[#d47455]"
                />
                <span className="text-sm text-[#787771]" >
                  Remember me
                </span>
              </label>
            <button
              type="button"
                className="text-sm text-[#787771] cursor-not-allowed"
                style={{ fontWeight: 500 }}
                disabled
                aria-label="Forgot password (coming soon)"
              >
                Forgot password?
              </button>
            </div>

            <button
              type="submit"
              className="w-full px-6 py-4 rounded-xl bg-[#d47455] text-white hover:bg-[#c26645] transition-colors shadow-sm disabled:bg-[#d47455]/70 disabled:cursor-not-allowed mt-2"
              style={{ fontWeight: 600 }}
              disabled={loading}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-3 pt-2 text-center">
            <p className="text-sm text-[#787771]" >
              Don&apos;t have an account?{' '}
              <button
                type="button"
                onClick={() => { setError(''); setSuccessMessage(''); setMode('signup'); }}
                className="text-[#d47455] hover:text-[#c26645] font-semibold"
              >
                Sign Up
              </button>
            </p>
          </div>
          </div>
        </div>
      </div>
    );
  }

  // Sign Up mode
  return (
    <div
      className="landing-bg flex flex-col overflow-hidden"
      style={{
          minHeight: 'var(--app-height, 100vh)',
          height: 'var(--app-height, 100vh)',
          maxHeight: 'var(--app-height, 100vh)',
          paddingTop: 'env(safe-area-inset-top)',
          paddingBottom: 'env(safe-area-inset-bottom)',
          paddingLeft: 'env(safe-area-inset-left)',
          paddingRight: 'env(safe-area-inset-right)',
        }}
    >
      {/* Header */}
      <div className="px-6 pt-6 pb-4 flex-shrink-0 w-full">
        <button
          onClick={() => { setError(''); setSuccessMessage(''); setMode('welcome'); }}
          className="text-sm text-[#787771] hover:text-[#27251f] px-4 py-2 rounded-lg bg-white/50 hover:bg-white/70 transition-colors -ml-2"
        >
          ← Back
        </button>
      </div>

      {/* Content - scrollable, centered container */}
      <div className="flex-1 min-h-0 overflow-y-auto flex flex-col bg-transparent">
        <div className="flex-1 px-6 py-10 max-w-sm mx-auto w-full pb-12 bg-transparent">
          <h1 
            className="text-3xl text-[#27251f] mb-3 mt-4" 
            style={{ fontWeight: 600 }}
          >
            Create your account
          </h1>
          <p 
            className="text-sm text-[#787771] mb-8" 
          >
            Join the community and get started
          </p>

          {error && (
            <p className="text-sm text-red-600 mb-5" >
              {error}
            </p>
          )}

          <form onSubmit={handleSignUp} className="space-y-6">
          <div>
            <label 
              className="block text-sm mb-2.5 text-[#27251f]" 
              style={{ fontWeight: 500 }}
            >
              Full Name
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#787771]" />
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Enter your full name"
                required
                className="w-full pl-11 pr-4 py-3 rounded-lg border border-[#e8e4db] bg-white focus:outline-none focus:ring-2 focus:ring-[#d47455] focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label 
              className="block text-sm mb-2.5 text-[#27251f]" 
              style={{ fontWeight: 500 }}
            >
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#787771]" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your.email@law.school.edu"
                required
                className="w-full pl-11 pr-4 py-3 rounded-lg border border-[#e8e4db] bg-white focus:outline-none focus:ring-2 focus:ring-[#d47455] focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label 
              className="block text-sm mb-2.5 text-[#27251f]" 
              style={{ fontWeight: 500 }}
            >
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#787771]" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Create a password"
                required
                className="w-full pl-11 pr-4 py-3 rounded-lg border border-[#e8e4db] bg-white focus:outline-none focus:ring-2 focus:ring-[#d47455] focus:border-transparent"
              />
            </div>
            <p className="text-xs text-[#787771] mt-2" >
              Must be at least 8 characters
            </p>
          </div>

          <div className="flex items-center gap-2 pt-4">
            <input
              id="signup-agree-tos-pp"
              type="checkbox"
              required
              className="w-4 h-4 flex-shrink-0 rounded border-[#e8e4db] accent-[#d47455] focus:ring-[#d47455]"
            />
            <label htmlFor="signup-agree-tos-pp" className="text-xs text-[#787771] cursor-pointer select-none">
              I agree to the{' '}
              <a href="/terms" className="text-[#d47455] hover:underline inline relative z-10" onClick={(e) => e.stopPropagation()}>Terms of Service</a>
              {' '}and{' '}
              <a href="/privacy" className="text-[#d47455] hover:underline inline relative z-10" onClick={(e) => e.stopPropagation()}>Privacy Policy</a>
            </label>
          </div>

          <button
            type="submit"
            className="w-full px-6 py-4 rounded-xl bg-[#d47455] text-white hover:bg-[#c26645] transition-colors shadow-sm disabled:bg-[#e8e4db] disabled:cursor-not-allowed mt-2"
            style={{ fontWeight: 600 }}
            disabled={!email || !password || !fullName || loading}
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <div className="mt-10 pt-6 text-center">
          <p className="text-sm text-[#787771]" >
            Already have an account?{' '}
            <button
              type="button"
              onClick={() => { setError(''); setSuccessMessage(''); setMode('signin'); }}
              className="text-[#d47455] hover:text-[#c26645] font-semibold"
            >
              Sign In
            </button>
          </p>
        </div>
        </div>
      </div>
    </div>
  );

  // Forgot password mode
  if (mode === 'forgot') {
    return (
      <div
        className="landing-bg flex flex-col overflow-hidden"
        style={{
          minHeight: 'var(--app-height, 100vh)',
          height: 'var(--app-height, 100vh)',
          maxHeight: 'var(--app-height, 100vh)',
          paddingTop: 'env(safe-area-inset-top)',
          paddingBottom: 'env(safe-area-inset-bottom)',
          paddingLeft: 'env(safe-area-inset-left)',
          paddingRight: 'env(safe-area-inset-right)',
        }}
      >
        <div className="px-6 pt-6 pb-4 flex-shrink-0 w-full">
          <button
            onClick={() => { setError(''); setSuccessMessage(''); setMode('signin'); }}
            className="text-sm text-[#787771] hover:text-[#27251f] px-4 py-2 rounded-full bg-white/50 hover:bg-white/70 transition-colors -ml-2"
          >
            ← Back
          </button>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto flex flex-col bg-transparent">
          <div className="flex-1 px-6 py-10 max-w-sm mx-auto w-full pb-12 bg-transparent">
          <h1 className="text-3xl text-[#27251f] mb-3 mt-4" style={{ fontWeight: 600 }}>
            Forgot password
          </h1>
          <p className="text-sm text-[#787771] mb-8" >
            Enter your email and we&apos;ll send you a reset link
          </p>
          {error && (
            <p className="text-sm text-red-600 mb-5" >{error}</p>
          )}
          <form onSubmit={handleForgotPassword} className="space-y-6">
            <div>
              <label className="block text-sm mb-2.5 text-[#27251f]" style={{ fontWeight: 500 }}>
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#787771]" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your.email@law.school.edu"
                  required
                  className="w-full pl-11 pr-4 py-3 rounded-lg border border-[#e8e4db] bg-white focus:outline-none focus:ring-2 focus:ring-[#d47455] focus:border-transparent"
                />
              </div>
            </div>
            <button
              type="submit"
              className="w-full px-6 py-4 rounded-xl bg-[#d47455] text-white hover:bg-[#c26645] transition-colors shadow-sm disabled:bg-[#e8e4db] disabled:cursor-not-allowed mt-2"
              style={{ fontWeight: 600 }}
              disabled={!email || loading}
            >
              {loading ? 'Sending...' : 'Send reset link'}
            </button>
          </form>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
