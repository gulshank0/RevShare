'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Youtube, DollarSign, Users, TrendingUp, Plus, BarChart3, Video } from 'lucide-react';
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
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 px-4 py-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white">Creator Studio</h1>
            <p className="text-gray-400">Manage your channels and revenue opportunities</p>
          </div>
          <Link href="/creator/onboard">
            <Button className="youtube-button">
              <Plus className="h-4 w-4 mr-2" />
              Add Channel
            </Button>
          </Link>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="youtube-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-400">Total Raised</h3>
              <DollarSign className="h-5 w-5 text-green-400" />
            </div>
            <div className="text-2xl font-bold text-white">${calculateTotalRaised().toLocaleString()}</div>
          </div>

          <div className="youtube-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-400">Total Investors</h3>
              <Users className="h-5 w-5 text-blue-400" />
            </div>
            <div className="text-2xl font-bold text-white">{calculateTotalInvestors()}</div>
          </div>

          <div className="youtube-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-400">Active Offerings</h3>
              <TrendingUp className="h-5 w-5 text-red-400" />
            </div>
            <div className="text-2xl font-bold text-white">
              {offerings.filter((o) => o.status === 'ACTIVE').length}
            </div>
          </div>

          <div className="youtube-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-400">Channels</h3>
              <Youtube className="h-5 w-5 text-red-600" />
            </div>
            <div className="text-2xl font-bold text-white">{channels.length}</div>
          </div>
        </div>

        {/* Channels Section */}
        <div className="youtube-card p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold text-white">Your Channels</h2>
              <p className="text-gray-400">Verified YouTube channels</p>
            </div>
          </div>

          {channels.length === 0 ? (
            <div className="text-center py-12">
              <Youtube className="h-16 w-16 mx-auto text-gray-600 mb-4" />
              <p className="text-gray-400 mb-6">No channels connected yet</p>
              <Link href="/creator/onboard">
                <Button className="youtube-button">Connect YouTube Channel</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {channels.map((channel) => (
                <div key={channel.id} className="flex items-center justify-between p-4 bg-zinc-800 rounded-lg border border-zinc-700">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center">
                      <Youtube className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-white">{channel.channelName}</h3>
                        <Badge 
                          className={channel.status === 'VERIFIED' ? 'bg-green-600/20 text-green-400 border-green-600/30' : 'bg-yellow-600/20 text-yellow-400 border-yellow-600/30'}
                        >
                          {channel.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-400">
                        {channel.analytics?.subscriberCount?.toLocaleString()} subscribers
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Link href={`/creator/channel/${channel.id}`}>
                      <Button className="youtube-button-outline text-sm">
                        <BarChart3 className="h-4 w-4 mr-2" />
                        Analytics
                      </Button>
                    </Link>
                    <Link href={`/creator/offering/new?channelId=${channel.id}`}>
                      <Button className="youtube-button text-sm">Create Offering</Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Offerings Section */}
        <div className="youtube-card p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold text-white">Your Offerings</h2>
              <p className="text-gray-400">Revenue share opportunities</p>
            </div>
          </div>

          {offerings.length === 0 ? (
            <div className="text-center py-12">
              <Video className="h-16 w-16 mx-auto text-gray-600 mb-4" />
              <p className="text-gray-400 mb-6">No offerings created yet</p>
              {channels.length > 0 && (
                <Link href={`/creator/offering/new?channelId=${channels[0].id}`}>
                  <Button className="youtube-button">Create First Offering</Button>
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
                  <div key={offering.id} className="p-4 bg-zinc-800 rounded-lg border border-zinc-700">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-white">{offering.title}</h3>
                          <Badge
                            className={
                              offering.status === 'ACTIVE'
                                ? 'bg-green-600/20 text-green-400 border-green-600/30'
                                : offering.status === 'PENDING_APPROVAL'
                                ? 'bg-yellow-600/20 text-yellow-400 border-yellow-600/30'
                                : 'bg-gray-600/20 text-gray-400 border-gray-600/30'
                            }
                          >
                            {offering.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-400">{offering.channel.channelName}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-400">Total Raised</p>
                        <p className="text-xl font-bold text-green-400">
                          ${totalRaised.toLocaleString()}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                      <div>
                        <p className="text-sm text-gray-400">Revenue Share</p>
                        <p className="font-semibold text-white">{offering.sharePercentage}%</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-400">Funding Progress</p>
                        <p className="font-semibold text-white">{fundingProgress}%</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-400">Investors</p>
                        <p className="font-semibold text-white">{offering.investments.length}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-400">Duration</p>
                        <p className="font-semibold text-white">{offering.duration} months</p>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mb-4">
                      <div className="w-full bg-zinc-700 rounded-full h-2">
                        <div 
                          className="bg-red-600 h-2 rounded-full transition-all duration-300" 
                          style={{ width: `${fundingProgress}%` }}
                        ></div>
                      </div>
                    </div>

                    {offering.investments.length > 0 && (
                      <div className="pt-4 border-t border-zinc-700">
                        <p className="text-sm font-medium mb-2 text-white">Recent Investors</p>
                        <div className="flex gap-2 flex-wrap">
                          {offering.investments.slice(0, 5).map((inv: any) => (
                            <Badge key={inv.id} className="bg-zinc-700 text-gray-300 border-zinc-600">
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
        </div>
      </div>
    </div>
  );
}
