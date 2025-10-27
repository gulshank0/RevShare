'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, Users, DollarSign, Clock } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function MarketplacePage() {
  const [offerings, setOfferings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchOfferings();
  }, []);

  const fetchOfferings = async () => {
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
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p>Loading marketplace...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center max-w-md">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-4">
            <h2 className="text-xl font-bold text-red-800 mb-2">Error Loading Marketplace</h2>
            <p className="text-red-600 mb-4">{error}</p>
            <div className="text-sm text-gray-600 bg-white p-4 rounded border">
              <p className="font-semibold mb-2">Setup Required:</p>
              <ol className="list-decimal list-inside space-y-1 text-left">
                <li>Configure database in .env file</li>
                <li>Run: npm run db:push</li>
                <li>Restart the development server</li>
              </ol>
            </div>
          </div>
          <Button onClick={() => window.location.reload()}>
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold">Investment Marketplace</h1>
        <p className="text-xl text-gray-600">
          Discover vetted YouTube creators seeking investment for revenue sharing
        </p>
      </div>

      {/* Filters */}
      <div className="flex gap-4 p-4 bg-white rounded-lg shadow">
        <select className="px-4 py-2 border rounded-md">
          <option>All Categories</option>
          <option>Gaming</option>
          <option>Education</option>
          <option>Entertainment</option>
          <option>Tech</option>
        </select>
        <select className="px-4 py-2 border rounded-md">
          <option>Min Investment</option>
          <option>$100+</option>
          <option>$500+</option>
          <option>$1,000+</option>
        </select>
        <select className="px-4 py-2 border rounded-md">
          <option>Sort by</option>
          <option>Newest</option>
          <option>Funding Progress</option>
          <option>Returns Expected</option>
        </select>
      </div>

      {/* Offerings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {offerings.map((offering: any) => (
          <Card key={offering.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <CardTitle className="text-lg">{offering.channel.channelName}</CardTitle>
                  <CardDescription>{offering.title}</CardDescription>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-600 line-clamp-3">
                {offering.description}
              </p>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Funding Progress</span>
                  <span>{offering.fundingProgress}%</span>
                </div>
                <Progress value={offering.fundingProgress} />
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="flex items-center gap-1">
                    <DollarSign className="h-4 w-4 text-green-600" />
                    <span className="font-medium">${offering.pricePerShare}/share</span>
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-1">
                    <Users className="h-4 w-4 text-blue-600" />
                    <span>{offering.investorCount} investors</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <Badge variant="secondary">
                  {offering.sharePercentage}% Revenue Share
                </Badge>
                <div className="flex items-center gap-1 text-sm text-gray-500">
                  <Clock className="h-4 w-4" />
                  <span>{offering.duration}mo</span>
                </div>
              </div>

              <Link href={`/marketplace/${offering.id}`}>
                <Button className="w-full">View Details</Button>
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>

      {offerings.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <TrendingUp className="h-16 w-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-xl font-semibold mb-2">No offerings available yet</h3>
          <p className="text-gray-600 mb-4">Be the first to list your channel or check back soon!</p>
          <Link href="/creator/onboard">
            <Button>Become a Creator</Button>
          </Link>
        </div>
      )}
    </div>
  );
}