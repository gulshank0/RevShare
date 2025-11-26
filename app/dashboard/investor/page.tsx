'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { IndianRupee, TrendingUp, Users, Clock, ArrowUpRight, Wallet, CreditCard } from 'lucide-react';
import Link from 'next/link';

export default function InvestorDashboard() {
  const { data: session } = useSession();
  const [investments, setInvestments] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [wallet, setWallet] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInvestments();
    fetchWallet();
  }, []);

  const fetchInvestments = async () => {
    try {
      const res = await fetch('/api/investment');
      const data = await res.json();
      if (data.success) {
        setInvestments(data.investments);
        setSummary(data.summary);
      }
    } catch (error) {
      console.error('Failed to fetch investments:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchWallet = async () => {
    try {
      const res = await fetch('/api/wallet');
      const data = await res.json();
      if (data.success) {
        setWallet(data.wallet);
      }
    } catch (error) {
      console.error('Failed to fetch wallet:', error);
    }
  };

  const calculateROI = (investment: any) => {
    const totalPayouts = investment.payouts
      .filter((p: any) => p.status === 'COMPLETED')
      .reduce((sum: number, p: any) => sum + p.amount, 0);
    return ((totalPayouts / investment.totalAmount) * 100).toFixed(2);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex justify-center items-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-white">Investor Dashboard</h1>
            <p className="text-gray-400 text-lg mt-2">Track your investments and returns</p>
          </div>
          <Link href="/marketplace">
            <Button className="youtube-button text-lg px-6 py-3 h-auto">
              <ArrowUpRight className="h-5 w-5 mr-2" />
              Browse Marketplace
            </Button>
          </Link>
        </div>

        {/* Wallet Balance Card */}
        <div className="youtube-card bg-gradient-to-br from-red-600/20 to-red-600/5 border-red-600/20">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-red-600/20 rounded-full flex items-center justify-center">
                  <Wallet className="h-7 w-7 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-400">Portfolio Wallet</h3>
                  <p className="text-3xl font-bold text-white mt-1">
                    ${wallet?.balance?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                  </p>
                </div>
              </div>
              <Link href="/payment">
                <Button className="youtube-button text-lg px-6 py-3 h-auto">
                  <CreditCard className="h-5 w-5 mr-2" />
                  Add Funds
                </Button>
              </Link>
            </div>
            
            <div className="grid grid-cols-3 gap-4 pt-4 border-t border-red-600/20">
              <div>
                <p className="text-sm text-gray-400">Total Deposited</p>
                <p className="text-lg font-semibold text-white mt-1">
                  ₹{wallet?.totalDeposited?.toLocaleString('en-IN') || '0'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Total Invested</p>
                <p className="text-lg font-semibold text-white mt-1">
                  ₹{wallet?.totalInvested?.toLocaleString('en-IN') || '0'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Available Balance</p>
                <p className="text-lg font-semibold text-green-400 mt-1">
                  ₹{wallet?.balance?.toLocaleString('en-IN') || '0'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="youtube-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-400">Total Invested</h3>
              <div className="w-10 h-10 bg-red-600/10 rounded-full flex items-center justify-center">
                <IndianRupee className="h-5 w-5 text-red-600" />
              </div>
            </div>
            <div className="text-2xl font-bold text-white">₹{summary?.totalInvested?.toLocaleString('en-IN') || 0}</div>
          </div>

          <div className="youtube-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-400">Total Returns</h3>
              <div className="w-10 h-10 bg-red-600/10 rounded-full flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-red-600" />
              </div>
            </div>
            <div className="text-2xl font-bold text-green-400">
              ₹{summary?.totalReturns?.toLocaleString('en-IN') || 0}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {summary?.totalInvested > 0
                ? `${((summary.totalReturns / summary.totalInvested) * 100).toFixed(2)}% ROI`
                : '0% ROI'}
            </p>
          </div>

          <div className="youtube-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-400">Active Investments</h3>
              <div className="w-10 h-10 bg-red-600/10 rounded-full flex items-center justify-center">
                <Users className="h-5 w-5 text-red-600" />
              </div>
            </div>
            <div className="text-2xl font-bold text-white">{summary?.activeInvestments || 0}</div>
          </div>

          <div className="youtube-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-400">Avg. ROI</h3>
              <div className="w-10 h-10 bg-red-600/10 rounded-full flex items-center justify-center">
                <Clock className="h-5 w-5 text-red-600" />
              </div>
            </div>
            <div className="text-2xl font-bold text-white">
              {investments.length > 0
                ? (
                    investments.reduce((sum, inv) => sum + Number.parseFloat(calculateROI(inv)), 0) /
                    investments.length
                  ).toFixed(2)
                : 0}
              %
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="youtube-card p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-red-600/10 rounded-full flex items-center justify-center">
                <Wallet className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Add Funds to Portfolio</h3>
                <p className="text-sm text-gray-400">Deposit money to invest in creator channels</p>
              </div>
            </div>
            <Link href="/payment">
              <Button className="youtube-button w-full text-lg py-6 h-auto">
                <Wallet className="h-5 w-5 mr-2" />
                Add Funds
              </Button>
            </Link>
          </div>

          <div className="youtube-card p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-red-600/10 rounded-full flex items-center justify-center">
                <ArrowUpRight className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Discover Opportunities</h3>
                <p className="text-sm text-gray-400">Browse and invest in creator channels</p>
              </div>
            </div>
            <Link href="/marketplace">
              <Button className="youtube-button w-full text-lg py-6 h-auto">
                <ArrowUpRight className="h-5 w-5 mr-2" />
                Browse Marketplace
              </Button>
            </Link>
          </div>
        </div>

        {/* Investments Table */}
        <div className="youtube-card">
          <div className="p-6 border-b border-zinc-800">
            <h2 className="text-xl font-bold text-white">Your Investments</h2>
            <p className="text-gray-400 mt-1">Overview of all your channel investments</p>
          </div>
          <div className="p-6">
            {investments.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-400 mb-6 text-lg">You haven't made any investments yet</p>
                <Link href="/marketplace">
                  <Button className="youtube-button text-lg px-6 py-3 h-auto">Explore Opportunities</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {investments.map((investment) => (
                  <div
                    key={investment.id}
                    className="flex items-center justify-between p-4 bg-zinc-800 rounded-lg hover:bg-zinc-700 transition-colors duration-200"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="font-semibold text-white">{investment.offering.channel.channelName}</h3>
                        <Badge 
                          variant={investment.status === 'CONFIRMED' ? 'default' : 'secondary'}
                          className={investment.status === 'CONFIRMED' ? 'bg-red-600 text-white' : 'bg-zinc-600 text-gray-300'}
                        >
                          {investment.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-400 mt-1">{investment.offering.title}</p>
                    </div>

                    <div className="grid grid-cols-4 gap-8 text-right">
                      <div>
                        <p className="text-sm text-gray-500">Shares</p>
                        <p className="font-semibold text-white">{investment.shares}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Invested</p>
                        <p className="font-semibold text-white">₹{investment.totalAmount.toLocaleString('en-IN')}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Returns</p>
                        <p className="font-semibold text-green-400">
                          $
                          {investment.payouts
                            .filter((p: any) => p.status === 'COMPLETED')
                            .reduce((sum: number, p: any) => sum + p.amount, 0)
                            .toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">ROI</p>
                        <p className="font-semibold text-white">{calculateROI(investment)}%</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent Payouts */}
        <div className="youtube-card">
          <div className="p-6 border-b border-zinc-800">
            <h2 className="text-xl font-bold text-white">Recent Payouts</h2>
            <p className="text-gray-400 mt-1">Your latest revenue distributions</p>
          </div>
          <div className="p-6">
            {investments.flatMap((inv) => inv.payouts).length === 0 ? (
              <p className="text-center text-gray-400 py-8 text-lg">No payouts yet</p>
            ) : (
              <div className="space-y-3">
                {investments
                  .flatMap((inv) =>
                    inv.payouts.map((payout: any) => ({
                      ...payout,
                      channelName: inv.offering.channel.channelName,
                    }))
                  )
                  .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                  .slice(0, 10)
                  .map((payout: any) => (
                    <div key={payout.id} className="flex items-center justify-between p-4 bg-zinc-800 rounded-lg">
                      <div>
                        <p className="font-medium text-white">{payout.channelName}</p>
                        <p className="text-sm text-gray-400">
                          {new Date(payout.createdAt).toLocaleDateString()} • {payout.revenueMonth}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-green-400">₹{payout.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                        <Badge 
                          variant={payout.status === 'COMPLETED' ? 'default' : 'secondary'}
                          className={payout.status === 'COMPLETED' ? 'bg-red-600 text-white' : 'bg-zinc-600 text-gray-300'}
                        >
                          {payout.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
