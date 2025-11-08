'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Video, AlertCircle, ArrowLeft, RefreshCw } from 'lucide-react';

export default function AuthError() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');

  const getErrorDetails = (error: string | null) => {
    switch (error) {
      case 'Configuration':
        return {
          title: 'Server Configuration Error',
          message: 'There is a problem with the server configuration. Please contact support.',
          action: 'Contact Support'
        };
      case 'AccessDenied':
        return {
          title: 'Access Denied',
          message: 'You do not have permission to sign in. This app may be in testing mode.',
          action: 'Try Again'
        };
      case 'Verification':
        return {
          title: 'Verification Error',
          message: 'The verification token has expired or has already been used.',
          action: 'Try Again'
        };
      case 'OAuthSignin':
      case 'OAuthCallback':
      case 'OAuthCreateAccount':
        return {
          title: 'OAuth Error',
          message: 'There was an error with Google authentication. Please try signing in again.',
          action: 'Try Again'
        };
      case 'EmailCreateAccount':
        return {
          title: 'Account Creation Error',
          message: 'Could not create your account. Please try again or contact support.',
          action: 'Try Again'
        };
      case 'Callback':
        return {
          title: 'Callback Error',
          message: 'There was an error during the authentication process.',
          action: 'Try Again'
        };
      case 'OAuthAccountNotLinked':
        return {
          title: 'Account Already Exists',
          message: 'An account with this email already exists with a different sign-in method.',
          action: 'Try Different Method'
        };
      case 'SignInCallbackError':
        return {
          title: 'Sign In Error',
          message: 'There was an error processing your sign-in. Please check your internet connection and try again.',
          action: 'Try Again'
        };
      case 'DatabaseError':
        return {
          title: 'Database Error',
          message: 'There was a problem connecting to our database. Please try again in a moment.',
          action: 'Try Again'
        };
      default:
        return {
          title: 'Authentication Error',
          message: 'An unexpected error occurred during sign in. Please try again.',
          action: 'Try Again'
        };
    }
  };

  const errorDetails = getErrorDetails(error);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-zinc-950 to-zinc-900 px-4">
      <Card className="w-full max-w-md p-8 shadow-xl bg-zinc-900 backdrop-blur-sm">
        <div className="text-center mb-8">
          <Link href="/" className="flex items-center justify-center space-x-2 mb-6">
            <div className="p-2 rounded-lg bg-gradient-to-br from-red-500 to-red-700 shadow-lg">
              <Video className="h-8 w-8 text-white" />
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-red-600 to-red-800 bg-clip-text text-transparent">
              CreatorTube
            </span>
          </Link>

          <div className="mb-6">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">{errorDetails.title}</h1>
            <p className="text-gray-300 text-sm leading-relaxed">
              {errorDetails.message}
            </p>
          </div>

          {error === 'AccessDenied' && (
            <div className="mb-6 p-4 bg-yellow-900/50 border border-yellow-700/50 rounded-lg text-left">
              <p className="text-sm text-yellow-200 font-medium mb-2">
                🔒 App in Testing Mode
              </p>
              <p className="text-xs text-yellow-300 mb-3">
                CreatorTube is currently undergoing Google's verification process. 
                Only approved test users can sign in at this time.
              </p>
              <div className="space-y-2 text-xs text-yellow-300">
                <p><strong>If you're a tester:</strong> Make sure your email is added to the test user list.</p>
                <p><strong>Need access?</strong> Contact the administrator to be added as a test user.</p>
              </div>
              <div className="mt-3 pt-2 border-t border-yellow-700/50">
                <p className="text-xs text-yellow-400">
                  Contact: <span className="font-mono">gulshan63072@gmail.com</span>
                </p>
              </div>
            </div>
          )}

          <div className="space-y-3">
            <Link href="/auth/signin">
              <Button className="w-full bg-red-600 hover:bg-red-700 text-white">
                <RefreshCw className="w-4 h-4 mr-2" />
                {errorDetails.action}
              </Button>
            </Link>
            
            <Link href="/">
              <Button variant="outline" className="w-full border-zinc-700/50 text-gray-300 hover:text-white hover:bg-zinc-800/50">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Home
              </Button>
            </Link>
          </div>

          {process.env.NODE_ENV === 'development' && error && (
            <div className="mt-6 p-3 bg-blue-900/50 border border-blue-700/50 rounded-lg">
              <p className="text-xs text-blue-200 font-medium mb-1">Development Info</p>
              <p className="text-xs text-blue-300 font-mono">Error: {error}</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}