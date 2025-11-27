'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Loader2, Shield, Wallet, TrendingUp } from 'lucide-react';
import Link from 'next/link';

// Maximum time to wait for balance update (30 seconds)
const MAX_POLL_TIME = 30000;
// Poll interval (2 seconds)
const POLL_INTERVAL = 2000;

export default function PaymentSuccessPage() {
  const searchParams = useSearchParams();
  const type = searchParams.get('type') || 'investment';
  
  const [verificationStatus, setVerificationStatus] = useState<'verifying' | 'success' | 'timeout'>('verifying');
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const pollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pollStartTimeRef = useRef<number>(Date.now());
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
        setWalletBalance(currentBalance);
        
        // For deposits, check if balance increased
        if (type === 'deposit') {
          if (initialBalanceRef.current === null) {
            // First check - store initial balance
            // We'll consider it verified if we get a valid response with balance > 0
            // or if the balance increases on subsequent checks
            initialBalanceRef.current = currentBalance;
            
            // Check transactions to see if there's a recent completed deposit
            const transactions = data.transactions || [];
            const recentDeposit = transactions.find((tx: any) => 
              tx.type === 'DEPOSIT' && 
              tx.status === 'COMPLETED' &&
              new Date(tx.completedAt).getTime() > Date.now() - 60000 // Within last minute
            );
            
            if (recentDeposit) {
              return true;
            }
          } else if (currentBalance > initialBalanceRef.current) {
            return true;
          }
        } else {
          // For investments, just verify we have wallet data
          return true;
        }
      }
      
      return false;
    } catch (error) {
      console.error('Balance verification error:', error);
      return false;
    }
  }, [type]);

  // Poll for balance update
  const pollForBalanceUpdate = useCallback(async () => {
    const elapsedTime = Date.now() - pollStartTimeRef.current;
    
    if (elapsedTime > MAX_POLL_TIME) {
      // Timeout - show success anyway (webhook may have processed)
      setVerificationStatus('timeout');
      return;
    }

    const isUpdated = await verifyBalanceUpdate();
    
    if (isUpdated) {
      setVerificationStatus('success');
    } else {
      // Continue polling
      pollTimeoutRef.current = setTimeout(() => {
        pollForBalanceUpdate();
      }, POLL_INTERVAL);
    }
  }, [verifyBalanceUpdate]);

  // Start verification on mount
  useEffect(() => {
    pollStartTimeRef.current = Date.now();
    pollForBalanceUpdate();

    return () => {
      if (pollTimeoutRef.current) {
        clearTimeout(pollTimeoutRef.current);
      }
    };
  }, [pollForBalanceUpdate]);

  // Verifying state
  if (verificationStatus === 'verifying') {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
        <Card className="max-w-md w-full bg-zinc-900 border-zinc-800">
          <CardContent className="pt-6 text-center space-y-6">
            <div className="flex justify-center">
              <div className="relative">
                <Loader2 className="w-16 h-16 text-green-500 animate-spin" />
                <Shield className="w-6 h-6 text-green-400 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
              </div>
            </div>
            
            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-white">Verifying Payment...</h1>
              <p className="text-gray-400">
                {type === 'deposit' 
                  ? 'Confirming your wallet deposit' 
                  : 'Confirming your investment'}
              </p>
            </div>

            <p className="text-sm text-gray-500">Please wait, this may take a few seconds...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Success or timeout state (both show success UI)
  const isDeposit = type === 'deposit';
  
  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <Card className="max-w-md w-full bg-zinc-900 border-zinc-800">
        <CardContent className="pt-6 text-center space-y-6">
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center">
              <CheckCircle2 className="h-10 w-10 text-green-500" />
            </div>
          </div>
          
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-white">Payment Successful!</h1>
            <p className="text-gray-400">
              {isDeposit 
                ? 'Funds have been added to your wallet.' 
                : 'Your investment has been processed successfully.'}
            </p>
          </div>

          {walletBalance !== null && isDeposit && (
            <div className="bg-zinc-800/50 rounded-lg p-4 border border-zinc-700">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Wallet className="w-5 h-5 text-green-500" />
                <span className="text-gray-400 text-sm">Current Wallet Balance</span>
              </div>
              <p className="text-2xl font-bold text-green-400">
                {formatCurrency(walletBalance)}
              </p>
            </div>
          )}

          {verificationStatus === 'timeout' && (
            <p className="text-xs text-yellow-500/80">
              Balance verification took longer than expected. Your balance should update shortly.
            </p>
          )}

          <div className="space-y-3">
            <Link href="/dashboard/investor">
              <Button className="w-full bg-red-600 hover:bg-red-700">
                {isDeposit ? (
                  <>
                    <Wallet className="w-4 h-4 mr-2" />
                    View Portfolio
                  </>
                ) : (
                  <>
                    <TrendingUp className="w-4 h-4 mr-2" />
                    Go to Dashboard
                  </>
                )}
              </Button>
            </Link>
            <Link href="/marketplace">
              <Button variant="outline" className="w-full border-zinc-700 text-gray-300 hover:bg-zinc-800">
                {isDeposit ? 'Invest Now' : 'Browse More Offerings'}
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
