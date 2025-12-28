'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  TrendingUp, 
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Search,
  X,
  Check,
  AlertCircle,
  RefreshCw,
  BarChart3,
  LineChart,
  CandlestickChart,
  Wallet,
  Info,
  Star,
  ChevronDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  TradingViewChart, 
  OrderBook, 
  TradingPanel, 
  RecentTrades,
  MarketDepth 
} from '@/components/exchange';
import { Time } from 'lightweight-charts';

interface Offering {
  id: string;
  title: string;
  pricePerShare: number;
  totalShares: number;
  availableShares: number;
  sharePercentage: number;
  channel: {
    id: string;
    channelName: string;
    channelUrl: string;
    analytics?: {
      subscriberCount?: number;
      viewCount?: number;
      profileImage?: string;
    };
  };
}

interface SellOrder {
  id: string;
  sharesRemaining: number;
  pricePerShare: number;
  minShares: number;
  status: string;
  createdAt: string;
  seller: {
    id: string;
    name: string | null;
  };
}

interface Trade {
  id: string;
  shares: number;
  pricePerShare: number;
  totalAmount: number;
  status: string;
  createdAt: string;
  buyerId: string;
  sellerId: string;
}

interface WalletData {
  balance: number;
  totalDeposited: number;
  totalInvested: number;
}

interface Investment {
  id: string;
  shares: number;
  totalAmount: number;
  status: string;
  offeringId: string;
}

interface ChartDataPoint {
  time: Time;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export default function ExchangePage() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const [offerings, setOfferings] = useState<Offering[]>([]);
  const [selectedOfferingId, setSelectedOfferingId] = useState<string | null>(
    searchParams.get('symbol') || null
  );
  const [sellOrders, setSellOrders] = useState<SellOrder[]>([]);
  const [recentTrades, setRecentTrades] = useState<Trade[]>([]);
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  // Chart settings
  const [chartType, setChartType] = useState<'candlestick' | 'line' | 'area'>('candlestick');
  const [timeframe, setTimeframe] = useState('1D');
  const [searchQuery, setSearchQuery] = useState('');
  const [showMarketList, setShowMarketList] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);

  // Fetch offerings
  const fetchOfferings = useCallback(async () => {
    try {
      const response = await fetch('/api/marketplace');
      const data = await response.json();
      if (data.success) {
        setOfferings(data.offerings);
        if (!selectedOfferingId && data.offerings.length > 0) {
          setSelectedOfferingId(data.offerings[0].id);
        }
      }
    } catch (error) {
      console.error('Failed to fetch offerings:', error);
    }
  }, [selectedOfferingId]);

  // Fetch sell orders for selected offering
  const fetchSellOrders = useCallback(async (offeringId: string) => {
    try {
      const response = await fetch(`/api/trading/sell-orders?offeringId=${offeringId}`);
      const data = await response.json();
      if (data.success) {
        setSellOrders(data.sellOrders);
      }
    } catch (error) {
      console.error('Failed to fetch sell orders:', error);
    }
  }, []);

  // Fetch recent trades
  const fetchRecentTrades = useCallback(async (offeringId: string) => {
    try {
      const response = await fetch(`/api/trading/trades?offeringId=${offeringId}`);
      const data = await response.json();
      if (data.success) {
        setRecentTrades(data.trades);
      }
    } catch (error) {
      console.error('Failed to fetch trades:', error);
    }
  }, []);

  // Fetch user data
  const fetchUserData = useCallback(async () => {
    if (!session?.user) return;
    
    try {
      const [walletRes, investmentsRes] = await Promise.all([
        fetch('/api/wallet'),
        fetch('/api/investment'),
      ]);
      
      const walletData = await walletRes.json();
      const investmentsData = await investmentsRes.json();
      
      if (walletData.success) {
        setWallet(walletData.wallet);
      }
      if (investmentsData.success) {
        setInvestments(investmentsData.investments.filter((i: Investment) => 
          i.status === 'CONFIRMED' && i.shares > 0
        ));
      }
    } catch (error) {
      console.error('Failed to fetch user data:', error);
    }
  }, [session]);

  // Initial data fetch
  useEffect(() => {
    const initData = async () => {
      setLoading(true);
      await fetchOfferings();
      await fetchUserData();
      setLoading(false);
    };
    initData();
  }, [fetchOfferings, fetchUserData]);

  // Fetch data when selected offering changes
  useEffect(() => {
    if (selectedOfferingId) {
      fetchSellOrders(selectedOfferingId);
      fetchRecentTrades(selectedOfferingId);
      
      // Update URL
      router.replace(`/exchange?symbol=${selectedOfferingId}`, { scroll: false });
    }
  }, [selectedOfferingId, fetchSellOrders, fetchRecentTrades, router]);

  // Selected offering data
  const selectedOffering = useMemo(() => 
    offerings.find(o => o.id === selectedOfferingId),
    [offerings, selectedOfferingId]
  );

  // User's shares in selected offering
  const userShares = useMemo(() => {
    const investment = investments.find(i => i.offeringId === selectedOfferingId);
    return investment?.shares || 0;
  }, [investments, selectedOfferingId]);

  // Generate chart data (mock historical data based on current price)
  const chartData = useMemo((): ChartDataPoint[] => {
    if (!selectedOffering) return [];
    
    const basePrice = selectedOffering.pricePerShare;
    const data: ChartDataPoint[] = [];
    let price = basePrice * 0.85;
    
    const days = timeframe === '1H' ? 1 : timeframe === '4H' ? 2 : timeframe === '1D' ? 30 : timeframe === '1W' ? 90 : 365;
    const interval = timeframe === '1H' ? 60 : timeframe === '4H' ? 240 : 1440; // minutes
    
    for (let i = days; i >= 0; i--) {
      const date = new Date();
      date.setMinutes(date.getMinutes() - (i * interval));
      
      const change = (Math.random() - 0.45) * 0.03;
      const open = price;
      price = price * (1 + change);
      const close = price;
      const high = Math.max(open, close) * (1 + Math.random() * 0.01);
      const low = Math.min(open, close) * (1 - Math.random() * 0.01);
      
      data.push({
        time: (date.getTime() / 1000) as Time,
        open: Number(open.toFixed(2)),
        high: Number(high.toFixed(2)),
        low: Number(low.toFixed(2)),
        close: Number(close.toFixed(2)),
        volume: Math.floor(Math.random() * 10000) + 500,
      });
    }
    
    // Ensure last candle closes at current price
    if (data.length > 0) {
      data[data.length - 1].close = basePrice;
    }
    
    return data;
  }, [selectedOffering, timeframe]);

  // Calculate price change
  const priceChange = useMemo(() => {
    if (chartData.length < 2) return { change: 0, percent: 0 };
    const firstPrice = chartData[0].open;
    const lastPrice = chartData[chartData.length - 1].close;
    const change = lastPrice - firstPrice;
    const percent = (change / firstPrice) * 100;
    return { change, percent };
  }, [chartData]);

  // Order book data
  const orderBookData = useMemo(() => {
    const buyOrders: { price: number; shares: number; total: number; orderId?: string }[] = [];
    const sellOrdersFormatted: { price: number; shares: number; total: number; orderId?: string }[] = [];
    
    // Convert sell orders to order book format
    sellOrders.forEach(order => {
      sellOrdersFormatted.push({
        price: order.pricePerShare,
        shares: order.sharesRemaining,
        total: order.pricePerShare * order.sharesRemaining,
        orderId: order.id,
      });
    });
    
    // Generate mock buy orders (bids) based on current price
    if (selectedOffering) {
      const currentPrice = selectedOffering.pricePerShare;
      for (let i = 1; i <= 10; i++) {
        const bidPrice = currentPrice * (1 - i * 0.005);
        buyOrders.push({
          price: Number(bidPrice.toFixed(2)),
          shares: Math.floor(Math.random() * 500) + 50,
          total: 0,
        });
        buyOrders[buyOrders.length - 1].total = buyOrders[buyOrders.length - 1].price * buyOrders[buyOrders.length - 1].shares;
      }
    }
    
    return { buyOrders, sellOrders: sellOrdersFormatted };
  }, [sellOrders, selectedOffering]);

  // Market depth data
  const marketDepthData = useMemo(() => {
    if (!selectedOffering) return [];
    
    const currentPrice = selectedOffering.pricePerShare;
    const data = [];
    
    for (let i = -5; i <= 5; i++) {
      const price = currentPrice * (1 + i * 0.01);
      data.push({
        price: Number(price.toFixed(2)),
        bidVolume: i <= 0 ? Math.floor(Math.random() * 1000) + 100 : 0,
        askVolume: i >= 0 ? Math.floor(Math.random() * 1000) + 100 : 0,
      });
    }
    
    return data;
  }, [selectedOffering]);

  // Recent trades formatted
  const formattedTrades = useMemo(() => {
    return recentTrades.map(trade => ({
      id: trade.id,
      price: trade.pricePerShare,
      shares: trade.shares,
      total: trade.totalAmount,
      side: trade.buyerId === session?.user?.id ? 'buy' : 'sell' as 'buy' | 'sell',
      timestamp: trade.createdAt,
    }));
  }, [recentTrades, session?.user?.id]);

  // Handle order placement
  const handlePlaceOrder = async (order: {
    type: 'buy' | 'sell';
    orderType: 'market' | 'limit';
    price: number;
    shares: number;
    total: number;
  }) => {
    if (!session?.user) {
      setMessage({ type: 'error', text: 'Please sign in to trade' });
      return;
    }

    if (!selectedOfferingId) {
      setMessage({ type: 'error', text: 'Please select a channel to trade' });
      return;
    }

    setProcessing(true);

    try {
      if (order.type === 'buy') {
        // For buying, we need to match with existing sell orders
        // Find best matching sell order
        const matchingOrder = sellOrders
          .filter(o => o.pricePerShare <= order.price && o.sharesRemaining >= order.shares)
          .sort((a, b) => a.pricePerShare - b.pricePerShare)[0];

        if (!matchingOrder) {
          // If no exact match, create a buy limit order (or handle market order differently)
          setMessage({ 
            type: 'error', 
            text: 'No matching sell orders available at this price. Try a higher price or market order.' 
          });
          setProcessing(false);
          return;
        }

        // Execute trade
        const response = await fetch('/api/trading/trades', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sellOrderId: matchingOrder.id,
            shares: order.shares,
          }),
        });

        const data = await response.json();

        if (data.success) {
          setMessage({ type: 'success', text: `Successfully bought ${order.shares} shares!` });
          // Refresh data
          fetchSellOrders(selectedOfferingId);
          fetchRecentTrades(selectedOfferingId);
          fetchUserData();
        } else {
          setMessage({ type: 'error', text: data.error || 'Trade failed' });
        }
      } else {
        // For selling, create a sell order
        const investment = investments.find(i => i.offeringId === selectedOfferingId);
        
        if (!investment) {
          setMessage({ type: 'error', text: 'You don\'t have any shares to sell' });
          setProcessing(false);
          return;
        }

        const response = await fetch('/api/trading/sell-orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            investmentId: investment.id,
            shares: order.shares,
            pricePerShare: order.price,
          }),
        });

        const data = await response.json();

        if (data.success) {
          setMessage({ type: 'success', text: `Sell order placed for ${order.shares} shares!` });
          fetchSellOrders(selectedOfferingId);
          fetchUserData();
        } else {
          setMessage({ type: 'error', text: data.error || 'Failed to place sell order' });
        }
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Transaction failed. Please try again.' });
    } finally {
      setProcessing(false);
      setTimeout(() => setMessage(null), 5000);
    }
  };

  // Handle price click from order book
  const handleOrderBookClick = (price: number, type: 'buy' | 'sell') => {
    // This would populate the trading panel with the clicked price
    console.log(`Clicked ${type} at price ${price}`);
  };

  // Toggle favorite
  const toggleFavorite = (offeringId: string) => {
    setFavorites(prev => 
      prev.includes(offeringId) 
        ? prev.filter(id => id !== offeringId)
        : [...prev, offeringId]
    );
  };

  // Filter offerings by search
  const filteredOfferings = useMemo(() => {
    return offerings.filter(o => 
      o.channel.channelName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.title.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [offerings, searchQuery]);

  // Best bid and ask
  const bestBid = useMemo(() => {
    if (orderBookData.buyOrders.length === 0) return selectedOffering?.pricePerShare || 0;
    return Math.max(...orderBookData.buyOrders.map(o => o.price));
  }, [orderBookData.buyOrders, selectedOffering]);

  const bestAsk = useMemo(() => {
    if (orderBookData.sellOrders.length === 0) return selectedOffering?.pricePerShare || 0;
    return Math.min(...orderBookData.sellOrders.map(o => o.price));
  }, [orderBookData.sellOrders, selectedOffering]);

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading exchange...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Message Toast */}
      {message && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg flex items-center gap-3 shadow-lg ${
          message.type === 'success' 
            ? 'bg-green-500/10 border border-green-500/20 text-green-400' 
            : 'bg-red-500/10 border border-red-500/20 text-red-400'
        }`}>
          {message.type === 'success' ? <Check className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)}>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Header */}
      <div className="border-b border-zinc-800 px-2 sm:px-4 py-2">
        <div className="max-w-[1920px] mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-4">
          {/* Market Selector */}
          <div className="relative">
            <button
              onClick={() => setShowMarketList(!showMarketList)}
              className="flex items-center gap-2 sm:gap-3 px-2 sm:px-4 py-2 bg-zinc-800 rounded-lg hover:bg-zinc-700 transition-colors"
            >
              {selectedOffering ? (
                <>
                  {selectedOffering.channel.analytics?.profileImage ? (
                    <img 
                      src={selectedOffering.channel.analytics.profileImage}
                      alt={selectedOffering.channel.channelName}
                      className="w-6 h-6 sm:w-8 sm:h-8 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-6 h-6 sm:w-8 sm:h-8 bg-red-600 rounded-full flex items-center justify-center">
                      <span className="text-white font-bold text-xs sm:text-sm">
                        {selectedOffering.channel.channelName[0]?.toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div className="text-left hidden xs:block">
                    <p className="text-white font-semibold text-sm sm:text-base truncate max-w-[120px] sm:max-w-none">{selectedOffering.channel.channelName}</p>
                    <p className="text-xs text-gray-400">{selectedOffering.sharePercentage}% Revenue Share</p>
                  </div>
                </>
              ) : (
                <span className="text-gray-400">Select Market</span>
              )}
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </button>

            {/* Market Dropdown */}
            {showMarketList && (
              <div className="absolute top-full left-0 mt-2 w-80 h-150 bg-zinc-900 border border-zinc-800 rounded-lg shadow-xl z-50 overflow-hidden">
                <div className="p-3 border-b border-zinc-800">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search markets..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-red-600"
                    />
                  </div>
                </div>
                <div className="max-h-150 overflow-y-auto">
                  {filteredOfferings.map(offering => (
                    <button
                      key={offering.id}
                      onClick={() => {
                        setSelectedOfferingId(offering.id);
                        setShowMarketList(false);
                        setSearchQuery('');
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-zinc-800 transition-colors ${
                        offering.id === selectedOfferingId ? 'bg-zinc-800' : ''
                      }`}
                    >
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavorite(offering.id);
                        }}
                        className="text-gray-500 hover:text-yellow-400"
                      >
                        <Star className={`w-4 h-4 ${favorites.includes(offering.id) ? 'fill-yellow-400 text-yellow-400' : ''}`} />
                      </button>
                      {offering.channel.analytics?.profileImage ? (
                        <img 
                          src={offering.channel.analytics.profileImage}
                          alt={offering.channel.channelName}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-8 h-8 bg-red-600 rounded-full flex items-center justify-center">
                          <span className="text-white font-bold text-xs">
                            {offering.channel.channelName[0]?.toUpperCase()}
                          </span>
                        </div>
                      )}
                      <div className="flex-1 text-left">
                        <p className="text-white font-medium text-sm">{offering.channel.channelName}</p>
                        <p className="text-xs text-gray-400">{offering.sharePercentage}% • ₹{offering.pricePerShare}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Price Display */}
          {selectedOffering && (
            <div className="flex items-center gap-2 sm:gap-6 flex-wrap">
              <div>
                <span className="text-lg sm:text-2xl font-bold text-white">
                  ₹{selectedOffering.pricePerShare.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
                <span className={`ml-1 sm:ml-3 text-xs sm:text-sm font-medium ${
                  priceChange.percent >= 0 ? 'text-green-400' : 'text-red-400'
                }`}>
                  {priceChange.percent >= 0 ? '+' : ''}{priceChange.change.toFixed(2)} ({priceChange.percent.toFixed(2)}%)
                </span>
              </div>
              <div className="hidden md:flex items-center gap-4 text-sm">
                <div>
                  <span className="text-gray-400">24h High</span>
                  <span className="ml-2 text-white">
                    ₹{(selectedOffering.pricePerShare * 1.05).toFixed(2)}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400">24h Low</span>
                  <span className="ml-2 text-white">
                    ₹{(selectedOffering.pricePerShare * 0.95).toFixed(2)}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400">24h Vol</span>
                  <span className="ml-2 text-white">
                    {Math.floor(Math.random() * 100000).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* User Balance */}
          <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
            {session && wallet && (
              <div className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 bg-zinc-800 rounded-lg">
                <Wallet className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400" />
                <span className="text-white font-medium text-xs sm:text-sm">
                  ₹{wallet.balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
            )}
            <Link href="/trading/portfolio" className="hidden sm:block">
              <Button className="youtube-button-outline text-sm">
                <BarChart3 className="w-4 h-4 mr-2" />
                Portfolio
              </Button>
            </Link>
            <Link href="/trading/portfolio" className="sm:hidden">
              <Button className="youtube-button-outline p-2">
                <BarChart3 className="w-4 h-4" />
              </Button>
            </Link>
            <Button 
              onClick={() => {
                fetchSellOrders(selectedOfferingId!);
                fetchRecentTrades(selectedOfferingId!);
              }}
              className="p-2 bg-zinc-800 rounded-lg hover:bg-zinc-700"
            >
              <RefreshCw className="w-4 h-4 text-gray-400" />
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-[1920px] mx-auto p-2 sm:p-4">
        <div className="grid grid-cols-12 gap-2 sm:gap-4">
          {/* Left Column - Chart */}
          <div className="col-span-12 lg:col-span-8 xl:col-span-9 space-y-2 sm:space-y-4">
            {/* Chart Type Selector */}
            <div className="flex items-center gap-2 mb-2">
              <span className="text-gray-400 text-sm">Chart:</span>
              <button
                onClick={() => setChartType('candlestick')}
                className={`p-2 rounded ${chartType === 'candlestick' ? 'bg-zinc-700 text-white' : 'text-gray-400 hover:text-white'}`}
              >
                <CandlestickChart className="w-4 h-4" />
              </button>
              <button
                onClick={() => setChartType('line')}
                className={`p-2 rounded ${chartType === 'line' ? 'bg-zinc-700 text-white' : 'text-gray-400 hover:text-white'}`}
              >
                <LineChart className="w-4 h-4" />
              </button>
              <button
                onClick={() => setChartType('area')}
                className={`p-2 rounded ${chartType === 'area' ? 'bg-zinc-700 text-white' : 'text-gray-400 hover:text-white'}`}
              >
                <BarChart3 className="w-4 h-4" />
              </button>
            </div>

            {/* TradingView Chart */}
            {selectedOffering && chartData.length > 0 && (
              <TradingViewChart
                data={chartData}
                symbol={selectedOffering.channel.channelName}
                currentPrice={selectedOffering.pricePerShare}
                priceChange={priceChange.change}
                priceChangePercent={priceChange.percent}
                height={500}
                showVolume={true}
                chartType={chartType}
                timeframe={timeframe}
                onTimeframeChange={setTimeframe}
              />
            )}

            {/* Market Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4">
              <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-2 sm:p-4">
                <p className="text-[10px] sm:text-xs text-gray-400 mb-1">Market Cap</p>
                <p className="text-sm sm:text-lg font-semibold text-white truncate">
                  ₹{selectedOffering ? (selectedOffering.pricePerShare * selectedOffering.totalShares).toLocaleString('en-IN') : '0'}
                </p>
              </div>
              <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-2 sm:p-4">
                <p className="text-[10px] sm:text-xs text-gray-400 mb-1">Available Shares</p>
                <p className="text-sm sm:text-lg font-semibold text-white truncate">
                  {selectedOffering?.availableShares.toLocaleString()} / {selectedOffering?.totalShares.toLocaleString()}
                </p>
              </div>
              <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-2 sm:p-4">
                <p className="text-[10px] sm:text-xs text-gray-400 mb-1">Your Holdings</p>
                <p className="text-sm sm:text-lg font-semibold text-white truncate">
                  {userShares.toLocaleString()} shares
                </p>
              </div>
              <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-2 sm:p-4">
                <p className="text-[10px] sm:text-xs text-gray-400 mb-1">Your Value</p>
                <p className="text-sm sm:text-lg font-semibold text-green-400 truncate">
                  ₹{selectedOffering ? (userShares * selectedOffering.pricePerShare).toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '0'}
                </p>
              </div>
            </div>

            {/* Market Depth */}
            <MarketDepth 
              data={marketDepthData}
              currentPrice={selectedOffering?.pricePerShare || 0}
            />
          </div>

          {/* Right Column - Order Book & Trading Panel */}
          <div className="col-span-12 lg:col-span-4 xl:col-span-3 space-y-2 sm:space-y-4">
            {/* Order Book and Trading Panel in same row on larger screens */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-2 sm:gap-4">
              {/* Order Book with Trades Tab */}
              <OrderBook
                buyOrders={orderBookData.buyOrders}
                sellOrders={orderBookData.sellOrders}
                currentPrice={selectedOffering?.pricePerShare || 0}
                onOrderClick={handleOrderBookClick}
                maxRows={8}
                trades={formattedTrades}
              />

              {/* Trading Panel */}
              {selectedOffering && (
                <TradingPanel
                  symbol={selectedOffering.channel.channelName}
                  currentPrice={selectedOffering.pricePerShare}
                  userBalance={wallet?.balance || 0}
                  userShares={userShares}
                  bestBid={bestBid}
                  bestAsk={bestAsk}
                  onPlaceOrder={handlePlaceOrder}
                  processing={processing}
                />
              )}
            </div>

            {/* Recent Trades */}
            <RecentTrades trades={formattedTrades} maxRows={15} />
          </div>
        </div>
      </div>

      {/* Click outside to close market list */}
      {showMarketList && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setShowMarketList(false)}
        />
      )}
    </div>
  );
}
