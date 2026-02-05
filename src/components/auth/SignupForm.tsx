import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Alert, AlertDescription } from '../ui/alert';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import {
  Loader2,
  Eye,
  EyeOff,
  CheckCircle,
  Mail,
  UserPlus,
} from 'lucide-react';

interface SignupFormProps {
  onSwitchToLogin: () => void;
}

export const SignupForm: React.FC<SignupFormProps> = ({ onSwitchToLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const { signInWithGoogle } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    // Validate passwords match
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    // Validate password strength
    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      setLoading(false);
      return;
    }

    // First validate email with edge function
    try {
      const response = await fetch(
        `${(import.meta as any).env.VITE_SUPABASE_URL}/functions/v1/validate-harvard-email`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${(import.meta as any).env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({ email }),
        }
      );

      const result = await response.json();

      if (!result.success) {
        setError(result.error || 'Please use your Harvard Law School email address.');
        setLoading(false);
        return;
      }
      
    } catch (err) {
      console.error('Email validation error:', err instanceof Error ? err.message : "Unknown error");
      setError('Unable to validate email. Please try again.');
      setLoading(false);
      return;
    }

    // Now create account using Supabase auth (which will send confirmation email and save password)
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.toLowerCase().trim(),
        password: password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`
        }
      });

      if (error) {
        console.error('Supabase signup error:', error?.message || "Unknown error");
        setError(error.message);
        setLoading(false);
        return;
      }

      setSuccess(true);
      
    } catch (err) {
      console.error('Account creation error:', err instanceof Error ? err.message : "Unknown error");
      setError('Unable to create account. Please try again.');
      setLoading(false);
      return;
    }

    setLoading(false);
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError('');

    try {
      const { error } = await signInWithGoogle();

      if (error) {
        console.error('Google sign-in error:', error?.message || "Unknown error");
        setError(error.message);
        setLoading(false);
      }
      // Note: If successful, user will be redirected, so we don't need to set loading to false
    } catch (err) {
      console.error('Google sign-in exception:', err instanceof Error ? err.message : "Unknown error");
      setError('An unexpected error occurred during Google login. Please try again.');
      setLoading(false);
    }
  };

  if (success) {
    return (
      <Card className="w-full" style={{ backgroundColor: '#ffffff', border: 'none', boxShadow: '0 0 22px rgba(0, 0, 0, 0.12)', borderRadius: '1rem' }}>
        <CardHeader className="text-center pb-2 px-4 pt-4">
          <div className="flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4 mx-auto">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <CardTitle className="text-2xl">Check your email</CardTitle>
          <CardDescription className="text-sm" style={{ marginTop: '0.5rem' }}>
            We've sent you a confirmation link to complete your account setup.
          </CardDescription>
          <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-xs text-blue-700">
              <strong>Don't see the email?</strong> Please check your spam or junk folder. The confirmation link may take a few minutes to arrive.
            </p>
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <Button
            onClick={onSwitchToLogin}
            className="w-full"
            style={{ backgroundColor: '#00962c', color: 'white' }}
          >
            Back to Sign In
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full" style={{ backgroundColor: '#ffffff', border: 'none', boxShadow: '0 0 22px rgba(0, 0, 0, 0.12)', borderRadius: '1rem' }}>
      <CardHeader className="text-center pb-2 px-4 pt-4">
        <CardTitle className="text-2xl">Create Account</CardTitle>
        <CardDescription className="text-sm" style={{ marginTop: '0.5rem' }}>
          Join the Quad
        </CardDescription>
      </CardHeader>

      <CardContent className="px-4 pb-4">
        {/* Error Alert */}
        {error && (
          <Alert className="mb-4 bg-destructive/10 border-destructive/20 text-destructive">
            <AlertDescription className="text-sm">{error}</AlertDescription>
          </Alert>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email Field */}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Input
                id="email"
                type="email"
                placeholder="john.doe@law.harvard.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                className="pr-10"
              />
              <Mail className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            </div>
          </div>

          {/* Password Field */}
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Create a password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent text-muted-foreground hover:text-foreground"
                onClick={() => setShowPassword(!showPassword)}
                disabled={loading}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Confirm Password Field */}
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="Confirm your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={loading}
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent text-muted-foreground hover:text-foreground"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                disabled={loading}
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full"
            style={{ backgroundColor: '#00962c', color: 'white' }}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <>
                <UserPlus className="mr-2 h-4 w-4" />
                Create Account
              </>
            )}
          </Button>
        </form>

        {/* Divider */}
        <div className="mt-4">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-background px-2 text-muted-foreground">
                Or continue with Google
              </span>
            </div>
          </div>
        </div>

         {/* Google Sign In Button */}
         <div className="mt-3">
           <button
             type="button"
             className="gsi-material-button w-full"
             disabled={loading}
             onClick={handleGoogleSignIn}
           >
             <div className="gsi-material-button-state"></div>
             <div className="gsi-material-button-content-wrapper">
               <div className="gsi-material-button-icon">
                 <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" xmlnsXlink="http://www.w3.org/1999/xlink" style={{ display: 'block' }}>
                   <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                   <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                   <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                   <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                   <path fill="none" d="M0 0h48v48H0z"></path>
                 </svg>
               </div>
               <span className="gsi-material-button-contents">Continue with Google</span>
               <span style={{ display: 'none' }}>Continue with Google</span>
             </div>
           </button>
         </div>
         
         {/* Google Button Styles */}
         <style>{`
           .gsi-material-button {
             -moz-user-select: none;
             -webkit-user-select: none;
             -ms-user-select: none;
             -webkit-appearance: none;
             background-color: white;
             background-image: none;
             border: 1px solid #747775;
             -webkit-border-radius: 4px;
             border-radius: 4px;
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
             margin-right: 10px;
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
             justify-content: space-between;
             position: relative;
             width: 100%;
           }

           .gsi-material-button .gsi-material-button-contents {
             -webkit-flex-grow: 1;
             flex-grow: 1;
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
             border-color: #1f1f1f1f;
           }

           .gsi-material-button:disabled .gsi-material-button-contents {
             opacity: 38%;
           }

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

        {/* Sign In Link */}
        <div className="text-center mt-4">
          <p className="text-muted-foreground text-sm">
            Already have an account?{' '}
            <Button
              variant="link"
              className="p-0 h-auto font-normal"
              onClick={onSwitchToLogin}
              disabled={loading}
            >
              Sign in
            </Button>
          </p>
        </div>

        {/* Footer Links */}
        <div className="mt-4 pt-6 pb-4">
          <div className="flex items-center justify-center gap-2 flex-wrap">
            <a
              href="/privacy"
              className="text-sm hover:underline text-[#27251f]"
            >
              Privacy Policy
            </a>
            <span className="text-[#787771]">|</span>
            <a
              href="/terms"
              className="text-sm hover:underline text-[#27251f]"
            >
              Terms of Service
            </a>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
