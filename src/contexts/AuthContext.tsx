import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

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
const AUTH_CACHE_KEY = 'hqAuthSnapshotV1';

interface CachedAuthSnapshot {
  user: User | null;
  session: Session | null;
  cachedAt: number;
}

function readCachedAuth(): CachedAuthSnapshot | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(AUTH_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedAuthSnapshot;
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCachedAuth(session: Session | null, user: User | null) {
  if (typeof window === 'undefined') return;
  try {
    if (!session || !user) {
      localStorage.removeItem(AUTH_CACHE_KEY);
      return;
    }
    const snapshot: CachedAuthSnapshot = {
      session,
      user,
      cachedAt: Date.now(),
    };
    localStorage.setItem(AUTH_CACHE_KEY, JSON.stringify(snapshot));
  } catch {
    // Ignore localStorage write failures.
  }
}

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const cachedAuth = readCachedAuth();
  const [user, setUser] = useState<User | null>(cachedAuth?.user ?? null);
  const [session, setSession] = useState<Session | null>(cachedAuth?.session ?? null);
  const [loading, setLoading] = useState(!cachedAuth);

  useEffect(() => {
    // Prevent loading from hanging (e.g. missing env or Supabase unreachable)
    const fallback = setTimeout(() => setLoading(false), 5000);

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const nextUser = session?.user ?? null;
      setSession(session ?? null);
      setUser(nextUser);
      writeCachedAuth(session ?? null, nextUser);
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      const nextUser = session?.user ?? null;
      setSession(session ?? null);
      setUser(nextUser);
      writeCachedAuth(session ?? null, nextUser);
      setLoading(false);
    }).catch(() => {
      setLoading(false);
    });

    return () => {
      clearTimeout(fallback);
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (data.session) {
      setSession(data.session);
      setUser(data.session.user);
      writeCachedAuth(data.session, data.session.user);
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
      writeCachedAuth(data.session, data.session.user);
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
        writeCachedAuth(null, null);
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
        writeCachedAuth(null, null);
        return { error: null };
      }
      return { error: e as AuthError };
    }
  };

  const signInWithGoogle = async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    return { error: error ?? null };
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
