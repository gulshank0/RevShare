'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DollarSign, TrendingUp, Users, Clock, ArrowUpRight } from 'lucide-react';
import Link from 'next/link';

export default function InvestorDashboard() {
  const { data: session } = useSession();
  const [investments, setInvestments] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInvestments();
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

  const calculateROI = (investment: any) => {
    const totalPayouts = investment.payouts
      .filter((p: any) => p.status === 'COMPLETED')
      .reduce((sum: number, p: any) => sum + p.amount, 0);
    return ((totalPayouts / investment.totalAmount) * 100).toFixed(2);
  };

  if (loading) {
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Investor Dashboard</h1>
          <p className="text-gray-600">Track your investments and returns</p>
        </div>
        <Link href="/marketplace">
          <Button>
            <ArrowUpRight className="h-4 w-4 mr-2" />
            Browse Marketplace
          </Button>
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Invested</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${summary?.totalInvested?.toLocaleString() || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Returns</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              ${summary?.totalReturns?.toLocaleString() || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {summary?.totalInvested > 0
                ? `${((summary.totalReturns / summary.totalInvested) * 100).toFixed(2)}% ROI`
                : '0% ROI'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Investments</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.activeInvestments || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Avg. ROI</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {investments.length > 0
                ? (
                    investments.reduce((sum, inv) => sum + parseFloat(calculateROI(inv)), 0) /
                    investments.length
                  ).toFixed(2)
                : 0}
              %
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Investments Table */}
      <Card>
        <CardHeader>
          <CardTitle>Your Investments</CardTitle>
          <CardDescription>Overview of all your channel investments</CardDescription>
        </CardHeader>
        <CardContent>
          {investments.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600 mb-4">You haven't made any investments yet</p>
              <Link href="/marketplace">
                <Button>Explore Opportunities</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {investments.map((investment) => (
                <div
                  key={investment.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold">{investment.offering.channel.channelName}</h3>
                      <Badge variant={investment.status === 'CONFIRMED' ? 'default' : 'secondary'}>
                        {investment.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{investment.offering.title}</p>
                  </div>

                  <div className="grid grid-cols-4 gap-8 text-right">
                    <div>
                      <p className="text-sm text-gray-600">Shares</p>
                      <p className="font-semibold">{investment.shares}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Invested</p>
                      <p className="font-semibold">${investment.totalAmount.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Returns</p>
                      <p className="font-semibold text-green-600">
                        $
                        {investment.payouts
                          .filter((p: any) => p.status === 'COMPLETED')
                          .reduce((sum: number, p: any) => sum + p.amount, 0)
                          .toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">ROI</p>
                      <p className="font-semibold">{calculateROI(investment)}%</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Payouts */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Payouts</CardTitle>
          <CardDescription>Your latest revenue distributions</CardDescription>
        </CardHeader>
        <CardContent>
          {investments.flatMap((inv) => inv.payouts).length === 0 ? (
            <p className="text-center text-gray-600 py-8">No payouts yet</p>
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
                  <div key={payout.id} className="flex items-center justify-between p-3 border rounded">
                    <div>
                      <p className="font-medium">{payout.channelName}</p>
                      <p className="text-sm text-gray-600">
                        {new Date(payout.createdAt).toLocaleDateString()} • {payout.revenueMonth}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-green-600">${payout.amount.toFixed(2)}</p>
                      <Badge variant={payout.status === 'COMPLETED' ? 'default' : 'secondary'}>
                        {payout.status}
                      </Badge>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
