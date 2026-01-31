'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Lock, 
  Unlock,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Users,
  DollarSign,
  Shield,
  Clock
} from 'lucide-react';

interface VaultDetails {
  vault: {
    id: string;
    offeringId: string;
    totalBalance: number;
    pendingRelease: number;
    totalDistributed: number;
    creatorShare: number;
    investorPool: number;
    status: string;
    lastRevenueAt: string | null;
    lastDistributionAt: string | null;
  };
  ownership: {
    creator: {
      userId: string;
      ownershipPercent: number;
      name: string;
    };
    investors: Array<{
      userId: string;
      shares: number;
      ownershipPercent: number;
      name: string;
    }>;
    totalInvestors: number;
  };
  statistics: {
    totalBalance: number;
    pendingRelease: number;
    totalDistributed: number;
    creatorUnclaimed: number;
    investorUnclaimed: number;
    availableClaims: number;
  };
}

interface Props {
  offeringId: string;
  isCreator?: boolean;
}

export default function EscrowVaultCard({ offeringId, isCreator = false }: Props) {
  const [vault, setVault] = useState<VaultDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [depositAmount, setDepositAmount] = useState('');
  const [revenueMonth, setRevenueMonth] = useState(
    new Date().toISOString().slice(0, 7) // YYYY-MM format
  );
  const [depositing, setDepositing] = useState(false);

  useEffect(() => {
    fetchVault();
  }, [offeringId]);

  const fetchVault = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/dex/vault?offeringId=${offeringId}`);
      const data = await res.json();
      
      if (data.success) {
        setVault(data);
      } else {
        setError(data.error);
      }
    } catch (err) {
      console.error('Failed to fetch vault:', err);
      setError('Failed to fetch vault');
    } finally {
      setLoading(false);
    }
  };

  const depositRevenue = async () => {
    if (!depositAmount || parseFloat(depositAmount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    try {
      setDepositing(true);
      setError(null);
      
      const res = await fetch('/api/dex/deposit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          offeringId,
          amount: parseFloat(depositAmount),
          revenueMonth,
          autoDistribute: true,
        }),
      });
      
      const data = await res.json();
      
      if (data.success) {
        setDepositAmount('');
        fetchVault();
      } else {
        setError(data.error);
      }
    } catch (err) {
      console.error('Failed to deposit:', err);
      setError('Failed to deposit revenue');
    } finally {
      setDepositing(false);
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
      case 'ACTIVE':
        return <Badge className="bg-green-100 text-green-800">Active</Badge>;
      case 'PAUSED':
        return <Badge className="bg-yellow-100 text-yellow-800">Paused</Badge>;
      case 'CLOSED':
        return <Badge className="bg-gray-100 text-gray-800">Closed</Badge>;
      case 'DISPUTED':
        return <Badge className="bg-red-100 text-red-800">Disputed</Badge>;
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

  if (!vault) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <Lock className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
            <p className="font-medium">No Escrow Vault</p>
            <p className="text-sm text-muted-foreground">
              A vault will be created when the offering becomes active
            </p>
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
              <Shield className="h-5 w-5" />
              DEX Escrow Vault
            </CardTitle>
            <CardDescription>
              Trustless revenue distribution powered by smart contract logic
            </CardDescription>
          </div>
          {getStatusBadge(vault.vault.status)}
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            {error}
            <button onClick={() => setError(null)} className="ml-auto">×</button>
          </div>
        )}

        {/* Vault Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-50 rounded-lg p-3">
            <div className="flex items-center gap-1 text-blue-600 mb-1">
              <Lock className="h-3 w-3" />
              <span className="text-xs font-medium">In Escrow</span>
            </div>
            <div className="text-lg font-bold text-blue-700">
              {formatCurrency(vault.statistics.totalBalance)}
            </div>
          </div>
          
          <div className="bg-green-50 rounded-lg p-3">
            <div className="flex items-center gap-1 text-green-600 mb-1">
              <CheckCircle2 className="h-3 w-3" />
              <span className="text-xs font-medium">Distributed</span>
            </div>
            <div className="text-lg font-bold text-green-700">
              {formatCurrency(vault.statistics.totalDistributed)}
            </div>
          </div>
          
          <div className="bg-purple-50 rounded-lg p-3">
            <div className="flex items-center gap-1 text-purple-600 mb-1">
              <TrendingUp className="h-3 w-3" />
              <span className="text-xs font-medium">Creator Share</span>
            </div>
            <div className="text-lg font-bold text-purple-700">
              {formatCurrency(vault.statistics.creatorUnclaimed)}
            </div>
          </div>
          
          <div className="bg-orange-50 rounded-lg p-3">
            <div className="flex items-center gap-1 text-orange-600 mb-1">
              <Users className="h-3 w-3" />
              <span className="text-xs font-medium">Investor Pool</span>
            </div>
            <div className="text-lg font-bold text-orange-700">
              {formatCurrency(vault.statistics.investorUnclaimed)}
            </div>
          </div>
        </div>

        {/* Ownership Distribution */}
        <div className="mb-6">
          <h4 className="font-medium mb-3 flex items-center gap-2">
            <Users className="h-4 w-4" />
            Ownership Distribution
          </h4>
          <div className="space-y-2">
            {/* Creator */}
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center">
                  <TrendingUp className="h-4 w-4 text-purple-600" />
                </div>
                <div>
                  <div className="font-medium">{vault.ownership.creator.name}</div>
                  <div className="text-xs text-muted-foreground">Creator</div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-bold">{vault.ownership.creator.ownershipPercent.toFixed(2)}%</div>
              </div>
            </div>

            {/* Investors */}
            {vault.ownership.investors.slice(0, 5).map((investor, index) => (
              <div key={investor.userId} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                    <span className="text-sm font-medium text-blue-600">{index + 1}</span>
                  </div>
                  <div>
                    <div className="font-medium">{investor.name || 'Anonymous Investor'}</div>
                    <div className="text-xs text-muted-foreground">{investor.shares} shares</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold">{investor.ownershipPercent.toFixed(2)}%</div>
                </div>
              </div>
            ))}

            {vault.ownership.totalInvestors > 5 && (
              <div className="text-center text-sm text-muted-foreground py-2">
                +{vault.ownership.totalInvestors - 5} more investors
              </div>
            )}
          </div>
        </div>

        {/* Revenue Deposit (Creator Only) */}
        {isCreator && vault.vault.status === 'ACTIVE' && (
          <div className="border-t pt-6">
            <h4 className="font-medium mb-3 flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Deposit Revenue
            </h4>
            <p className="text-sm text-muted-foreground mb-4">
              Deposit YouTube revenue into escrow. Funds will be automatically distributed to all stakeholders based on their ownership percentage.
            </p>
            <div className="flex gap-3">
              <Input
                type="number"
                placeholder="Amount (₹)"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                className="flex-1"
              />
              <Input
                type="month"
                value={revenueMonth}
                onChange={(e) => setRevenueMonth(e.target.value)}
                className="w-40"
              />
              <Button
                onClick={depositRevenue}
                disabled={depositing || !depositAmount}
                className="bg-green-600 hover:bg-green-700"
              >
                {depositing ? 'Depositing...' : 'Deposit & Distribute'}
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* Last Activity */}
        {(vault.vault.lastRevenueAt || vault.vault.lastDistributionAt) && (
          <div className="border-t pt-4 mt-6 flex items-center gap-4 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            {vault.vault.lastRevenueAt && (
              <span>Last revenue: {new Date(vault.vault.lastRevenueAt).toLocaleDateString()}</span>
            )}
            {vault.vault.lastDistributionAt && (
              <span>Last distribution: {new Date(vault.vault.lastDistributionAt).toLocaleDateString()}</span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
