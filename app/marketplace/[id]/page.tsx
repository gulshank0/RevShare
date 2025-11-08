'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, Youtube, TrendingUp, Users, DollarSign, Clock, Shield } from 'lucide-react';
import Link from 'next/link';

export default function OfferingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [offering, setOffering] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [shares, setShares] = useState(1);
  const [investing, setInvesting] = useState(false);

  useEffect(() => {
    if (params.id) {
      fetchOffering();
    }
  }, [params.id]);

  const fetchOffering = async () => {
    try {
      const res = await fetch(`/api/marketplace/${params.id}`);
      const data = await res.json();
      if (data.success) {
        setOffering(data.offering);
      }
    } catch (error) {
      console.error('Failed to fetch offering:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInvest = async () => {
    setInvesting(true);
    try {
      const res = await fetch('/api/investment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ offeringId: params.id, shares }),
      });

      const data = await res.json();
      if (data.success) {
        // Redirect to payment page with clientSecret
        window.location.href = `/payment?clientSecret=${data.payment.clientSecret}`;
      } else {
        alert(data.error || 'Investment failed');
      }
    } catch (error) {
      console.error('Investment error:', error);
      alert('Failed to process investment');
    } finally {
      setInvesting(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
  }

  if (!offering) {
    return <div className="text-center py-12">Offering not found</div>;
  }

  const soldShares = offering.totalShares - offering.availableShares;
  const fundingProgress = Math.round((soldShares / offering.totalShares) * 100);
  const totalAmount = shares * offering.pricePerShare;

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <Link href="/marketplace">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Marketplace
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-red-100 rounded-lg flex items-center justify-center">
                  <Youtube className="h-8 w-8 text-red-600" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-2xl">{offering.title}</CardTitle>
                  <CardDescription className="text-base">
                    {offering.channel.channelName}
                  </CardDescription>
                </div>
                <Badge variant="default" className="text-base px-4 py-2">
                  {offering.sharePercentage}% Revenue Share
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="font-semibold mb-2">About this Offering</h3>
                <p className="text-gray-700">{offering.description}</p>
              </div>

              <div>
                <div className="flex justify-between mb-2">
                  <span className="font-medium">Funding Progress</span>
                  <span className="font-semibold">{fundingProgress}%</span>
                </div>
                <Progress value={fundingProgress} className="h-3" />
                <div className="flex justify-between mt-2 text-sm text-gray-600">
                  <span>{soldShares.toLocaleString()} shares sold</span>
                  <span>{offering.availableShares.toLocaleString()} remaining</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium">Subscribers</span>
                  </div>
                  <p className="text-2xl font-bold">
                    {offering.channel.analytics?.subscriberCount?.toLocaleString() || 'N/A'}
                  </p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium">Total Views</span>
                  </div>
                  <p className="text-2xl font-bold">
                    {offering.channel.analytics?.viewCount?.toLocaleString() || 'N/A'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Investment Terms</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Revenue Share</p>
                  <p className="text-lg font-semibold">{offering.sharePercentage}%</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Duration</p>
                  <p className="text-lg font-semibold">{offering.duration} months</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Price per Share</p>
                  <p className="text-lg font-semibold">${offering.pricePerShare}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Min Investment</p>
                  <p className="text-lg font-semibold">${offering.minInvestment}</p>
                </div>
              </div>

              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-blue-900 mb-1">Investor Protection</h4>
                    <p className="text-sm text-blue-800">
                      All investments are backed by verified revenue data and legal agreements.
                      Payouts are processed automatically based on reported monthly revenue.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Investment Panel */}
        <div className="lg:col-span-1">
          <Card className="sticky top-8">
            <CardHeader>
              <CardTitle>Make an Investment</CardTitle>
              <CardDescription>Choose your investment amount</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Number of Shares</label>
                <input
                  type="number"
                  min="1"
                  max={offering.availableShares}
                  value={shares}
                  onChange={(e) => setShares(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full px-4 py-2 border rounded-md"
                />
                <p className="text-sm text-gray-600 mt-1">
                  Max: {offering.availableShares} shares available
                </p>
              </div>

              <div className="p-4 bg-gray-50 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm">Shares</span>
                  <span className="font-medium">{shares}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Price per Share</span>
                  <span className="font-medium">${offering.pricePerShare}</span>
                </div>
                <div className="border-t pt-2 flex justify-between">
                  <span className="font-semibold">Total Investment</span>
                  <span className="font-bold text-lg">${totalAmount.toLocaleString()}</span>
                </div>
              </div>

              {totalAmount < offering.minInvestment && (
                <p className="text-sm text-red-600">
                  Minimum investment is ${offering.minInvestment}
                </p>
              )}

              {offering.maxInvestment && totalAmount > offering.maxInvestment && (
                <p className="text-sm text-red-600">
                  Maximum investment is ${offering.maxInvestment}
                </p>
              )}

              <Button
                className="w-full"
                size="lg"
                onClick={handleInvest}
                disabled={
                  investing ||
                  totalAmount < offering.minInvestment ||
                  (offering.maxInvestment && totalAmount > offering.maxInvestment)
                }
              >
                {investing ? 'Processing...' : 'Invest Now'}
              </Button>

              <div className="text-xs text-gray-500 space-y-1">
                <p className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Expected monthly payouts starting next month
                </p>
                <p className="flex items-center gap-1">
                  <DollarSign className="h-3 w-3" />
                  {offering.sharePercentage}% of channel revenue for {offering.duration} months
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
