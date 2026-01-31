import React, { useState, useEffect } from 'react'
import { ArrowLeft } from 'lucide-react'
import { LoginPage } from './LoginPage'
import { SignupForm } from './SignupForm'
import { ForgotPasswordForm } from './ForgotPasswordPage'

type AuthMode = 'login' | 'signup' | 'forgot-password'

interface AuthPageProps {
  onBack?: () => void;
  initialMode?: AuthMode;
}

export const AuthPage: React.FC<AuthPageProps> = ({ onBack, initialMode = 'login' }) => {
  const [authMode, setAuthMode] = useState<AuthMode>(initialMode)
  const [urlError, setUrlError] = useState<string | null>(null)

  // Update auth mode when initialMode prop changes
  useEffect(() => {
    setAuthMode(initialMode);
  }, [initialMode]);

  // Check for error in URL parameters
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const errorParam = urlParams.get('error');
    
    if (errorParam) {
      setUrlError(decodeURIComponent(errorParam));
      // Clean up the URL by removing the error parameter
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }
  }, []);

  const handleSwitchToSignup = () => {
    setAuthMode('signup')
    setUrlError(null) // Clear error when switching modes
  }
  const handleSwitchToLogin = () => {
    setAuthMode('login')
    setUrlError(null) // Clear error when switching modes
  }
  const handleForgotPassword = () => setAuthMode('forgot-password')
  const handleBackToLogin = () => {
    setAuthMode('login')
    setUrlError(null) // Clear error when switching modes
  }

  return (
    <div
      className="flex flex-col items-center relative px-4 overflow-hidden"
      style={{
        backgroundColor: 'var(--background-color, #f9f5f0)',
        minHeight: 'var(--app-height, 100vh)',
        height: 'var(--app-height, 100vh)',
        maxHeight: 'var(--app-height, 100vh)',
      }}
    >
      {/* Back button */}
      {onBack && (
        <button
          onClick={onBack}
          className="absolute top-4 left-4 flex items-center gap-2 px-4 py-2 text-[#3d3d3a] hover:bg-white/50 rounded-xl transition-colors"
          style={{ fontFamily: 'Arial, sans-serif', fontWeight: 500 }}
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back</span>
        </button>
      )}
      
      {/* Logo at the top - responsive sizing */}
      <div className="flex-shrink-0" style={{ marginTop: 'clamp(8px, 2vh, 32px)', paddingBottom: 'clamp(6px, 1vh, 12px)' }}>
        <div className="flex justify-center">
          <img 
            src="/QUAD.svg" 
            alt="Quad Logo" 
            className="w-auto object-contain"
            style={{ height: 'clamp(100px, 14vh, 160px)' }}
          />
        </div>
      </div>
      
      {/* Auth form - prioritized for space */}
      <div className="w-full max-w-md flex-1 flex flex-col justify-start" style={{ marginTop: '0.5rem', minHeight: 'clamp(400px, 50vh, 600px)' }}>
        {authMode === 'login' && (
          <LoginPage
            onSwitchToSignup={handleSwitchToSignup}
            onForgotPassword={handleForgotPassword}
            initialError={urlError}
          />
        )}
        {authMode === 'signup' && (
          <SignupForm onSwitchToLogin={handleSwitchToLogin} />
        )}
        {authMode === 'forgot-password' && (
          <ForgotPasswordForm onBackToLogin={handleBackToLogin} />
        )}
      </div>
    </div>
  )
}
