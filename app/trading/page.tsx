'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { 
  TrendingUp, 
  Wallet, 
  ShoppingCart,
  Tag,
  X,
  Check,
  AlertCircle,
  Search,
  RefreshCw,
  BarChart3,
  Zap,
  Filter
} from 'lucide-react';
import Link from 'next/link';

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
    image: string | null;
  };
  offering: {
    id: string;
    title: string;
    pricePerShare: number;
    sharePercentage: number;
    channel: {
      channelName: string;
      channelUrl: string;
    };
  };
}

interface WalletData {
  balance: number;
  totalDeposited: number;
  totalInvested: number;
}

export default function TradingPage() {
  const { data: session } = useSession();
  const [sellOrders, setSellOrders] = useState<SellOrder[]>([]);
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'price' | 'shares' | 'newest'>('price');
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<SellOrder | null>(null);
  const [buyShares, setBuyShares] = useState(1);
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [ordersRes, walletRes] = await Promise.all([
        fetch('/api/trading/sell-orders'),
        session ? fetch('/api/wallet') : Promise.resolve(null)
      ]);

      const ordersData = await ordersRes.json();
      if (ordersData.success) {
        setSellOrders(ordersData.sellOrders);
      }

      if (walletRes) {
        const walletData = await walletRes.json();
        if (walletData.success) {
          setWallet(walletData.wallet);
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleBuyClick = (order: SellOrder) => {
    if (!session) {
      setMessage({ type: 'error', text: 'Please sign in to trade' });
      setTimeout(() => setMessage(null), 3000);
      return;
    }
    setSelectedOrder(order);
    setBuyShares(order.minShares);
    setShowBuyModal(true);
  };

  const executeTrade = async () => {
    if (!selectedOrder) return;

    setProcessing(true);
    try {
      const response = await fetch('/api/trading/trades', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sellOrderId: selectedOrder.id,
          shares: buyShares,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setMessage({ type: 'success', text: data.message });
        setShowBuyModal(false);
        setSelectedOrder(null);
        setBuyShares(1);
        // Refresh data
        fetchData();
      } else {
        setMessage({ type: 'error', text: data.error || 'Trade failed' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to execute trade' });
    } finally {
      setProcessing(false);
      setTimeout(() => setMessage(null), 5000);
    }
  };

  // Filter and sort orders
  const filteredOrders = sellOrders
    .filter(order => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        order.offering.channel.channelName.toLowerCase().includes(query) ||
        order.offering.title.toLowerCase().includes(query)
      );
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'price':
          return a.pricePerShare - b.pricePerShare;
        case 'shares':
          return b.sharesRemaining - a.sharesRemaining;
        case 'newest':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        default:
          return 0;
      }
    });

  const formatCurrency = (value: number) => {
    return `₹${value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const totalCost = selectedOrder ? buyShares * selectedOrder.pricePerShare : 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading trading data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 px-4 py-6">
      <div className="max-w-7xl mx-auto space-y-6">
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

        {/* Header */}
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-white flex items-center gap-3">
              <TrendingUp className="w-8 h-8 text-red-600" />
              Secondary Market
            </h1>
            <p className="text-gray-400 mt-2 text-lg">Buy and sell creator shares with other investors</p>
          </div>
          <div className="flex gap-3">
            <Link href="/trading/portfolio">
              <Button className="youtube-button-outline">
                <BarChart3 className="w-4 h-4 mr-2" />
                My Portfolio
              </Button>
            </Link>
            <Link href="/marketChannel">
              <Button className="youtube-button">
                <TrendingUp className="w-4 h-4 mr-2" />
                Market Charts
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-zinc-900 border-zinc-800 p-4">
            <div className="flex items-center gap-2 text-gray-400 mb-2">
              <Tag className="w-4 h-4" />
              <span className="text-sm">Active Listings</span>
            </div>
            <div className="text-2xl font-bold text-white">{sellOrders.length}</div>
          </Card>
          
          <Card className="bg-zinc-900 border-zinc-800 p-4">
            <div className="flex items-center gap-2 text-gray-400 mb-2">
              <ShoppingCart className="w-4 h-4" />
              <span className="text-sm">Total Shares Available</span>
            </div>
            <div className="text-2xl font-bold text-white">
              {sellOrders.reduce((sum, o) => sum + o.sharesRemaining, 0).toLocaleString()}
            </div>
          </Card>
          
          <Card className="bg-zinc-900 border-zinc-800 p-4">
            <div className="flex items-center gap-2 text-gray-400 mb-2">
              <Zap className="w-4 h-4" />
              <span className="text-sm">Avg. Price/Share</span>
            </div>
            <div className="text-2xl font-bold text-white">
              {sellOrders.length > 0 
                ? formatCurrency(sellOrders.reduce((sum, o) => sum + o.pricePerShare, 0) / sellOrders.length)
                : '₹0'
              }
            </div>
          </Card>
          
          {session && wallet && (
            <Card className="bg-gradient-to-br from-red-600 to-red-700 border-red-500 p-4">
              <div className="flex items-center gap-2 text-white/80 mb-2">
                <Wallet className="w-4 h-4" />
                <span className="text-sm">Your Balance</span>
              </div>
              <div className="text-2xl font-bold text-white">{formatCurrency(wallet.balance)}</div>
            </Card>
          )}
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col md:flex-row gap-4 p-4 bg-zinc-900 rounded-lg border border-zinc-800">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by channel name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-red-600"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <span className="text-gray-400 text-sm">Sort:</span>
            {(['price', 'shares', 'newest'] as const).map((option) => (
              <button
                key={option}
                onClick={() => setSortBy(option)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                  sortBy === option
                    ? 'bg-red-600 text-white'
                    : 'bg-zinc-800 text-gray-400 hover:bg-zinc-700 hover:text-white'
                }`}
              >
                {option === 'price' && 'Best Price'}
                {option === 'shares' && 'Most Shares'}
                {option === 'newest' && 'Newest'}
              </button>
            ))}
          </div>
          
          <Button
            variant="outline"
            onClick={fetchData}
            className="border-zinc-700 text-gray-300 hover:bg-zinc-800"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Sell Orders List */}
        <div className="space-y-3">
          {filteredOrders.length === 0 ? (
            <div className="text-center py-16 bg-zinc-900 rounded-lg border border-zinc-800">
              <Tag className="w-16 h-16 mx-auto text-gray-600 mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">
                {searchQuery ? 'No matching listings found' : 'No shares available for sale'}
              </h3>
              <p className="text-gray-400 mb-6">
                {searchQuery 
                  ? 'Try a different search term or clear the filter'
                  : 'Check back later or list your own shares for sale'}
              </p>
              {searchQuery && (
                <Button 
                  onClick={() => setSearchQuery('')}
                  className="youtube-button"
                >
                  Clear Search
                </Button>
              )}
            </div>
          ) : (
            filteredOrders.map((order) => {
              const priceDiff = order.pricePerShare - order.offering.pricePerShare;
              const priceDiffPercent = (priceDiff / order.offering.pricePerShare) * 100;
              const isDiscount = priceDiff < 0;
              
              return (
                <div 
                  key={order.id} 
                  className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 hover:border-zinc-700 transition-colors"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center shrink-0">
                        <span className="text-white font-bold">
                          {order.offering.channel.channelName[0]?.toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <h3 className="font-semibold text-white text-lg">
                          {order.offering.channel.channelName}
                        </h3>
                        <p className="text-gray-400 text-sm">{order.offering.title}</p>
                        <div className="flex flex-wrap items-center gap-3 mt-2 text-sm">
                          <span className="text-gray-400">
                            Seller: {order.seller.name || 'Anonymous'}
                          </span>
                          <Badge className="bg-red-600/20 text-red-400 border-red-600/30">
                            {order.offering.sharePercentage}% Revenue
                          </Badge>
                          {isDiscount ? (
                            <Badge className="bg-green-600/20 text-green-400 border-green-600/30">
                              {Math.abs(priceDiffPercent).toFixed(1)}% Below Market
                            </Badge>
                          ) : priceDiff > 0 ? (
                            <Badge className="bg-yellow-600/20 text-yellow-400 border-yellow-600/30">
                              {priceDiffPercent.toFixed(1)}% Premium
                            </Badge>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                      <div className="grid grid-cols-3 gap-6 text-center">
                        <div>
                          <p className="text-xs text-gray-400">Available</p>
                          <p className="font-semibold text-white">{order.sharesRemaining} shares</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400">Price/Share</p>
                          <p className={`font-semibold ${isDiscount ? 'text-green-400' : 'text-white'}`}>
                            {formatCurrency(order.pricePerShare)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400">Min Buy</p>
                          <p className="font-semibold text-white">{order.minShares}</p>
                        </div>
                      </div>
                      
                      <Button
                        className="youtube-button whitespace-nowrap"
                        onClick={() => handleBuyClick(order)}
                        disabled={order.seller.id === session?.user?.id}
                      >
                        <ShoppingCart className="w-4 h-4 mr-2" />
                        Buy Now
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Buy Modal */}
        {showBuyModal && selectedOrder && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl max-w-md w-full p-6 shadow-2xl">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5 text-red-600" />
                  Buy Shares
                </h2>
                <button 
                  onClick={() => {
                    setShowBuyModal(false);
                    setSelectedOrder(null);
                    setBuyShares(1);
                  }} 
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Order Details */}
                <div className="p-4 bg-zinc-800 rounded-lg">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center">
                      <span className="text-white font-bold">
                        {selectedOrder.offering.channel.channelName[0]?.toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="font-semibold text-white">{selectedOrder.offering.channel.channelName}</p>
                      <p className="text-xs text-gray-400">{selectedOrder.offering.sharePercentage}% Revenue Share</p>
                    </div>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Available</span>
                    <span className="text-white">{selectedOrder.sharesRemaining} shares</span>
                  </div>
                  <div className="flex justify-between text-sm mt-1">
                    <span className="text-gray-400">Price per Share</span>
                    <span className="text-green-400 font-semibold">{formatCurrency(selectedOrder.pricePerShare)}</span>
                  </div>
                </div>

                {/* Shares Input */}
                <div>
                  <label className="text-sm font-medium text-white mb-2 block">
                    Shares to Buy
                  </label>
                  <input
                    type="number"
                    min={selectedOrder.minShares}
                    max={selectedOrder.sharesRemaining}
                    value={buyShares}
                    onChange={(e) => setBuyShares(
                      Math.max(
                        selectedOrder.minShares,
                        Math.min(selectedOrder.sharesRemaining, Number.parseInt(e.target.value) || selectedOrder.minShares)
                      )
                    )}
                    className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-red-600"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Min: {selectedOrder.minShares} • Max: {selectedOrder.sharesRemaining}
                  </p>
                </div>

                {/* Cost Summary */}
                <div className="p-4 bg-zinc-800 rounded-lg">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Shares × Price</span>
                    <span className="text-white">{buyShares} × {formatCurrency(selectedOrder.pricePerShare)}</span>
                  </div>
                  <div className="flex justify-between text-sm mt-2 pt-2 border-t border-zinc-700">
                    <span className="font-semibold text-white">Total Cost</span>
                    <span className="font-bold text-xl text-white">{formatCurrency(totalCost)}</span>
                  </div>
                  {wallet && (
                    <div className="flex justify-between text-xs mt-2 pt-2 border-t border-zinc-700">
                      <span className="text-gray-400">Your Balance</span>
                      <span className={wallet.balance >= totalCost ? 'text-green-400' : 'text-red-400'}>
                        {formatCurrency(wallet.balance)}
                        {wallet.balance < totalCost && ' (Insufficient)'}
                      </span>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1 border-zinc-700"
                    onClick={() => {
                      setShowBuyModal(false);
                      setSelectedOrder(null);
                      setBuyShares(1);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    className="flex-1 youtube-button"
                    onClick={executeTrade}
                    disabled={processing || (wallet ? wallet.balance < totalCost : false)}
                  >
                    {processing ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                        Processing...
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4 mr-2" />
                        Confirm Purchase
                      </>
                    )}
                  </Button>
                </div>

                {!session && (
                  <p className="text-center text-sm text-gray-400">
                    <Link href="/auth/signin" className="text-red-400 hover:underline">Sign in</Link> to complete this purchase
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
