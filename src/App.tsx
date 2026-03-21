import React, { useState, useEffect } from 'react';
import { AuthScreensStandalone } from './components/auth/MobileLoginPage';
import { AuthCallback } from './components/auth/AuthCallback';
import { OnboardingFlowStandalone } from './components/onboarding/OnboardingFlow';
import { LandingPage } from "@/components/pages/landing-page"
import { AppShell } from './components/shell/app-shell';
import { ThemeProvider } from './components/theme-provider';
import { useAuth } from './contexts/AuthContext';
import { ProfileProvider } from './contexts/ProfileContext';
import { navigateWithoutReload } from './lib/navigation';
import { supabase } from './lib/supabase';

export default function App() {
  const { user, loading } = useAuth();
  const [profile, setProfile] = useState<{ onboarding_completed?: boolean | null } | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [showAuth, setShowAuth] = useState(false);
  const [onboardingComplete, setOnboardingComplete] = useState(false);

  const userId = user?.id;
  useEffect(() => {
    if (!userId) {
      setProfileLoading(false);
      return;
    }
    setProfileLoading(true);
    let cancelled = false;
    const timeout = setTimeout(() => {
      if (!cancelled) setProfileLoading(false);
    }, 8000);
    supabase
      .from('profiles')
      .select('onboarding_completed')
      .eq('id', userId)
      .single()
      .then(({ data }) => {
        if (cancelled) return;
        setProfile(data ?? null);
        if (data?.onboarding_completed) setOnboardingComplete(true);
      })
      .catch(() => {
        if (!cancelled) setProfile(null);
      })
      .finally(() => {
        if (!cancelled) setProfileLoading(false);
        clearTimeout(timeout);
      });
    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [userId]);

  useEffect(() => {
    if (profile?.onboarding_completed) setOnboardingComplete(true);
  }, [profile?.onboarding_completed]);

  useEffect(() => {
    if (!userId) setOnboardingComplete(false);
  }, [userId]);

  if (typeof window !== 'undefined' && window.location.pathname === '/auth/callback') {
    return <AuthCallback />;
  }

  if (typeof window !== 'undefined' && window.location.pathname === '/login') {
    return <AuthScreensStandalone onBack={() => navigateWithoutReload('/')} />;
  }

  if (loading || (user && profileLoading)) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-[#FBF9F5]" style={{ minHeight: '100dvh' }}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#d47455]" />
        <span className="text-[#787771] text-sm">Loading…</span>
      </div>
    );
  }

  if (!user) {
    if (showAuth) {
      return <AuthScreensStandalone onBack={() => setShowAuth(false)} />;
    }
    return (
      <LandingPage
        onSignIn={() => {
          setShowAuth(true);
        }}
      />
    );
  }

  if (user && !onboardingComplete) {
    return (
      <OnboardingFlowStandalone
        onComplete={() => setOnboardingComplete(true)}
      />
    );
  }

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <ProfileProvider>
        <AppShell />
      </ProfileProvider>
    </ThemeProvider>
  );
}
