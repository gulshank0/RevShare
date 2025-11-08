'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Search, ExternalLink, TrendingUp } from 'lucide-react';

interface Creator {
  id: string;
  title: string;
  description: string;
  thumbnails: {
    default?: { url: string };
    medium?: { url: string };
    high?: { url: string };
  };
  subscriberCount: number;
  viewCount: number;
  videoCount: number;
  country?: string;
  publishedAt: string;
  customUrl?: string;
}

export default function SearchPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [creators, setCreators] = useState<Creator[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Unknown';
    return new Date(dateString).toLocaleDateString();
  };

  const searchCreators = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setLoading(true);
    setError(null);
    setHasSearched(true);

    try {
      const response = await fetch(`/api/search/creators?q=${encodeURIComponent(searchQuery)}&maxResults=20`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to search creators');
      }

      setCreators(data.creators || []);
    } catch (err) {
      console.error('Search error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred while searching');
      setCreators([]);
    } finally {
      setLoading(false);
    }
  };

  const openChannel = (creator: Creator) => {
    const channelUrl = creator.customUrl 
      ? `https://youtube.com/${creator.customUrl}`
      : `https://youtube.com/channel/${creator.id}`;
    globalThis.open(channelUrl, '_blank');
  };

  const handleInterest = (creator: Creator) => {
    // Navigate to marketplace or investment page for this creator
    globalThis.location.href = `/marketplace?creator=${encodeURIComponent(creator.title)}&channelId=${creator.id}`;
  };

  const getChannelImage = (creator: Creator) => {
    return creator.thumbnails?.high?.url || 
           creator.thumbnails?.medium?.url || 
           creator.thumbnails?.default?.url ||
           '/api/placeholder/64/64';
  };

  return (
    <div className="min-h-screen bg-zinc-950">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-4">
            Discover YouTube <span className="text-red-600">Creators</span>
          </h1>
          <p className="text-lg md:text-xl text-gray-300 mb-8 max-w-2xl mx-auto leading-relaxed">
            Search and explore YouTube channels to find potential investment opportunities. 
            Connect with creators and discover their growth potential.
          </p>
          
          <form onSubmit={searchCreators} className="max-w-2xl mx-auto">
            <div className="flex shadow-lg rounded-lg bg-zinc-900 border border-zinc-700 overflow-hidden">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search for YouTube creators..."
                  className="w-full h-12 px-6 bg-transparent text-white placeholder-gray-400 focus:outline-none"
                />
              </div>
              <button 
                type="submit"
                disabled={loading || !searchQuery.trim()}
                className="px-6 h-12 bg-red-600 hover:bg-red-700 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <Search className="w-5 h-5 text-white" />
                )}
              </button>
            </div>
          </form>
        </div>

        {error && (
          <div className="bg-red-900/20 border border-red-600/30 rounded-lg p-4 mb-6 max-w-2xl mx-auto">
            <div className="flex items-center">
              <div className="shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-red-300 font-medium">Search Error</p>
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            </div>
          </div>
        )}

        {loading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mb-4"></div>
            <p className="text-gray-300">Searching YouTube creators...</p>
          </div>
        )}

        {hasSearched && !loading && creators.length === 0 && !error && (
          <div className="text-center py-12">
            <div className="max-w-md mx-auto">
              <Search className="mx-auto h-12 w-12 text-gray-500 mb-4" />
              <p className="text-gray-300 text-lg font-medium mb-2">No creators found</p>
              <p className="text-gray-400">
                No creators found for "{searchQuery}". Try different keywords or check your spelling.
              </p>
            </div>
          </div>
        )}

        {creators.length > 0 && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-semibold text-white">
                Search Results ({creators.length})
              </h2>
              <p className="text-gray-400">
                Found {creators.length} creator{creators.length === 1 ? '' : 's'}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {creators.map((creator) => (
                <Card key={creator.id} className="youtube-card hover:shadow-xl transition-all duration-200 border-zinc-700">
                  <CardHeader className="pb-3">
                    <div className="flex items-start space-x-3">
                      <img
                        src={getChannelImage(creator)}
                        alt={creator.title}
                        className="w-16 h-16 rounded-full object-cover border-2 border-zinc-600"
                        onError={(e) => {
                          e.currentTarget.src = '/api/placeholder/64/64';
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-lg line-clamp-2 text-white">
                          {creator.title}
                        </CardTitle>
                        {creator.country && (
                          <p className="text-sm text-gray-400 mt-1">{creator.country}</p>
                        )}
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="pt-0">
                    <CardDescription className="line-clamp-3 mb-4 text-gray-300">
                      {creator.description || 'No description available'}
                    </CardDescription>

                    <div className="grid grid-cols-3 gap-4 text-center text-sm mb-4">
                      <div className="bg-zinc-800 rounded-lg p-2">
                        <p className="font-semibold text-white">
                          {formatNumber(creator.subscriberCount)}
                        </p>
                        <p className="text-gray-400 text-xs">Subscribers</p>
                      </div>
                      <div className="bg-zinc-800 rounded-lg p-2">
                        <p className="font-semibold text-white">
                          {formatNumber(creator.viewCount)}
                        </p>
                        <p className="text-gray-400 text-xs">Views</p>
                      </div>
                      <div className="bg-zinc-800 rounded-lg p-2">
                        <p className="font-semibold text-white">
                          {creator.videoCount}
                        </p>
                        <p className="text-gray-400 text-xs">Videos</p>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-zinc-700">
                      <p className="text-xs text-gray-400 mb-3">
                        Created: {formatDate(creator.publishedAt)}
                      </p>
                      <div className="flex space-x-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => openChannel(creator)}
                          className="flex-1 youtube-button-outline border-zinc-600 text-gray-300 hover:bg-zinc-800"
                        >
                          <ExternalLink className="w-4 h-4 mr-1" />
                          View Channel
                        </Button>
                        <Button 
                          size="sm" 
                          className="flex-1 youtube-button"
                          onClick={() => handleInterest(creator)}
                        >
                          <TrendingUp className="w-4 h-4 mr-1" />
                          Interested
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {creators.length >= 20 && (
              <div className="text-center pt-6 border-t border-zinc-700">
                <p className="text-gray-400">
                  Showing top 20 results. Refine your search for more specific results.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}