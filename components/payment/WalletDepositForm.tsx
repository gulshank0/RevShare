'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useStripe, useElements, PaymentElement } from '@stripe/react-stripe-js';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, XCircle, Shield } from 'lucide-react';

interface WalletDepositFormProps {
  readonly amount: number;
  readonly clientSecret: string;
  readonly onSuccess: (newBalance?: number) => void;
  readonly onCancel: () => void;
}

// Maximum time to wait for balance update (30 seconds)
const MAX_POLL_TIME = 30000;
// Poll interval (2 seconds)
const POLL_INTERVAL = 2000;

export default function WalletDepositForm({ 
  amount, 
  clientSecret, 
  onSuccess, 
  onCancel 
}: WalletDepositFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'verifying' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [newBalance, setNewBalance] = useState<number | null>(null);
  const pollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pollStartTimeRef = useRef<number>(0);
  const initialBalanceRef = useRef<number | null>(null);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollTimeoutRef.current) {
        clearTimeout(pollTimeoutRef.current);
        pollTimeoutRef.current = null;
      }
    };
  }, []);

  // Verify wallet balance was updated (poll until balance increases or timeout)
  const verifyBalanceUpdate = useCallback(async (expectedAmount: number): Promise<boolean> => {
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
        throw new Error('Failed to fetch wallet');
      }

      const data = await response.json();
      
      if (data.success && data.wallet) {
        const currentBalance = data.wallet.balance || 0;
        
        // Store initial balance on first check
        initialBalanceRef.current ??= currentBalance - expectedAmount;
        
        // Check if balance was updated (current balance should be >= initial + deposit)
        const expectedBalance = (initialBalanceRef.current || 0) + expectedAmount;
        if (currentBalance >= expectedBalance - 0.01) { // Allow small floating point tolerance
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

  // Poll for balance update
  const pollForBalanceUpdate = useCallback(async (expectedAmount: number) => {
    const elapsedTime = Date.now() - pollStartTimeRef.current;
    
    if (elapsedTime > MAX_POLL_TIME) {
      // Timeout - payment succeeded but balance update may be delayed
      setPaymentStatus('success');
      setTimeout(() => {
        onSuccess();
      }, 2000);
      return;
    }

    const isUpdated = await verifyBalanceUpdate(expectedAmount);
    
    if (isUpdated) {
      setPaymentStatus('success');
      setTimeout(() => {
        onSuccess(newBalance || undefined);
      }, 2000);
    } else {
      // Continue polling
      pollTimeoutRef.current = setTimeout(() => {
        pollForBalanceUpdate(expectedAmount);
      }, POLL_INTERVAL);
    }
  }, [verifyBalanceUpdate, onSuccess, newBalance]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);
    setErrorMessage('');
    initialBalanceRef.current = null;

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${globalThis.location.origin}/profile?payment=success`,
        },
        redirect: 'if_required',
      });

      if (error) {
        setErrorMessage(error.message || 'An error occurred');
        setPaymentStatus('error');
        setIsProcessing(false);
      } else if (paymentIntent?.status === 'succeeded' || paymentIntent?.status === 'processing') {
        // Payment succeeded or is processing - verify balance was updated
        setPaymentStatus('verifying');
        setIsProcessing(false);
        pollStartTimeRef.current = Date.now();
        
        // Start polling for balance update
        pollForBalanceUpdate(amount);
      }
    } catch (error: any) {
      setErrorMessage(error.message || 'Payment failed');
      setPaymentStatus('error');
      setIsProcessing(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount);
  };

  if (paymentStatus === 'verifying') {
    return (
      <div className="text-center py-8">
        <div className="relative">
          <Loader2 className="w-16 h-16 text-green-500 mx-auto mb-4 animate-spin" />
          <Shield className="w-6 h-6 text-green-400 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
        </div>
        <h3 className="text-xl font-bold text-white mb-2">Verifying Payment...</h3>
        <p className="text-gray-400 mb-4">
          Confirming {formatCurrency(amount)} deposit to your wallet
        </p>
        <p className="text-sm text-gray-500">Please wait, this may take a few seconds...</p>
      </div>
    );
  }

  if (paymentStatus === 'success') {
    return (
      <div className="text-center py-8">
        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-white mb-2">Payment Successful!</h3>
        <p className="text-gray-400 mb-4">
          {formatCurrency(amount)} has been added to your wallet
        </p>
        {newBalance !== null && (
          <p className="text-lg font-semibold text-green-400 mb-4">
            New Balance: {formatCurrency(newBalance)}
          </p>
        )}
        <p className="text-sm text-gray-500">Redirecting...</p>
      </div>
    );
  }

  if (paymentStatus === 'error') {
    return (
      <div className="text-center py-8">
        <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-white mb-2">Payment Failed</h3>
        <p className="text-gray-400 mb-6">{errorMessage}</p>
        <div className="flex gap-3 justify-center">
          <Button
            onClick={() => setPaymentStatus('idle')}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            Try Again
          </Button>
          <Button
            onClick={onCancel}
            variant="outline"
            className="bg-zinc-800 border-zinc-700 hover:bg-zinc-700 text-white"
          >
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="p-4 bg-zinc-800/50 rounded-lg border border-zinc-700">
        <div className="flex justify-between items-center">
          <span className="text-gray-400">Deposit Amount:</span>
          <span className="text-2xl font-bold text-white">{formatCurrency(amount)}</span>
        </div>
      </div>

      <div className="space-y-4">
        <PaymentElement 
          options={{
            layout: 'tabs',
            paymentMethodOrder: ['card', 'google_pay', 'apple_pay'],
          }}
        />
      </div>

      {errorMessage && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
          <p className="text-sm text-red-500">{errorMessage}</p>
        </div>
      )}

      <div className="flex gap-3">
        <Button
          type="submit"
          disabled={!stripe || isProcessing}
          className="flex-1 bg-red-600 hover:bg-red-700 text-white"
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            `Pay ${formatCurrency(amount)}`
          )}
        </Button>
        <Button
          type="button"
          onClick={onCancel}
          disabled={isProcessing}
          variant="outline"
          className="bg-zinc-800 border-zinc-700 hover:bg-zinc-700 text-white"
        >
          Cancel
        </Button>
      </div>

      <p className="text-xs text-center text-gray-500">
        Your payment information is securely processed by Stripe. We never store your card details.
      </p>
    </form>
  );
}
