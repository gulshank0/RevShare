'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Wallet, 
  ArrowUpRight, 
  ArrowDownRight, 
  Clock, 
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Users,
  Percent
} from 'lucide-react';

interface Claim {
  id: string;
  amount: number;
  ownershipPercent: number;
  claimantType: 'CREATOR' | 'INVESTOR';
  status: 'AVAILABLE' | 'CLAIMED' | 'EXPIRED';
  createdAt: string;
  expiresAt: string | null;
  vault: {
    offering: {
      channel: {
        channelName: string;
      };
    };
  };
}

interface ClaimsSummary {
  totalAvailable: number;
  totalClaimed: number;
  totalExpired: number;
  availableCount: number;
}

export default function EscrowClaimsCard() {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [summary, setSummary] = useState<ClaimsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchClaims();
  }, []);

  const fetchClaims = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/dex/claims?status=all');
      const data = await res.json();
      
      if (data.success) {
        setClaims(data.claims);
        setSummary(data.summary);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Failed to fetch claims');
    } finally {
      setLoading(false);
    }
  };

  const processClaim = async (claimId: string) => {
    try {
      setProcessing(claimId);
      const res = await fetch('/api/dex/claims', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ claimId }),
      });
      const data = await res.json();
      
      if (data.success) {
        fetchClaims();
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Failed to process claim');
    } finally {
      setProcessing(null);
    }
  };

  const claimAll = async () => {
    try {
      setProcessing('all');
      const res = await fetch('/api/dex/claims', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ claimAll: true }),
      });
      const data = await res.json();
      
      if (data.success) {
        fetchClaims();
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Failed to process claims');
    } finally {
      setProcessing(null);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'AVAILABLE':
        return <Badge className="bg-green-100 text-green-800">Available</Badge>;
      case 'CLAIMED':
        return <Badge className="bg-blue-100 text-blue-800">Claimed</Badge>;
      case 'EXPIRED':
        return <Badge className="bg-gray-100 text-gray-800">Expired</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              Revenue Claims
            </CardTitle>
            <CardDescription>
              Your share of revenue from DEX Escrow
            </CardDescription>
          </div>
          {summary && summary.availableCount > 0 && (
            <Button 
              onClick={claimAll}
              disabled={processing === 'all'}
              className="bg-green-600 hover:bg-green-700"
            >
              {processing === 'all' ? 'Processing...' : `Claim All (${formatCurrency(summary.totalAvailable)})`}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}

        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-green-50 rounded-lg p-4">
              <div className="flex items-center gap-2 text-green-600 mb-1">
                <ArrowDownRight className="h-4 w-4" />
                <span className="text-sm font-medium">Available</span>
              </div>
              <div className="text-2xl font-bold text-green-700">
                {formatCurrency(summary.totalAvailable)}
              </div>
              <div className="text-xs text-green-600">
                {summary.availableCount} claims pending
              </div>
            </div>
            
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center gap-2 text-blue-600 mb-1">
                <CheckCircle2 className="h-4 w-4" />
                <span className="text-sm font-medium">Claimed</span>
              </div>
              <div className="text-2xl font-bold text-blue-700">
                {formatCurrency(summary.totalClaimed)}
              </div>
              <div className="text-xs text-blue-600">
                Total received
              </div>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center gap-2 text-gray-600 mb-1">
                <Clock className="h-4 w-4" />
                <span className="text-sm font-medium">Expired</span>
              </div>
              <div className="text-2xl font-bold text-gray-700">
                {formatCurrency(summary.totalExpired)}
              </div>
              <div className="text-xs text-gray-600">
                Not claimed in time
              </div>
            </div>
          </div>
        )}

        {/* Claims List */}
        <div className="space-y-3">
          {claims.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Wallet className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No revenue claims yet</p>
              <p className="text-sm">When revenue is distributed, your claims will appear here</p>
            </div>
          ) : (
            claims.filter(c => c.status === 'AVAILABLE').map((claim) => (
              <div
                key={claim.id}
                className="flex items-center justify-between p-4 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    {claim.claimantType === 'CREATOR' ? (
                      <TrendingUp className="h-5 w-5 text-primary" />
                    ) : (
                      <Users className="h-5 w-5 text-primary" />
                    )}
                  </div>
                  <div>
                    <div className="font-medium">{claim.vault.offering.channel.channelName}</div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Percent className="h-3 w-3" />
                      <span>{claim.ownershipPercent.toFixed(2)}% ownership</span>
                      <span className="mx-1">•</span>
                      {getStatusBadge(claim.status)}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="font-bold text-lg">{formatCurrency(claim.amount)}</div>
                    {claim.expiresAt && (
                      <div className="text-xs text-muted-foreground">
                        Expires {new Date(claim.expiresAt).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                  <Button
                    size="sm"
                    onClick={() => processClaim(claim.id)}
                    disabled={processing === claim.id}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {processing === claim.id ? 'Claiming...' : 'Claim'}
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Claimed history */}
        {claims.filter(c => c.status === 'CLAIMED').length > 0 && (
          <div className="mt-6">
            <h4 className="font-medium mb-3 text-muted-foreground">Recent Claims</h4>
            <div className="space-y-2">
              {claims.filter(c => c.status === 'CLAIMED').slice(0, 5).map((claim) => (
                <div
                  key={claim.id}
                  className="flex items-center justify-between py-2 border-b last:border-0"
                >
                  <div className="text-sm">
                    <span className="font-medium">{claim.vault.offering.channel.channelName}</span>
                    <span className="text-muted-foreground"> • {claim.ownershipPercent.toFixed(2)}%</span>
                  </div>
                  <div className="text-sm font-medium text-green-600">
                    +{formatCurrency(claim.amount)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
