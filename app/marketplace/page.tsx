'use client';

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Users, IndianRupee, Play, Filter, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";

export default function MarketplacePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [offerings, setOfferings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Get search parameters from URL (coming from search page)
  const creatorFilter = searchParams.get('creator');
  const channelIdFilter = searchParams.get('channelId');

  useEffect(() => {
    fetchOfferings();
  }, []);

  // Filter offerings based on URL parameters
  const filteredOfferings = useMemo(() => {
    if (!channelIdFilter && !creatorFilter) {
      return offerings;
    }
    
    return offerings.filter((offering) => {
      // Match by channel ID if available
      if (channelIdFilter && offering.channel?.channelId === channelIdFilter) {
        return true;
      }
      // Match by creator name (case-insensitive partial match)
      if (creatorFilter && offering.channel?.channelName?.toLowerCase().includes(creatorFilter.toLowerCase())) {
        return true;
      }
      return false;
    });
  }, [offerings, channelIdFilter, creatorFilter]);

  const clearFilters = () => {
    router.push('/marketplace');
  };

  const fetchOfferings = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/marketplace');
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to fetch offerings');
      }
      
      const data = await res.json();
      setOfferings(data.offerings || []);
    } catch (err: any) {
      console.error('Marketplace error:', err);
      setError(err.message || 'Failed to load marketplace');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading marketplace...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center max-w-md px-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-6 mb-4">
            <h2 className="text-xl font-bold text-red-400 mb-2">Error Loading Marketplace</h2>
            <p className="text-gray-400 mb-4">{error}</p>
            <div className="text-sm text-gray-500 bg-zinc-800 p-4 rounded border border-zinc-700">
              <p className="font-semibold mb-2 text-white">Setup Required:</p>
              <ol className="list-decimal list-inside space-y-1 text-left">
                <li>Configure database in .env file</li>
                <li>Run: npm run db:push</li>
                <li>Restart the development server</li>
              </ol>
            </div>
          </div>
          <Button className="youtube-button" onClick={fetchOfferings}>
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 px-4 py-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
            Investment Marketplace
          </h1>
          <p className="text-gray-400 text-lg">
            Discover vetted YouTube creators seeking investment for revenue sharing
          </p>
        </div>

        {/* Active Filter Indicator */}
        {(creatorFilter || channelIdFilter) && (
          <div className="flex items-center gap-2 mb-6 p-3 bg-red-900/20 border border-red-600/30 rounded-lg">
            <span className="text-gray-300">Filtering by creator:</span>
            <Badge className="bg-red-600 text-white">
              {creatorFilter || channelIdFilter}
            </Badge>
            <button
              onClick={clearFilters}
              className="ml-auto flex items-center gap-1 text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
              Clear filter
            </button>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-8 p-4 bg-zinc-900 rounded-lg border border-zinc-800">
          <button className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg text-white transition-colors">
            <Filter className="w-4 h-4" />
            All Categories
          </button>
          <select className="px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-red-600">
            <option>Min Investment</option>
            <option>₹1,000+</option>
            <option>₹5,000+</option>
            <option>₹10,000+</option>
          </select>
          <select className="px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-red-600">
            <option>Sort by</option>
            <option>Newest</option>
            <option>Funding Progress</option>
            <option>Returns Expected</option>
          </select>
        </div>

        {/* Offerings Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredOfferings.map((offering: any) => (
            <div key={offering.id} className="youtube-card group">
              {/* Thumbnail */}
              <div className="relative aspect-video bg-zinc-800 rounded-t-lg overflow-hidden">
                <div className="absolute inset-0 bg-linear-to-br from-red-600/20 to-zinc-800 flex items-center justify-center">
                  <Play className="w-12 h-12 text-white/80" />
                </div>
                <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-2 py-1 rounded">
                  {offering.duration}mo
                </div>
              </div>

              {/* Content */}
              <div className="p-4 space-y-3">
                <div className="flex items-start gap-3">
                  {offering.channel.analytics?.profileImage ? (
                    <img 
                      src={offering.channel.analytics.profileImage} 
                      alt={offering.channel.channelName}
                      className="w-10 h-10 rounded-full object-cover shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center shrink-0">
                      <span className="text-white font-bold text-sm">
                        {offering.channel.channelName[0]?.toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-white line-clamp-2 group-hover:text-red-400 transition-colors">
                      {offering.title}
                    </h3>
                    <p className="text-gray-400 text-sm mt-1">
                      {offering.channel.channelName}
                    </p>
                  </div>
                </div>

                <p className="text-gray-400 text-sm line-clamp-2">
                  {offering.description}
                </p>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-1">
                    <IndianRupee className="w-4 h-4 text-green-400" />
                    <span className="text-white">₹{offering.pricePerShare}/share</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="w-4 h-4 text-blue-400" />
                    <span className="text-gray-400">{offering.investorCount} investors</span>
                  </div>
                </div>

                {/* Progress */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Funding Progress</span>
                    <span className="text-white">{offering.fundingProgress}%</span>
                  </div>
                  <div className="w-full bg-zinc-700 rounded-full h-1.5">
                    <div 
                      className="bg-red-600 h-1.5 rounded-full transition-all duration-300" 
                      style={{ width: `${offering.fundingProgress}%` }}
                    ></div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <Badge className="bg-red-600/20 text-red-400 border-red-600/30">
                    {offering.sharePercentage}% Revenue Share
                  </Badge>
                </div>

                <Link href={`/marketplace/${offering.id}`} className="block">
                  <Button className="youtube-button w-full">
                    View Details
                  </Button>
                </Link>
              </div>
            </div>
          ))}
        </div>

        {filteredOfferings.length === 0 && (
          <div className="text-center py-16 bg-zinc-900 rounded-lg border border-zinc-800">
            <TrendingUp className="w-16 h-16 mx-auto text-gray-600 mb-4" />
            <h3 className="text-xl font-semibold mb-2 text-white">
              {(creatorFilter || channelIdFilter) ? 'No offerings found for this creator' : 'No offerings available yet'}
            </h3>
            <p className="text-gray-400 mb-6">
              {(creatorFilter || channelIdFilter) 
                ? 'This creator has not listed any offerings yet. Check back later or explore other creators.'
                : 'Be the first to list your channel or check back soon!'}
            </p>
            {(creatorFilter || channelIdFilter) ? (
              <Button className="youtube-button" onClick={clearFilters}>
                View All Offerings
              </Button>
            ) : (
              <Link href="/creator/onboard">
                <Button className="youtube-button">Become a Creator</Button>
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}