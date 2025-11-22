'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import CheckoutForm from '@/components/payment/CheckoutForm';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Wallet, CreditCard } from 'lucide-react';
import Link from 'next/link';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

export default function PaymentPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const clientSecret = searchParams.get('clientSecret');
  const type = searchParams.get('type') || 'investment';

  const [depositAmount, setDepositAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleDepositSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const amount = Number.parseFloat(depositAmount);

    if (amount < 10) {
      setError('Minimum deposit is $10');
      setLoading(false);
      return;
    }

    if (amount > 100000) {
      setError('Maximum deposit is $100,000');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/wallet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount }),
      });

      const data = await res.json();

      if (data.success) {
        router.push(`/payment?clientSecret=${data.clientSecret}&type=deposit`);
      } else {
        setError(data.error || 'Failed to create deposit');
      }
    } catch (err) {
      console.error('Deposit error:', err);
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!clientSecret) {
    return (
      <div className="min-h-screen bg-zinc-950 py-12 px-4">
        <div className="max-w-2xl mx-auto">
          <Link href="/dashboard/investor">
            <Button variant="ghost" className="text-white mb-6">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>

          <Card className="youtube-card">
            <CardHeader>
              <div className="flex items-center gap-4 mb-2">
                <div className="w-12 h-12 bg-red-600/10 rounded-full flex items-center justify-center">
                  <Wallet className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <CardTitle className="text-white text-2xl">Add Funds to Portfolio</CardTitle>
                  <CardDescription className="text-gray-400">
                    Deposit money to invest in YouTube channels
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleDepositSubmit} className="space-y-6">
                <div>
                  <label htmlFor="amount" className="block text-sm font-medium text-gray-400 mb-2">
                    Deposit Amount (USD)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg">
                      $
                    </span>
                    <Input
                      id="amount"
                      type="number"
                      min="10"
                      max="100000"
                      step="0.01"
                      placeholder="1000"
                      value={depositAmount}
                      onChange={(e) => setDepositAmount(e.target.value)}
                      className="pl-8 bg-zinc-800 border-zinc-700 text-white text-lg h-14"
                      required
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Minimum: $10 • Maximum: $100,000
                  </p>
                </div>

                {error && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                    <p className="text-red-400 text-sm">{error}</p>
                  </div>
                )}

                <div className="bg-zinc-800 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Deposit Amount</span>
                    <span className="text-white font-medium">
                      ${depositAmount ? Number.parseFloat(depositAmount).toLocaleString() : '0.00'}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Processing Fee</span>
                    <span className="text-white font-medium">$0.00</span>
                  </div>
                  <div className="border-t border-zinc-700 pt-2 flex justify-between">
                    <span className="text-white font-semibold">Total</span>
                    <span className="text-white font-semibold text-lg">
                      ${depositAmount ? Number.parseFloat(depositAmount).toLocaleString() : '0.00'}
                    </span>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loading || !depositAmount}
                  className="youtube-button w-full text-lg py-6 h-auto"
                >
                  <CreditCard className="h-5 w-5 mr-2" />
                  {loading ? 'Processing...' : 'Continue to Payment'}
                </Button>
              </form>

              <div className="mt-6 pt-6 border-t border-zinc-800">
                <h4 className="text-white font-semibold mb-3">How it works:</h4>
                <ul className="space-y-2 text-sm text-gray-400">
                  <li className="flex items-start gap-2">
                    <span className="text-red-600 mt-1">•</span>
                    <span>Funds are added to your portfolio wallet instantly</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-600 mt-1">•</span>
                    <span>Use your wallet balance to invest in any YouTube channel</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-600 mt-1">•</span>
                    <span>Secure payment processing powered by Stripe</span>
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const options = {
    clientSecret,
    appearance: {
      theme: 'night' as const,
      variables: {
        colorPrimary: '#dc2626',
      },
    },
  };

  return (
    <div className="min-h-screen bg-zinc-950 py-12 px-4">
      <div className="max-w-md mx-auto">
        <Link href="/dashboard/investor">
          <Button variant="ghost" className="text-white mb-6">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </Link>

        <Card className="youtube-card">
          <CardHeader>
            <CardTitle className="text-white text-center text-xl">
              {type === 'deposit' ? 'Complete Deposit' : 'Complete Investment'}
            </CardTitle>
            <CardDescription className="text-gray-400 text-center">
              Enter your payment details to continue
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Elements options={options} stripe={stripePromise}>
              <CheckoutForm />
            </Elements>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
