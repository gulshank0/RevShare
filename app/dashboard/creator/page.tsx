'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Youtube, DollarSign, Users, TrendingUp, Plus } from 'lucide-react';
import Link from 'next/link';

export default function CreatorDashboard() {
  const { data: session } = useSession();
  const [channels, setChannels] = useState<any[]>([]);
  const [offerings, setOfferings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [channelsRes, offeringsRes] = await Promise.all([
        fetch('/api/creator/channel'),
        fetch('/api/creator/offering'),
      ]);

      const channelsData = await channelsRes.json();
      const offeringsData = await offeringsRes.json();

      if (channelsData.success) setChannels(channelsData.channels);
      if (offeringsData.success) setOfferings(offeringsData.offerings);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateTotalRaised = () => {
    return offerings.reduce((sum, offering) => {
      const soldShares = offering.totalShares - offering.availableShares;
      return sum + soldShares * offering.pricePerShare;
    }, 0);
  };

  const calculateTotalInvestors = () => {
    return offerings.reduce((sum, offering) => sum + offering.investments.length, 0);
  };

  if (loading) {
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Creator Dashboard</h1>
          <p className="text-gray-600">Manage your channels and offerings</p>
        </div>
        <Link href="/creator/onboard">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Channel
          </Button>
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Raised</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${calculateTotalRaised().toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Investors</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{calculateTotalInvestors()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Offerings</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {offerings.filter((o) => o.status === 'ACTIVE').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Channels</CardTitle>
            <Youtube className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{channels.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Channels */}
      <Card>
        <CardHeader>
          <CardTitle>Your Channels</CardTitle>
          <CardDescription>Verified YouTube channels</CardDescription>
        </CardHeader>
        <CardContent>
          {channels.length === 0 ? (
            <div className="text-center py-12">
              <Youtube className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600 mb-4">No channels connected yet</p>
              <Link href="/creator/onboard">
                <Button>Connect YouTube Channel</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {channels.map((channel) => (
                <div key={channel.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-red-100 rounded-lg flex items-center justify-center">
                      <Youtube className="h-8 w-8 text-red-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{channel.channelName}</h3>
                        <Badge variant={channel.status === 'VERIFIED' ? 'default' : 'secondary'}>
                          {channel.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600">
                        {channel.analytics?.subscriberCount?.toLocaleString()} subscribers
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Link href={`/creator/channel/${channel.id}`}>
                      <Button variant="outline" size="sm">
                        View Analytics
                      </Button>
                    </Link>
                    <Link href={`/creator/offering/new?channelId=${channel.id}`}>
                      <Button size="sm">Create Offering</Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Offerings */}
      <Card>
        <CardHeader>
          <CardTitle>Your Offerings</CardTitle>
          <CardDescription>Revenue share opportunities</CardDescription>
        </CardHeader>
        <CardContent>
          {offerings.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600 mb-4">No offerings created yet</p>
              {channels.length > 0 && (
                <Link href={`/creator/offering/new?channelId=${channels[0].id}`}>
                  <Button>Create First Offering</Button>
                </Link>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {offerings.map((offering) => {
                const soldShares = offering.totalShares - offering.availableShares;
                const fundingProgress = Math.round((soldShares / offering.totalShares) * 100);
                const totalRaised = soldShares * offering.pricePerShare;

                return (
                  <div key={offering.id} className="p-4 border rounded-lg">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{offering.title}</h3>
                          <Badge
                            variant={
                              offering.status === 'ACTIVE'
                                ? 'default'
                                : offering.status === 'PENDING_APPROVAL'
                                ? 'secondary'
                                : 'outline'
                            }
                          >
                            {offering.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600">{offering.channel.channelName}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-600">Total Raised</p>
                        <p className="text-xl font-bold text-green-600">
                          ${totalRaised.toLocaleString()}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-4 mb-3">
                      <div>
                        <p className="text-sm text-gray-600">Revenue Share</p>
                        <p className="font-semibold">{offering.sharePercentage}%</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Funding Progress</p>
                        <p className="font-semibold">{fundingProgress}%</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Investors</p>
                        <p className="font-semibold">{offering.investments.length}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Duration</p>
                        <p className="font-semibold">{offering.duration} months</p>
                      </div>
                    </div>

                    {offering.investments.length > 0 && (
                      <div className="mt-3 pt-3 border-t">
                        <p className="text-sm font-medium mb-2">Recent Investors</p>
                        <div className="flex gap-2 flex-wrap">
                          {offering.investments.slice(0, 5).map((inv: any) => (
                            <Badge key={inv.id} variant="outline">
                              {inv.investor.name} - {inv.shares} shares
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
