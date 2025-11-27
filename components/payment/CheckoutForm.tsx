'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import {
  PaymentElement,
  useStripe,
  useElements
} from '@stripe/react-stripe-js';
import { Button } from '@/components/ui/button';
import { useSearchParams, useRouter } from 'next/navigation';
import { Loader2, CheckCircle, Shield } from 'lucide-react';

// Maximum time to wait for balance update (30 seconds)
const MAX_POLL_TIME = 30000;
// Poll interval (2 seconds)
const POLL_INTERVAL = 2000;

export default function CheckoutForm() {
  const stripe = useStripe();
  const elements = useElements();
  const searchParams = useSearchParams();
  const router = useRouter();
  const type = searchParams.get('type') || 'investment';

  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'verifying' | 'success' | 'error'>('idle');
  const [newBalance, setNewBalance] = useState<number | null>(null);
  const pollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pollStartTimeRef = useRef<number>(0);
  const initialBalanceRef = useRef<number | null>(null);

  // Format currency in INR
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount);
  };

  // Verify wallet balance was updated
  const verifyBalanceUpdate = useCallback(async (): Promise<boolean> => {
    try {
      const response = await fetch('/api/wallet', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        return false;
      }

      const data = await response.json();
      
      if (data.success && data.wallet) {
        const currentBalance = data.wallet.balance || 0;
        
        // Store initial balance on first check
        if (initialBalanceRef.current === null) {
          initialBalanceRef.current = currentBalance;
        } else if (currentBalance > initialBalanceRef.current) {
          // Balance increased - deposit confirmed
          setNewBalance(currentBalance);
          return true;
        }
      }
      
      return false;
    } catch (error) {
      console.error('Balance verification error:', error);
      return false;
    }
  }, []);

  // Poll for balance update (for deposits)
  const pollForBalanceUpdate = useCallback(async () => {
    const elapsedTime = Date.now() - pollStartTimeRef.current;
    
    if (elapsedTime > MAX_POLL_TIME) {
      // Timeout - redirect to success page anyway
      setPaymentStatus('success');
      setTimeout(() => {
        if (type === 'deposit') {
          router.push('/dashboard/investor?payment=success');
        } else {
          router.push('/payment/success');
        }
      }, 2000);
      return;
    }

    const isUpdated = await verifyBalanceUpdate();
    
    if (isUpdated) {
      setPaymentStatus('success');
      setTimeout(() => {
        if (type === 'deposit') {
          router.push('/dashboard/investor?payment=success');
        } else {
          router.push('/payment/success');
        }
      }, 2000);
    } else {
      // Continue polling
      pollTimeoutRef.current = setTimeout(() => {
        pollForBalanceUpdate();
      }, POLL_INTERVAL);
    }
  }, [verifyBalanceUpdate, type, router]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollTimeoutRef.current) {
        clearTimeout(pollTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!stripe) {
      return;
    }

    const clientSecret = new URLSearchParams(globalThis.location.search).get(
      'payment_intent_client_secret'
    );

    if (!clientSecret) {
      return;
    }

    stripe.retrievePaymentIntent(clientSecret).then(({ paymentIntent }) => {
      switch (paymentIntent?.status) {
        case 'succeeded':
          setMessage('Payment succeeded!');
          if (type === 'deposit') {
            setPaymentStatus('verifying');
            pollStartTimeRef.current = Date.now();
            pollForBalanceUpdate();
          }
          break;
        case 'processing':
          setMessage('Your payment is processing.');
          break;
        case 'requires_payment_method':
          setMessage('Your payment was not successful, please try again.');
          break;
        default:
          setMessage('Something went wrong.');
          break;
      }
    });
  }, [stripe, type, pollForBalanceUpdate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsLoading(true);
    setMessage(null);
    initialBalanceRef.current = null;

    // For deposits, try to confirm without redirect first
    if (type === 'deposit') {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${globalThis.location.origin}/payment/success?type=deposit`,
        },
        redirect: 'if_required',
      });

      if (error) {
        if (error.type === 'card_error' || error.type === 'validation_error') {
          setMessage(error.message || 'An unexpected error occurred.');
        } else {
          setMessage('An unexpected error occurred.');
        }
        setPaymentStatus('error');
        setIsLoading(false);
      } else if (paymentIntent?.status === 'succeeded' || paymentIntent?.status === 'processing') {
        // Payment succeeded or processing - verify balance update
        setPaymentStatus('verifying');
        setIsLoading(false);
        pollStartTimeRef.current = Date.now();
        pollForBalanceUpdate();
      }
    } else {
      // For investments, redirect as normal
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${globalThis.location.origin}/payment/success`,
        },
      });

      if (error) {
        if (error.type === 'card_error' || error.type === 'validation_error') {
          setMessage(error.message || 'An unexpected error occurred.');
        } else {
          setMessage('An unexpected error occurred.');
        }
        setPaymentStatus('error');
      }
      setIsLoading(false);
    }
  };

  // Show verifying state
  if (paymentStatus === 'verifying') {
    return (
      <div className="text-center py-8">
        <div className="relative inline-block">
          <Loader2 className="w-16 h-16 text-green-500 animate-spin" />
          <Shield className="w-6 h-6 text-green-400 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
        </div>
        <h3 className="text-xl font-bold text-white mb-2 mt-4">Verifying Payment...</h3>
        <p className="text-gray-400 mb-4">
          Confirming deposit to your wallet
        </p>
        <p className="text-sm text-gray-500">Please wait, this may take a few seconds...</p>
      </div>
    );
  }

  // Show success state
  if (paymentStatus === 'success') {
    return (
      <div className="text-center py-8">
        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-white mb-2">Payment Successful!</h3>
        <p className="text-gray-400 mb-4">
          Funds have been added to your wallet
        </p>
        {newBalance !== null && (
          <p className="text-lg font-semibold text-green-400 mb-4">
            New Balance: {formatCurrency(newBalance)}
          </p>
        )}
        <p className="text-sm text-gray-500">Redirecting to dashboard...</p>
      </div>
    );
  }

  return (
    <form id="payment-form" onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement id="payment-element" options={{ layout: 'tabs' }} />
      <Button 
        disabled={isLoading || !stripe || !elements} 
        id="submit"
        className="w-full bg-red-600 hover:bg-red-700 text-white"
      >
        <span id="button-text">
          {isLoading ? 'Processing...' : 'Pay now'}
        </span>
      </Button>
      {message && (
        <div className={`text-sm mt-2 ${paymentStatus === 'error' ? 'text-red-500' : 'text-green-500'}`}>
          {message}
        </div>
      )}
    </form>
  );
}
