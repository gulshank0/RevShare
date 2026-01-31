'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { 
  TrendingUp, 
  TrendingDown, 
  ArrowUpRight, 
  ArrowDownRight,
  Search,
  Star,
  BarChart3,
  Users,
  DollarSign,
  Activity,
  ChevronRight,
  Filter
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MiniChart } from '@/components/exchange';

interface MarketData {
  id: string;
  symbol: string;
  channelName: string;
  price: number;
  priceChange: number;
  priceChangePercent: number;
  marketCap: number;
  volume24h: number;
  investorCount: number;
  availableShares: number;
  totalShares: number;
  sharePercentage: number;
  analytics?: any;
}

export default function MarketsOverviewPage() {
  const [markets, setMarkets] = useState<MarketData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'marketCap' | 'price' | 'change' | 'volume'>('marketCap');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [favorites, setFavorites] = useState<string[]>([]);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [stats, setStats] = useState({
    totalMarketCap: 0,
    total24hVolume: 0,
    totalMarkets: 0,
    totalInvestors: 0,
  });
  const [gainers, setGainers] = useState<MarketData[]>([]);
  const [losers, setLosers] = useState<MarketData[]>([]);
  const [mostTraded, setMostTraded] = useState<MarketData[]>([]);

  useEffect(() => {
    fetchMarketData();
    // Load favorites from localStorage
    const savedFavorites = localStorage.getItem('exchange_favorites');
    if (savedFavorites) {
      setFavorites(JSON.parse(savedFavorites));
    }
  }, []);

  const fetchMarketData = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/exchange/market-stats');
      const data = await response.json();
      
      if (data.success) {
        setMarkets(data.markets);
        setStats(data.stats);
        setGainers(data.gainers);
        setLosers(data.losers);
        setMostTraded(data.mostTraded);
      }
    } catch (error) {
      console.error('Failed to fetch market data:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleFavorite = (marketId: string) => {
    const newFavorites = favorites.includes(marketId)
      ? favorites.filter(id => id !== marketId)
      : [...favorites, marketId];
    setFavorites(newFavorites);
    localStorage.setItem('exchange_favorites', JSON.stringify(newFavorites));
  };

  const handleSort = (column: typeof sortBy) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
  };

  // Generate mini chart data for each market
  const generateChartData = (basePrice: number, positive: boolean) => {
    const data = [];
    let price = basePrice * 0.95;
    for (let i = 0; i < 24; i++) {
      const change = (Math.random() - (positive ? 0.4 : 0.6)) * 0.02;
      price = price * (1 + change);
      data.push({
        time: Date.now() - (24 - i) * 3600000,
        value: price,
      });
    }
    return data;
  };

  const filteredAndSortedMarkets = useMemo(() => {
    let filtered = markets.filter(market => {
      const matchesSearch = market.channelName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFavorites = !showFavoritesOnly || favorites.includes(market.id);
      return matchesSearch && matchesFavorites;
    });

    filtered.sort((a, b) => {
      let aValue: number, bValue: number;
      switch (sortBy) {
        case 'price':
          aValue = a.price;
          bValue = b.price;
          break;
        case 'change':
          aValue = a.priceChangePercent;
          bValue = b.priceChangePercent;
          break;
        case 'volume':
          aValue = a.volume24h;
          bValue = b.volume24h;
          break;
        default:
          aValue = a.marketCap;
          bValue = b.marketCap;
      }
      return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
    });

    return filtered;
  }, [markets, searchQuery, sortBy, sortOrder, showFavoritesOnly, favorites]);

  const formatCurrency = (value: number) => {
    if (value >= 10000000) return `₹${(value / 10000000).toFixed(2)}Cr`;
    if (value >= 100000) return `₹${(value / 100000).toFixed(2)}L`;
    return `₹${value.toLocaleString('en-IN')}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading markets...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 px-4 py-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <Activity className="w-8 h-8 text-red-600" />
              Markets Overview
            </h1>
            <p className="text-gray-400 mt-1">Track and analyze all creator markets</p>
          </div>
          <Link href="/exchange">
            <Button className="youtube-button">
              <TrendingUp className="w-4 h-4 mr-2" />
              Open Trading Terminal
            </Button>
          </Link>
        </div>

        {/* Global Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-4">
            <div className="flex items-center gap-2 text-gray-400 mb-2">
              <DollarSign className="w-4 h-4" />
              <span className="text-sm">Total Market Cap</span>
            </div>
            <p className="text-2xl font-bold text-white">{formatCurrency(stats.totalMarketCap)}</p>
          </div>
          <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-4">
            <div className="flex items-center gap-2 text-gray-400 mb-2">
              <BarChart3 className="w-4 h-4" />
              <span className="text-sm">24h Volume</span>
            </div>
            <p className="text-2xl font-bold text-white">{formatCurrency(stats.total24hVolume)}</p>
          </div>
          <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-4">
            <div className="flex items-center gap-2 text-gray-400 mb-2">
              <Activity className="w-4 h-4" />
              <span className="text-sm">Active Markets</span>
            </div>
            <p className="text-2xl font-bold text-white">{stats.totalMarkets}</p>
          </div>
          <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-4">
            <div className="flex items-center gap-2 text-gray-400 mb-2">
              <Users className="w-4 h-4" />
              <span className="text-sm">Total Investors</span>
            </div>
            <p className="text-2xl font-bold text-white">{stats.totalInvestors.toLocaleString()}</p>
          </div>
        </div>

        {/* Top Movers */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Top Gainers */}
          <div className="bg-zinc-900 rounded-lg border border-zinc-800 overflow-hidden">
            <div className="p-4 border-b border-zinc-800 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-400" />
              <h3 className="font-semibold text-white">Top Gainers</h3>
            </div>
            <div className="divide-y divide-zinc-800">
              {gainers.slice(0, 3).map(market => (
                <Link
                  key={market.id}
                  href={`/exchange?symbol=${market.id}`}
                  className="flex items-center justify-between p-3 hover:bg-zinc-800/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-green-600/20 rounded-full flex items-center justify-center">
                      <span className="text-green-400 font-bold text-xs">
                        {market.channelName[0]?.toUpperCase()}
                      </span>
                    </div>
                    <span className="text-white font-medium">{market.channelName}</span>
                  </div>
                  <span className="text-green-400 font-semibold">
                    +{market.priceChangePercent.toFixed(2)}%
                  </span>
                </Link>
              ))}
            </div>
          </div>

          {/* Top Losers */}
          <div className="bg-zinc-900 rounded-lg border border-zinc-800 overflow-hidden">
            <div className="p-4 border-b border-zinc-800 flex items-center gap-2">
              <TrendingDown className="w-5 h-5 text-red-400" />
              <h3 className="font-semibold text-white">Top Losers</h3>
            </div>
            <div className="divide-y divide-zinc-800">
              {losers.slice(0, 3).map(market => (
                <Link
                  key={market.id}
                  href={`/exchange?symbol=${market.id}`}
                  className="flex items-center justify-between p-3 hover:bg-zinc-800/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-red-600/20 rounded-full flex items-center justify-center">
                      <span className="text-red-400 font-bold text-xs">
                        {market.channelName[0]?.toUpperCase()}
                      </span>
                    </div>
                    <span className="text-white font-medium">{market.channelName}</span>
                  </div>
                  <span className="text-red-400 font-semibold">
                    {market.priceChangePercent.toFixed(2)}%
                  </span>
                </Link>
              ))}
            </div>
          </div>

          {/* Most Traded */}
          <div className="bg-zinc-900 rounded-lg border border-zinc-800 overflow-hidden">
            <div className="p-4 border-b border-zinc-800 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-400" />
              <h3 className="font-semibold text-white">Most Active</h3>
            </div>
            <div className="divide-y divide-zinc-800">
              {mostTraded.slice(0, 3).map(market => (
                <Link
                  key={market.id}
                  href={`/exchange?symbol=${market.id}`}
                  className="flex items-center justify-between p-3 hover:bg-zinc-800/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-600/20 rounded-full flex items-center justify-center">
                      <span className="text-blue-400 font-bold text-xs">
                        {market.channelName[0]?.toUpperCase()}
                      </span>
                    </div>
                    <span className="text-white font-medium">{market.channelName}</span>
                  </div>
                  <span className="text-blue-400 font-semibold">
                    {formatCurrency(market.volume24h)}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col md:flex-row gap-4 bg-zinc-900 rounded-lg border border-zinc-800 p-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search markets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-red-600"
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
                showFavoritesOnly 
                  ? 'bg-yellow-600/20 text-yellow-400 border border-yellow-600/30'
                  : 'bg-zinc-800 text-gray-400 hover:text-white'
              }`}
            >
              <Star className={`w-4 h-4 ${showFavoritesOnly ? 'fill-yellow-400' : ''}`} />
              Favorites
            </button>
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-red-600"
            >
              <option value="marketCap">Market Cap</option>
              <option value="price">Price</option>
              <option value="change">24h Change</option>
              <option value="volume">Volume</option>
            </select>
          </div>
        </div>

        {/* Markets Table */}
        <div className="bg-zinc-900 rounded-lg border border-zinc-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-800 text-left">
                  <th className="p-4 text-gray-400 font-medium text-sm w-8"></th>
                  <th className="p-4 text-gray-400 font-medium text-sm">#</th>
                  <th className="p-4 text-gray-400 font-medium text-sm">Market</th>
                  <th className="p-4 text-gray-400 font-medium text-sm text-right">Price</th>
                  <th className="p-4 text-gray-400 font-medium text-sm text-right">24h Change</th>
                  <th className="p-4 text-gray-400 font-medium text-sm text-right hidden md:table-cell">Market Cap</th>
                  <th className="p-4 text-gray-400 font-medium text-sm text-right hidden lg:table-cell">Volume 24h</th>
                  <th className="p-4 text-gray-400 font-medium text-sm text-right hidden lg:table-cell">Investors</th>
                  <th className="p-4 text-gray-400 font-medium text-sm text-center hidden md:table-cell">Chart</th>
                  <th className="p-4 text-gray-400 font-medium text-sm text-right">Trade</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {filteredAndSortedMarkets.map((market, index) => (
                  <tr key={market.id} className="hover:bg-zinc-800/50 transition-colors">
                    <td className="p-4">
                      <button
                        onClick={() => toggleFavorite(market.id)}
                        className="text-gray-500 hover:text-yellow-400 transition-colors"
                      >
                        <Star className={`w-4 h-4 ${favorites.includes(market.id) ? 'fill-yellow-400 text-yellow-400' : ''}`} />
                      </button>
                    </td>
                    <td className="p-4 text-gray-400">{index + 1}</td>
                    <td className="p-4">
                      <Link href={`/exchange?symbol=${market.id}`} className="flex items-center gap-3 group">
                        <div className="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center shrink-0">
                          <span className="text-white font-bold">
                            {market.channelName[0]?.toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="text-white font-medium group-hover:text-red-400 transition-colors">
                            {market.channelName}
                          </p>
                          <Badge className="bg-zinc-700 text-gray-300 text-xs">
                            {market.sharePercentage}% Revenue
                          </Badge>
                        </div>
                      </Link>
                    </td>
                    <td className="p-4 text-right">
                      <span className="text-white font-medium">
                        ₹{market.price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <span className={`flex items-center justify-end gap-1 font-medium ${
                        market.priceChangePercent >= 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {market.priceChangePercent >= 0 ? (
                          <ArrowUpRight className="w-4 h-4" />
                        ) : (
                          <ArrowDownRight className="w-4 h-4" />
                        )}
                        {Math.abs(market.priceChangePercent).toFixed(2)}%
                      </span>
                    </td>
                    <td className="p-4 text-right hidden md:table-cell">
                      <span className="text-gray-300">{formatCurrency(market.marketCap)}</span>
                    </td>
                    <td className="p-4 text-right hidden lg:table-cell">
                      <span className="text-gray-300">{formatCurrency(market.volume24h)}</span>
                    </td>
                    <td className="p-4 text-right hidden lg:table-cell">
                      <span className="text-gray-300">{market.investorCount}</span>
                    </td>
                    <td className="p-4 text-center hidden md:table-cell">
                      <div className="inline-block">
                        <MiniChart
                          data={generateChartData(market.price, market.priceChangePercent >= 0)}
                          width={80}
                          height={32}
                          positive={market.priceChangePercent >= 0}
                        />
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <Link href={`/exchange?symbol=${market.id}`}>
                        <Button size="sm" className="youtube-button">
                          Trade
                          <ChevronRight className="w-4 h-4 ml-1" />
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredAndSortedMarkets.length === 0 && (
            <div className="p-12 text-center">
              <Activity className="w-12 h-12 mx-auto text-gray-600 mb-4" />
              <p className="text-gray-400">
                {searchQuery ? 'No markets match your search' : 'No markets available'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
