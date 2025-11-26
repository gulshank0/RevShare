'use client';

import { useState } from 'react';
import { useStripe, useElements, PaymentElement } from '@stripe/react-stripe-js';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

interface WalletDepositFormProps {
  amount: number;
  clientSecret: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function WalletDepositForm({ 
  amount, 
  clientSecret, 
  onSuccess, 
  onCancel 
}: WalletDepositFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);
    setErrorMessage('');

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/profile?payment=success`,
        },
        redirect: 'if_required',
      });

      if (error) {
        setErrorMessage(error.message || 'An error occurred');
        setPaymentStatus('error');
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        setPaymentStatus('success');
        setTimeout(() => {
          onSuccess();
        }, 2000);
      }
    } catch (error: any) {
      setErrorMessage(error.message || 'Payment failed');
      setPaymentStatus('error');
    } finally {
      setIsProcessing(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount);
  };

  if (paymentStatus === 'success') {
    return (
      <div className="text-center py-8">
        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-white mb-2">Payment Successful!</h3>
        <p className="text-gray-400 mb-4">
          {formatCurrency(amount)} has been added to your wallet
        </p>
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
