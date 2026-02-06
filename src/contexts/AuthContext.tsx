import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { openInAppBrowser } from '../lib/nativeBrowser';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signUp: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<{ error: AuthError | null }>;
  signInWithGoogle: () => Promise<{ error: AuthError | null }>;
  resetPassword: (email: string) => Promise<{ error: AuthError | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (data.session) {
      setSession(data.session);
      setUser(data.session.user);
    }
    
    return { error };
  };

  const signUp = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    
    if (data.session) {
      setSession(data.session);
      setUser(data.session.user);
    }
    
    return { error };
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      const isSessionMissing =
        error?.message?.toLowerCase().includes('session missing') ||
        (error as { name?: string })?.name === 'AuthSessionMissingError';
      if (!error || isSessionMissing) {
        setSession(null);
        setUser(null);
        return { error: null };
      }
      return { error };
    } catch (e) {
      const err = e as { message?: string; name?: string };
      const isSessionMissing =
        err?.message?.toLowerCase().includes('session missing') ||
        err?.name === 'AuthSessionMissingError';
      if (isSessionMissing) {
        setSession(null);
        setUser(null);
        return { error: null };
      }
      return { error: e as AuthError };
    }
  };

  const signInWithGoogle = async () => {
    // Check if native
    let isNativePlatform = false;
    try {
      const { Capacitor } = await import('@capacitor/core');
      isNativePlatform = Capacitor.isNativePlatform();
    } catch {
      // not native
    }

    // Native: redirect directly to harvardquad:// scheme.
    // Supabase does HTTP 302 → harvardquad://auth/callback?code=xxx
    // iOS intercepts this and fires appUrlOpen (handled in App.tsx).
    // Web: redirect to the web callback page.
    const redirectTo = isNativePlatform
      ? 'harvardquad://auth/callback'
      : `${window.location.origin}/auth/callback`;

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        skipBrowserRedirect: true,
      },
    });

    if (error) return { error };
    if (data?.url) {
      if (isNativePlatform) {
        // Open in SFSafariViewController — it will be closed from App.tsx appUrlOpen handler
        await openInAppBrowser(data.url);
      } else {
        window.location.href = data.url;
      }
    }
    return { error: null };
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });
    
    return { error };
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signIn, signUp, signOut, signInWithGoogle, resetPassword }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
