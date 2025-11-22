'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { DollarSign, Users, Eye, ArrowUpRight, ArrowDownRight, TrendingUp, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ChannelMetrics {
  id: string;
  channelName: string;
  currentValue: number;
  change24h: number;
  changePercent: number;
  marketCap: number;
  volume: number;
  subscribers: number;
  views: number;
  investorCount: number;
  pricePerShare: number;
  availableShares: number;
  totalShares: number;
  historicalData: { date: string; value: number; volume: number }[];
  revenueData: { month: string; revenue: number }[];
}

export default function ChannelsMarketPage() {
  const [channels, setChannels] = useState<ChannelMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null);
  const [compareMode, setCompareMode] = useState(false);
  const [comparedChannels, setComparedChannels] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<'value' | 'change' | 'volume' | 'marketCap'>('value');

  useEffect(() => {
    fetchMarketData();
  }, []);

  const fetchMarketData = async () => {
    try {
      const response = await fetch('/api/marketplace');
      const data = await response.json();
      
      if (data.success) {
        // Transform offerings into channel metrics with mock historical data
        const channelMetrics: ChannelMetrics[] = data.offerings.map((offering: any, index: number) => {
          // Generate mock historical data (last 30 days)
          const historicalData = generateHistoricalData(offering.pricePerShare, 30);
          const revenueData = generateRevenueData(12);
          
          const marketCap = offering.pricePerShare * offering.totalShares;
          const change24h = historicalData.at(-1)!.value - historicalData.at(-2)!.value;
          const changePercent = (change24h / historicalData.at(-2)!.value) * 100;
          
          return {
            id: offering.id,
            channelName: offering.channel.channelName,
            currentValue: offering.pricePerShare,
            change24h,
            changePercent,
            marketCap,
            volume: historicalData.at(-1)!.volume,
            subscribers: offering.channel.analytics?.subscriberCount || Math.floor(Math.random() * 5000000),
            views: offering.channel.analytics?.viewCount || Math.floor(Math.random() * 100000000),
            investorCount: offering.investorCount,
            pricePerShare: offering.pricePerShare,
            availableShares: offering.availableShares,
            totalShares: offering.totalShares,
            historicalData,
            revenueData,
          };
        });
        
        setChannels(channelMetrics);
        if (channelMetrics.length > 0) {
          setSelectedChannel(channelMetrics[0].id);
        }
      }
    } catch (error) {
      console.error('Failed to fetch market data:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateHistoricalData = (basePrice: number, days: number) => {
    const data = [];
    let price = basePrice * 0.85; // Start from 85% of current price
    
    for (let i = days; i > 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      
      // Random walk with slight upward bias
      const change = (Math.random() - 0.45) * 0.05;
      price = price * (1 + change);
      
      data.push({
        date: date.toISOString().split('T')[0],
        value: Number.parseFloat(price.toFixed(2)),
        volume: Math.floor(Math.random() * 10000) + 1000,
      });
    }
    
    return data;
  };

  const generateRevenueData = (months: number) => {
    const data = [];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    for (let i = months - 1; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthIndex = date.getMonth();
      
      data.push({
        month: monthNames[monthIndex],
        revenue: Math.floor(Math.random() * 50000) + 10000,
      });
    }
    
    return data;
  };

  const sortedChannels = [...channels].sort((a, b) => {
    switch (sortBy) {
      case 'change':
        return b.changePercent - a.changePercent;
      case 'volume':
        return b.volume - a.volume;
      case 'marketCap':
        return b.marketCap - a.marketCap;
      default:
        return b.currentValue - a.currentValue;
    }
  });

  const selectedChannelData = channels.find(c => c.id === selectedChannel);
  const comparedChannelsData = channels.filter(c => comparedChannels.includes(c.id));

  const toggleCompare = (channelId: string) => {
    if (comparedChannels.includes(channelId)) {
      setComparedChannels(comparedChannels.filter(id => id !== channelId));
    } else if (comparedChannels.length < 3) {
      setComparedChannels([...comparedChannels, channelId]);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(value);
  };

  const formatNumber = (value: number) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}K`;
    }
    return value.toString();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading market data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 px-4 py-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-white flex items-center gap-3">
              <TrendingUp className="w-8 h-8 text-red-600" />
              Creator Market
            </h1>
            <p className="text-gray-400 mt-2 text-lg">Track and compare creator valuations in real-time</p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => setCompareMode(!compareMode)}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                compareMode
                  ? 'bg-red-600 text-white hover:bg-red-700'
                  : 'bg-zinc-800 text-gray-300 border border-zinc-700 hover:bg-zinc-700 hover:text-white'
              }`}
            >
              <BarChart3 className="w-4 h-4 mr-2" />
              {compareMode ? 'Exit Compare' : 'Compare Creators'}
            </Button>
          </div>
        </div>

        {/* Market Overview Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="youtube-card p-4">
            <div className="text-gray-400 text-sm mb-1">Total Market Cap</div>
            <div className="text-2xl font-bold text-white">
              {formatCurrency(channels.reduce((sum, c) => sum + c.marketCap, 0))}
            </div>
          </div>
          <div className="youtube-card p-4">
            <div className="text-gray-400 text-sm mb-1">Active Creators</div>
            <div className="text-2xl font-bold text-white">{channels.length}</div>
          </div>
          <div className="youtube-card p-4">
            <div className="text-gray-400 text-sm mb-1">24h Volume</div>
            <div className="text-2xl font-bold text-white">
              {formatCurrency(channels.reduce((sum, c) => sum + c.volume, 0))}
            </div>
          </div>
          <div className="youtube-card p-4">
            <div className="text-gray-400 text-sm mb-1">Total Investors</div>
            <div className="text-2xl font-bold text-white">
              {channels.reduce((sum, c) => sum + c.investorCount, 0)}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Market List */}
          <div className="lg:col-span-1">
            <div className="youtube-card">
              <div className="p-4 border-b border-zinc-800">
                <h2 className="text-xl font-semibold text-white mb-3">Creator Rankings</h2>
                <div className="flex gap-2">
                  <button
                    onClick={() => setSortBy('value')}
                    className={`text-xs px-3 py-1.5 rounded-lg transition ${
                      sortBy === 'value' ? 'bg-red-600 text-white' : 'bg-zinc-800 text-gray-400 hover:bg-zinc-700 hover:text-white'
                    }`}
                  >
                    Value
                  </button>
                  <button
                    onClick={() => setSortBy('change')}
                    className={`text-xs px-3 py-1.5 rounded-lg transition ${
                      sortBy === 'change' ? 'bg-red-600 text-white' : 'bg-zinc-800 text-gray-400 hover:bg-zinc-700 hover:text-white'
                    }`}
                  >
                    Change
                  </button>
                  <button
                    onClick={() => setSortBy('marketCap')}
                    className={`text-xs px-3 py-1.5 rounded-lg transition ${
                      sortBy === 'marketCap' ? 'bg-red-600 text-white' : 'bg-zinc-800 text-gray-400 hover:bg-zinc-700 hover:text-white'
                    }`}
                  >
                    Market Cap
                  </button>
                </div>
              </div>
              <div className="max-h-[600px] overflow-y-auto">
                {sortedChannels.map((channel) => (
                  <div
                    key={channel.id}
                    onClick={() => !compareMode && setSelectedChannel(channel.id)}
                    className={`p-4 border-b border-zinc-800 cursor-pointer transition-colors ${
                      selectedChannel === channel.id ? 'bg-zinc-800' : 'hover:bg-zinc-800/50'
                    } ${comparedChannels.includes(channel.id) ? 'bg-green-900/20' : ''}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center shrink-0">
                            <span className="text-white font-bold text-sm">
                              {channel.channelName[0]?.toUpperCase()}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-white truncate">{channel.channelName}</h3>
                              {compareMode && (
                                <input
                                  type="checkbox"
                                  checked={comparedChannels.includes(channel.id)}
                                  onChange={() => toggleCompare(channel.id)}
                                  className="w-4 h-4 accent-red-600"
                                  disabled={!comparedChannels.includes(channel.id) && comparedChannels.length >= 3}
                                />
                              )}
                            </div>
                            <div className="flex items-center gap-3 mt-1">
                              <span className="text-lg font-bold text-white">
                                {formatCurrency(channel.currentValue)}
                              </span>
                              <span
                                className={`flex items-center text-sm font-medium ${
                                  channel.changePercent >= 0 ? 'text-green-400' : 'text-red-400'
                                }`}
                              >
                                {channel.changePercent >= 0 ? (
                                  <ArrowUpRight className="w-4 h-4" />
                                ) : (
                                  <ArrowDownRight className="w-4 h-4" />
                                )}
                                {Math.abs(channel.changePercent).toFixed(2)}%
                              </span>
                            </div>
                            <div className="flex gap-4 mt-2 text-xs text-gray-400">
                              <span>Vol: {formatCurrency(channel.volume)}</span>
                              <span>MCap: {formatCurrency(channel.marketCap)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Charts Section */}
          <div className="lg:col-span-2 space-y-6">
            {!compareMode && selectedChannelData && (
              <>
                {/* Main Price Chart */}
                <div className="youtube-card">
                  <div className="p-4 border-b border-zinc-800">
                    <div className="flex justify-between items-start">
                      <div className="flex items-start gap-3">
                        <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center">
                          <span className="text-white font-bold">
                            {selectedChannelData.channelName[0]?.toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <h2 className="text-xl font-semibold text-white">{selectedChannelData.channelName}</h2>
                          <div className="flex items-center gap-4 mt-2">
                            <span className="text-3xl font-bold text-white">
                              {formatCurrency(selectedChannelData.currentValue)}
                            </span>
                            <Badge
                              className={`${
                              selectedChannelData.changePercent >= 0
                                ? 'bg-green-600/20 text-green-400 border-green-600/30 hover:bg-black'
                                : 'bg-red-600/20 text-red-400 border-red-600/30 hover:bg-black'
                              } transition-colors`}
                            >
                              {selectedChannelData.changePercent >= 0 ? '+' : ''}
                              {selectedChannelData.changePercent.toFixed(2)}%
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="p-4">
                    <ResponsiveContainer width="100%" height={300}>
                      <AreaChart data={selectedChannelData.historicalData}>
                        <defs>
                          <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
                        <XAxis 
                          dataKey="date" 
                          tick={{ fontSize: 12, fill: '#a1a1aa' }}
                          tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        />
                        <YAxis tick={{ fontSize: 12, fill: '#a1a1aa' }} tickFormatter={(value) => `$${value}`} />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#000000', border: '1px solid #3f3f46', borderRadius: '8px' }}
                          labelStyle={{ color: '#a1a1aa' }}
                          itemStyle={{ color: '#ffffff' }}
                          formatter={(value: any) => [formatCurrency(value), 'Value']}
                        />
                        <Area
                          type="monotone"
                          dataKey="value"
                          stroke="#ef4444"
                          strokeWidth={2}
                          fill="url(#colorValue)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="youtube-card p-4">
                    <div className="flex items-center gap-2 text-gray-400 mb-2">
                      <Users className="w-4 h-4" />
                      <span className="text-sm">Subscribers</span>
                    </div>
                    <div className="text-xl font-semibold text-white">
                      {formatNumber(selectedChannelData.subscribers)}
                    </div>
                  </div>
                  <div className="youtube-card p-4">
                    <div className="flex items-center gap-2 text-gray-400 mb-2">
                      <Eye className="w-4 h-4" />
                      <span className="text-sm">Total Views</span>
                    </div>
                    <div className="text-xl font-semibold text-white">
                      {formatNumber(selectedChannelData.views)}
                    </div>
                  </div>
                  <div className="youtube-card p-4">
                    <div className="flex items-center gap-2 text-gray-400 mb-2">
                      <DollarSign className="w-4 h-4" />
                      <span className="text-sm">Market Cap</span>
                    </div>
                    <div className="text-xl font-semibold text-white">
                      {formatCurrency(selectedChannelData.marketCap)}
                    </div>
                  </div>
                  <div className="youtube-card p-4">
                    <div className="flex items-center gap-2 text-gray-400 mb-2">
                      <Users className="w-4 h-4" />
                      <span className="text-sm">Investors</span>
                    </div>
                    <div className="text-xl font-semibold text-white">{selectedChannelData.investorCount}</div>
                  </div>
                </div>

                {/* Revenue Chart */}
                <div className="youtube-card">
                  <div className="p-4 border-b border-zinc-800">
                    <h3 className="text-lg font-semibold text-white">Monthly Revenue Performance</h3>
                    <p className="text-sm text-gray-400 mt-1">Last 12 months estimated revenue</p>
                  </div>
                  <div className="p-4">
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={selectedChannelData.revenueData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
                        <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#a1a1aa' }} />
                        <YAxis tick={{ fontSize: 12, fill: '#a1a1aa' }} tickFormatter={(value) => `$${formatNumber(value)}`} />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '8px' }}
                          labelStyle={{ color: '#a1a1aa' }}
                          itemStyle={{ color: '#ffffff' }}
                          formatter={(value: any) => [formatCurrency(value), 'Revenue']}
                        />
                        <Bar dataKey="revenue" fill="#10b981" radius={[8, 8, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Volume Chart */}
                <div className="youtube-card">
                  <div className="p-4 border-b border-zinc-800">
                    <h3 className="text-lg font-semibold text-white">Trading Volume</h3>
                    <p className="text-sm text-gray-400 mt-1">Daily trading volume over time</p>
                  </div>
                  <div className="p-4">
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={selectedChannelData.historicalData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
                        <XAxis 
                          dataKey="date"
                          tick={{ fontSize: 12, fill: '#a1a1aa' }}
                          tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        />
                        <YAxis tick={{ fontSize: 12, fill: '#a1a1aa' }} tickFormatter={(value) => formatNumber(value)} />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '8px' }}
                          labelStyle={{ color: '#a1a1aa' }}
                          itemStyle={{ color: '#ffffff' }}
                          formatter={(value: any) => [formatCurrency(value), 'Volume']}
                        />
                        <Bar dataKey="volume" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </>
            )}

            {/* Comparison View */}
            {compareMode && comparedChannelsData.length > 0 && (
              <>
                <div className="youtube-card">
                  <div className="p-4 border-b border-zinc-800">
                    <h3 className="text-lg font-semibold text-white">Value Comparison</h3>
                    <p className="text-sm text-gray-400 mt-1">Compare creator valuations over time</p>
                  </div>
                  <div className="p-4">
                    <ResponsiveContainer width="100%" height={350}>
                      <LineChart>
                        <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
                        <XAxis
                          dataKey="date"
                          type="category"
                          allowDuplicatedCategory={false}
                          tick={{ fontSize: 12, fill: '#a1a1aa' }}
                          tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        />
                        <YAxis tick={{ fontSize: 12, fill: '#a1a1aa' }} tickFormatter={(value) => `$${value}`} />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '8px' }}
                          labelStyle={{ color: '#a1a1aa' }}
                          itemStyle={{ color: '#ffffff' }}
                          formatter={(value: any) => formatCurrency(value)}
                        />
                        <Legend wrapperStyle={{ color: '#ffffff' }} />
                        {comparedChannelsData.map((channel, index) => {
                          const colors = ['#ef4444', '#10b981', '#f59e0b', '#3b82f6'];
                          return (
                            <Line
                              key={channel.id}
                              data={channel.historicalData}
                              type="monotone"
                              dataKey="value"
                              stroke={colors[index]}
                              strokeWidth={2}
                              name={channel.channelName}
                              dot={false}
                            />
                          );
                        })}
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Comparison Table */}
                <div className="youtube-card">
                  <div className="p-4 border-b border-zinc-800">
                    <h3 className="text-lg font-semibold text-white">Side-by-Side Comparison</h3>
                  </div>
                  <div className="p-4">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-zinc-800">
                            <th className="text-left py-3 px-4 font-semibold text-gray-400">Metric</th>
                            {comparedChannelsData.map((channel) => (
                              <th key={channel.id} className="text-left py-3 px-4 font-semibold text-white">
                                {channel.channelName}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="border-b border-zinc-800/50">
                            <td className="py-3 px-4 text-gray-400">Current Value</td>
                            {comparedChannelsData.map((channel) => (
                              <td key={channel.id} className="py-3 px-4 font-semibold text-white">
                                {formatCurrency(channel.currentValue)}
                              </td>
                            ))}
                          </tr>
                          <tr className="border-b border-zinc-800/50">
                            <td className="py-3 px-4 text-gray-400">24h Change</td>
                            {comparedChannelsData.map((channel) => (
                              <td
                                key={channel.id}
                                className={`py-3 px-4 font-semibold ${
                                  channel.changePercent >= 0 ? 'text-green-400' : 'text-red-400'
                                }`}
                              >
                                {channel.changePercent >= 0 ? '+' : ''}
                                {channel.changePercent.toFixed(2)}%
                              </td>
                            ))}
                          </tr>
                          <tr className="border-b border-zinc-800/50">
                            <td className="py-3 px-4 text-gray-400">Market Cap</td>
                            {comparedChannelsData.map((channel) => (
                              <td key={channel.id} className="py-3 px-4 text-white">
                                {formatCurrency(channel.marketCap)}
                              </td>
                            ))}
                          </tr>
                          <tr className="border-b border-zinc-800/50">
                            <td className="py-3 px-4 text-gray-400">Subscribers</td>
                            {comparedChannelsData.map((channel) => (
                              <td key={channel.id} className="py-3 px-4 text-white">
                                {formatNumber(channel.subscribers)}
                              </td>
                            ))}
                          </tr>
                          <tr className="border-b border-zinc-800/50">
                            <td className="py-3 px-4 text-gray-400">Total Views</td>
                            {comparedChannelsData.map((channel) => (
                              <td key={channel.id} className="py-3 px-4 text-white">
                                {formatNumber(channel.views)}
                              </td>
                            ))}
                          </tr>
                          <tr className="border-b border-zinc-800/50">
                            <td className="py-3 px-4 text-gray-400">Investors</td>
                            {comparedChannelsData.map((channel) => (
                              <td key={channel.id} className="py-3 px-4 text-white">
                                {channel.investorCount}
                              </td>
                            ))}
                          </tr>
                          <tr>
                            <td className="py-3 px-4 text-gray-400">Available Shares</td>
                            {comparedChannelsData.map((channel) => (
                              <td key={channel.id} className="py-3 px-4 text-white">
                                {channel.availableShares} / {channel.totalShares}
                              </td>
                            ))}
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </>
            )}

            {compareMode && comparedChannelsData.length === 0 && (
              <div className="youtube-card">
                <div className="py-16 text-center">
                  <BarChart3 className="w-16 h-16 mx-auto text-gray-600 mb-4" />
                  <p className="text-gray-400 text-lg">
                    Select up to 3 creators from the list to compare their performance
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}