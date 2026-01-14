import React, { useState } from 'react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Alert, AlertDescription } from '../ui/alert'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card'
import { useAuth } from '../../contexts/AuthContext'
import { Loader2, ArrowLeft, CheckCircle, Mail, KeyRound } from 'lucide-react'

interface ForgotPasswordFormProps {
  onBackToLogin: () => void
}

export const ForgotPasswordForm: React.FC<ForgotPasswordFormProps> = ({ onBackToLogin }) => {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const { resetPassword } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess(false)

    const { error } = await resetPassword(email)
    
    if (error) {
      setError(error.message)
    } else {
      setSuccess(true)
    }
    
    setLoading(false)
  }

  if (success) {
    return (
      <Card className="w-full" style={{ backgroundColor: '#ffffff', border: 'none', boxShadow: '0 0 22px rgba(0, 0, 0, 0.12)', borderRadius: '1rem' }}>
        <CardHeader className="text-center pb-2 px-4 pt-4">
          <div className="flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4 mx-auto">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <CardTitle className="text-2xl">Check your email</CardTitle>
          <CardDescription className="text-sm" style={{ marginTop: '0.5rem' }}>
            We've sent you a password reset link to <span className="font-medium">{email}</span>
          </CardDescription>
          <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-xs text-blue-700">
              <strong>Don't see the email?</strong> Please check your spam or junk folder. The reset link may take a few minutes to arrive.
            </p>
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <Button
            onClick={onBackToLogin}
            className="w-full"
            style={{ backgroundColor: '#00962c', color: 'white' }}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Sign In
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full" style={{ backgroundColor: '#ffffff', border: 'none', boxShadow: '0 0 22px rgba(0, 0, 0, 0.12)', borderRadius: '1rem' }}>
      <CardHeader className="text-center pb-2 px-4 pt-4">
        <CardTitle className="text-2xl">Reset Password</CardTitle>
        <CardDescription className="text-sm" style={{ marginTop: '0.5rem' }}>
          Enter your email and we'll send you a reset link
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
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                className="pr-10"
              />
              <Mail className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
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
                <KeyRound className="mr-2 h-4 w-4" />
                Send Reset Link
              </>
            )}
          </Button>
        </form>
        
        {/* Back to Login Link */}
        <div className="text-center mt-4">
          <Button
            variant="link"
            className="p-0 h-auto font-normal"
            onClick={onBackToLogin}
            disabled={loading}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Sign In
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
