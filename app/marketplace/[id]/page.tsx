'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Youtube, TrendingUp, Users, IndianRupee, Clock, Shield, Play, Tag, ShoppingCart, Wallet, Check, AlertCircle, X, TrendingDown } from 'lucide-react';
import Link from 'next/link';

interface SellOrder {
  id: string;
  sharesRemaining: number;
  pricePerShare: number;
  minShares: number;
  status: string;
  seller: {
    id: string;
    name: string | null;
  };
}

interface UserInvestment {
  id: string;
  shares: number;
  totalAmount: number;
  status: string;
}

export default function OfferingDetailPage() {
  const { data: session } = useSession();
  const params = useParams();
  const router = useRouter();
  const [offering, setOffering] = useState<any>(null);
  const [sellOrders, setSellOrders] = useState<SellOrder[]>([]);
  const [userInvestments, setUserInvestments] = useState<UserInvestment[]>([]);
  const [wallet, setWallet] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [shares, setShares] = useState(1);
  const [investing, setInvesting] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<SellOrder | null>(null);
  const [secondaryShares, setSecondaryShares] = useState(1);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  // Tab state and sell form state
  const [activeTab, setActiveTab] = useState<'buy' | 'sell'>('buy');
  const [selectedInvestment, setSelectedInvestment] = useState<UserInvestment | null>(null);
  const [sellShares, setSellShares] = useState(1);
  const [sellPrice, setSellPrice] = useState(0);
  const [minSellShares, setMinSellShares] = useState(1);
  const [listing, setListing] = useState(false);
  const [userSellOrders, setUserSellOrders] = useState<SellOrder[]>([]);

  useEffect(() => {
    if (params.id) {
      fetchOffering();
      fetchSellOrders();
      fetchWallet();
      fetchUserInvestments();
    }
  }, [params.id]);

  useEffect(() => {
    if (session?.user?.id && params.id) {
      fetchUserSellOrders();
    }
  }, [session?.user?.id, params.id]);

  const fetchOffering = async () => {
    try {
      const res = await fetch(`/api/marketplace/${params.id}`);
      const data = await res.json();
      if (data.success) {
        setOffering(data.offering);
        setSellPrice(data.offering.pricePerShare);
      }
    } catch (error) {
      console.error('Failed to fetch offering:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSellOrders = async () => {
    try {
      const res = await fetch(`/api/trading/sell-orders?offeringId=${params.id}`);
      const data = await res.json();
      if (data.success) {
        setSellOrders(data.sellOrders);
      }
    } catch (error) {
      console.error('Failed to fetch sell orders:', error);
    }
  };

  const fetchUserSellOrders = async () => {
    try {
      const res = await fetch(`/api/trading/sell-orders?offeringId=${params.id}&myOrders=true`);
      const data = await res.json();
      if (data.success) {
        setUserSellOrders(data.sellOrders);
      }
    } catch (error) {
      console.error('Failed to fetch user sell orders:', error);
    }
  };

  const fetchUserInvestments = async () => {
    try {
      const res = await fetch(`/api/investment?offeringId=${params.id}`);
      const data = await res.json();
      if (data.success && data.investments) {
        const confirmedInvestments = data.investments.filter(
          (inv: UserInvestment) => inv.status === 'CONFIRMED'
        );
        setUserInvestments(confirmedInvestments);
        if (confirmedInvestments.length > 0) {
          setSelectedInvestment(confirmedInvestments[0]);
        }
      }
    } catch (error) {
      console.error('Failed to fetch user investments:', error);
    }
  };

  const fetchWallet = async () => {
    try {
      const res = await fetch('/api/wallet');
      const data = await res.json();
      if (data.success) {
        setWallet(data.wallet);
      }
    } catch (error) {
      console.error('Failed to fetch wallet:', error);
    }
  };

  const handleInvest = async () => {
    setInvesting(true);
    try {
      // Use wallet balance if available
      if (wallet && wallet.balance >= shares * offering.pricePerShare) {
        const res = await fetch('/api/wallet/invest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ offeringId: params.id, shares }),
        });

        const data = await res.json();
        if (data.success) {
          setMessage({ type: 'success', text: 'Investment successful!' });
          fetchOffering();
          fetchWallet();
        } else {
          setMessage({ type: 'error', text: data.error || 'Investment failed' });
        }
      } else {
        // Use payment flow
        const res = await fetch('/api/investment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ offeringId: params.id, shares }),
        });

        const data = await res.json();
        if (data.success) {
          router.push(`/payment?clientSecret=${data.payment.clientSecret}`);
        } else {
          setMessage({ type: 'error', text: data.error || 'Investment failed' });
        }
      }
    } catch (error) {
      console.error('Investment error:', error);
      setMessage({ type: 'error', text: 'Failed to process investment' });
    } finally {
      setInvesting(false);
      setTimeout(() => setMessage(null), 5000);
    }
  };

  const handleBuyFromOrder = async () => {
    if (!selectedOrder) return;
    
    setInvesting(true);
    try {
      const res = await fetch('/api/trading/trades', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sellOrderId: selectedOrder.id,
          shares: secondaryShares,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setMessage({ type: 'success', text: data.message });
        setSelectedOrder(null);
        fetchSellOrders();
        fetchWallet();
        fetchOffering();
        fetchUserInvestments();
      } else {
        setMessage({ type: 'error', text: data.error || 'Trade failed' });
      }
    } catch (error) {
      console.error('Trade error:', error);
      setMessage({ type: 'error', text: 'Failed to execute trade' });
    } finally {
      setInvesting(false);
      setTimeout(() => setMessage(null), 5000);
    }
  };

  const handleCreateSellOrder = async () => {
    if (!selectedInvestment) return;
    
    setListing(true);
    try {
      const res = await fetch('/api/trading/sell-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          investmentId: selectedInvestment.id,
          shares: sellShares,
          pricePerShare: sellPrice,
          minShares: minSellShares,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setMessage({ type: 'success', text: data.message || 'Sell order created successfully!' });
        setSellShares(1);
        fetchSellOrders();
        fetchUserSellOrders();
        fetchUserInvestments();
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to create sell order' });
      }
    } catch (error) {
      console.error('Create sell order error:', error);
      setMessage({ type: 'error', text: 'Failed to create sell order' });
    } finally {
      setListing(false);
      setTimeout(() => setMessage(null), 5000);
    }
  };

  const handleCancelSellOrder = async (orderId: string) => {
    try {
      const res = await fetch(`/api/trading/sell-orders/${orderId}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      if (data.success) {
        setMessage({ type: 'success', text: 'Sell order cancelled successfully!' });
        fetchSellOrders();
        fetchUserSellOrders();
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to cancel sell order' });
      }
    } catch (error) {
      console.error('Cancel sell order error:', error);
      setMessage({ type: 'error', text: 'Failed to cancel sell order' });
    }
    setTimeout(() => setMessage(null), 5000);
  };

  // Calculate available shares for selling (excluding already listed shares)
  const getAvailableSharesForSale = (investment: UserInvestment) => {
    const listedShares = userSellOrders
      .filter(order => order.status === 'ACTIVE' || order.status === 'PARTIALLY_FILLED')
      .reduce((sum, order) => sum + order.sharesRemaining, 0);
    return investment.shares - listedShares;
  };

  // Total shares owned by user
  const totalUserShares = userInvestments.reduce((sum, inv) => sum + inv.shares, 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading offering details...</p>
        </div>
      </div>
    );
  }

  if (!offering) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <Youtube className="w-16 h-16 mx-auto text-gray-600 mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">Offering not found</h2>
          <p className="text-gray-400 mb-6">This offering may have been removed or doesn't exist</p>
          <Link href="/marketplace">
            <Button className="youtube-button">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Marketplace
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const soldShares = offering.totalShares - offering.availableShares;
  const fundingProgress = Math.round((soldShares / offering.totalShares) * 100);
  const totalAmount = shares * offering.pricePerShare;

  return (
    <div className="min-h-screen bg-zinc-950 px-4 py-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Back Button */}
        <div>
          <Link href="/marketplace">
            <Button className="youtube-button-outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Marketplace
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Header Card */}
            <div className="youtube-card p-6">
              <div className="flex flex-col md:flex-row items-start gap-6">
                {/* Thumbnail */}
                <div className="relative w-full md:w-48 aspect-video bg-zinc-800 rounded-lg overflow-hidden shrink-0">
                  <div className="absolute inset-0 bg-gradient-to-br from-red-600/20 to-zinc-800 flex items-center justify-center">
                    <Play className="w-12 h-12 text-white/80" />
                  </div>
                  <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-2 py-1 rounded">
                    {offering.duration}mo
                  </div>
                </div>

                {/* Header Info */}
                <div className="flex-1 space-y-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center shrink-0">
                        <Youtube className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <h1 className="text-2xl md:text-3xl font-bold text-white mb-1">
                          {offering.title}
                        </h1>
                        <p className="text-gray-400">
                          {offering.channel.channelName}
                        </p>
                      </div>
                    </div>
                    <Badge className="bg-red-600/20 text-red-400 border-red-600/30 text-sm px-3 py-1">
                      {offering.sharePercentage}% Share
                    </Badge>
                  </div>

                  <p className="text-gray-300 leading-relaxed">
                    {offering.description}
                  </p>
                </div>
              </div>
            </div>

            {/* Funding Progress Card */}
            <div className="youtube-card p-6">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold text-white">Funding Progress</h3>
                  <span className="text-2xl font-bold text-white">{fundingProgress}%</span>
                </div>
                <div className="w-full bg-zinc-700 rounded-full h-3">
                  <div 
                    className="bg-red-600 h-3 rounded-full transition-all duration-300" 
                    style={{ width: `${fundingProgress}%` }}
                  ></div>
                </div>
                <div className="flex justify-between text-sm text-gray-400">
                  <span>{soldShares.toLocaleString()} shares sold</span>
                  <span>{offering.availableShares.toLocaleString()} remaining</span>
                </div>
              </div>
            </div>

            {/* Channel Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="youtube-card p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-blue-600/20 rounded-lg flex items-center justify-center">
                    <Users className="h-5 w-5 text-blue-400" />
                  </div>
                  <span className="text-sm font-medium text-gray-400">Subscribers</span>
                </div>
                <p className="text-2xl font-bold text-white">
                  {offering.channel.analytics?.subscriberCount?.toLocaleString() || 'N/A'}
                </p>
              </div>
              <div className="youtube-card p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-green-600/20 rounded-lg flex items-center justify-center">
                    <TrendingUp className="h-5 w-5 text-green-400" />
                  </div>
                  <span className="text-sm font-medium text-gray-400">Total Views</span>
                </div>
                <p className="text-2xl font-bold text-white">
                  {offering.channel.analytics?.viewCount?.toLocaleString() || 'N/A'}
                </p>
              </div>
            </div>

            {/* Investment Terms */}
            <div className="youtube-card p-6">
              <h3 className="text-xl font-semibold text-white mb-6">Investment Terms</h3>
              <div className="grid grid-cols-2 gap-6 mb-6">
                <div>
                  <p className="text-sm text-gray-400 mb-1">Revenue Share</p>
                  <p className="text-xl font-semibold text-white">{offering.sharePercentage}%</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400 mb-1">Duration</p>
                  <p className="text-xl font-semibold text-white">{offering.duration} months</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400 mb-1">Price per Share</p>
                  <p className="text-xl font-semibold text-white">₹{offering.pricePerShare}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400 mb-1">Min Investment</p>
                  <p className="text-xl font-semibold text-white">₹{offering.minInvestment}</p>
                </div>
              </div>

              <div className="p-4 bg-blue-600/10 border border-blue-600/30 rounded-lg">
                <div className="flex items-start gap-3">
                  <Shield className="h-5 w-5 text-blue-400 mt-0.5 shrink-0" />
                  <div>
                    <h4 className="font-semibold text-blue-400 mb-1">Investor Protection</h4>
                    <p className="text-sm text-gray-300">
                      All investments are backed by verified revenue data and legal agreements.
                      Payouts are processed automatically based on reported monthly revenue.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Investment Panel */}
          <div className="lg:col-span-1">
            <div className="youtube-card p-6 sticky top-6">
              {/* Tab Navigation - Only show if user has shares */}
              {totalUserShares > 0 && (
                <div className="flex mb-6 bg-zinc-800 rounded-lg p-1 border border-zinc-700">
                  <button
                    onClick={() => setActiveTab('buy')}
                    className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                      activeTab === 'buy'
                        ? 'bg-red-600 text-white'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    <TrendingUp className="w-4 h-4 inline mr-2" />
                    Buy
                  </button>
                  <button
                    onClick={() => setActiveTab('sell')}
                    className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                      activeTab === 'sell'
                        ? 'bg-red-600 text-white'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    <TrendingDown className="w-4 h-4 inline mr-2" />
                    Sell
                  </button>
                </div>
              )}

              {/* User's Holdings Info */}
              {totalUserShares > 0 && (
                <div className="mb-6 p-3 bg-green-600/10 border border-green-600/30 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">Your Holdings</span>
                    <Badge className="bg-green-600/20 text-green-400 border-green-600/30">
                      {totalUserShares} shares
                    </Badge>
                  </div>
                </div>
              )}

              {/* Buy Tab Content */}
              {activeTab === 'buy' && (
                <>
                  <h3 className="text-xl font-semibold text-white mb-2">Make an Investment</h3>
                  <p className="text-gray-400 text-sm mb-6">Choose your investment amount</p>

                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-white mb-2 block">
                        Number of Shares
                      </label>
                      <input
                        type="number"
                        min="0"
                        max={offering.availableShares}
                        value={shares}
                        onChange={(e) => setShares(Math.max(0, Number.parseInt(e.target.value)||0))}
                        className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-red-600 transition-colors"
                      />
                      <p className="text-sm text-gray-400 mt-2">
                        Max: {offering.availableShares} shares available
                      </p>
                    </div>

                    <div className="p-4 bg-zinc-800 border border-zinc-700 rounded-lg space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Shares</span>
                        <span className="font-medium text-white">{shares}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Price per Share</span>
                        <span className="font-medium text-white">₹{offering.pricePerShare}</span>
                      </div>
                      <div className="border-t border-zinc-700 pt-3 flex justify-between">
                        <span className="font-semibold text-white">Total Investment</span>
                        <span className="font-bold text-xl text-white">
                          ₹{totalAmount.toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>

                    {totalAmount < offering.minInvestment && (
                      <div className="p-3 bg-red-600/10 border border-red-600/30 rounded-lg">
                        <p className="text-sm text-red-400">
                          Minimum investment is ₹{offering.minInvestment}
                        </p>
                      </div>
                    )}

                    {offering.maxInvestment && totalAmount > offering.maxInvestment && (
                      <div className="p-3 bg-red-600/10 border border-red-600/30 rounded-lg">
                        <p className="text-sm text-red-400">
                          Maximum investment is ₹{offering.maxInvestment}
                        </p>
                      </div>
                    )}

                    {/* Wallet Balance Info */}
                    {wallet && (
                      <div className="p-3 bg-zinc-800 border border-zinc-700 rounded-lg">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-400 flex items-center gap-2">
                            <Wallet className="w-4 h-4" />
                            Wallet Balance
                          </span>
                          <span className="font-semibold text-white">
                            ₹{wallet.balance?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                        {wallet.balance >= totalAmount && (
                          <p className="text-xs text-green-400 mt-1">
                            ✓ Sufficient balance for this investment
                          </p>
                        )}
                      </div>
                    )}

                    <Button
                      className="youtube-button w-full text-base py-6"
                      onClick={handleInvest}
                      disabled={
                        investing ||
                        offering.availableShares === 0 ||
                        totalAmount < offering.minInvestment ||
                        (offering.maxInvestment && totalAmount > offering.maxInvestment)
                      }
                    >
                      {investing ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                          Processing...
                        </>
                      ) : offering.availableShares === 0 ? (
                        'Sold Out'
                      ) : wallet && wallet.balance >= totalAmount ? (
                        'Invest from Wallet'
                      ) : (
                        'Invest Now'
                      )}
                    </Button>

                    <div className="pt-4 border-t border-zinc-700 space-y-2 text-xs text-gray-400">
                      <p className="flex items-center gap-2">
                        <Clock className="h-3 w-3" />
                        Expected monthly payouts starting next month
                      </p>
                      <p className="flex items-center gap-2">
                        <IndianRupee className="h-3 w-3" />
                        {offering.sharePercentage}% of channel revenue for {offering.duration} months
                      </p>
                    </div>
                  </div>

                  {/* Secondary Market */}
                  {sellOrders.length > 0 && (
                    <div className="mt-6 pt-6 border-t border-zinc-800">
                      <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <Tag className="w-5 h-5 text-red-600" />
                        Secondary Market
                      </h4>
                      <p className="text-sm text-gray-400 mb-4">Buy from other investors</p>
                      
                      <div className="space-y-3">
                        {sellOrders.slice(0, 3).map((order) => (
                          <div
                            key={order.id}
                            className={`p-3 rounded-lg border transition-colors cursor-pointer ${
                              selectedOrder?.id === order.id 
                                ? 'bg-red-600/10 border-red-600/30' 
                                : 'bg-zinc-800 border-zinc-700 hover:border-zinc-600'
                            }`}
                            onClick={() => {
                              setSelectedOrder(order);
                              setSecondaryShares(order.minShares);
                            }}
                          >
                            <div className="flex justify-between items-center">
                              <div>
                                <span className="font-semibold text-white">{order.sharesRemaining} shares</span>
                                <span className="text-gray-400 mx-2">@</span>
                                <span className="font-semibold text-green-400">
                                  ₹{order.pricePerShare.toLocaleString('en-IN')}
                                </span>
                              </div>
                              {order.pricePerShare < offering.pricePerShare && (
                                <Badge className="bg-green-600/20 text-green-400 border-green-600/30 text-xs">
                                  {(((offering.pricePerShare - order.pricePerShare) / offering.pricePerShare) * 100).toFixed(1)}% below
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                              Min: {order.minShares} shares
                            </p>
                          </div>
                        ))}
                      </div>

                      {selectedOrder && (
                        <div className="mt-4 p-4 bg-zinc-800 rounded-lg space-y-3">
                          <div>
                            <label className="text-sm font-medium text-white mb-2 block">
                              Shares to Buy
                            </label>
                            <input
                              type="number"
                              min={selectedOrder.minShares}
                              max={selectedOrder.sharesRemaining}
                              value={secondaryShares}
                              onChange={(e) => setSecondaryShares(
                                Math.max(
                                  selectedOrder.minShares,
                                  Math.min(selectedOrder.sharesRemaining, Number.parseInt(e.target.value) || selectedOrder.minShares)
                                )
                              )}
                              className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-red-600"
                            />
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-400">Total</span>
                            <span className="font-bold text-white">
                              ₹{(secondaryShares * selectedOrder.pricePerShare).toLocaleString('en-IN')}
                            </span>
                          </div>
                          <Button
                            className="youtube-button w-full"
                            onClick={handleBuyFromOrder}
                            disabled={investing || selectedOrder.seller.id === session?.user?.id}
                          >
                            {investing ? 'Processing...' : (
                              <>
                                <ShoppingCart className="w-4 h-4 mr-2" />
                                Buy from Seller
                              </>
                            )}
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}

              {/* Sell Tab Content */}
              {activeTab === 'sell' && totalUserShares > 0 && (
                <>
                  <h3 className="text-xl font-semibold text-white mb-2">Sell Your Shares</h3>
                  <p className="text-gray-400 text-sm mb-6">List your shares on the secondary market</p>

                  <div className="space-y-4">
                    {/* Investment Selection (if multiple investments) */}
                    {userInvestments.length > 1 && (
                      <div>
                        <label className="text-sm font-medium text-white mb-2 block">
                          Select Investment
                        </label>
                        <select
                          value={selectedInvestment?.id || ''}
                          onChange={(e) => {
                            const inv = userInvestments.find(i => i.id === e.target.value);
                            setSelectedInvestment(inv || null);
                            setSellShares(1);
                          }}
                          className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-red-600 transition-colors"
                        >
                          {userInvestments.map((inv) => (
                            <option key={inv.id} value={inv.id}>
                              {inv.shares} shares (₹{inv.totalAmount.toLocaleString('en-IN')})
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {selectedInvestment && (
                      <>
                        <div className="p-3 bg-zinc-800 border border-zinc-700 rounded-lg">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-400">Available to Sell</span>
                            <span className="font-semibold text-white">
                              {getAvailableSharesForSale(selectedInvestment)} shares
                            </span>
                          </div>
                        </div>

                        <div>
                          <label className="text-sm font-medium text-white mb-2 block">
                            Number of Shares to Sell
                          </label>
                          <input
                            type="number"
                            min="1"
                            max={getAvailableSharesForSale(selectedInvestment)}
                            value={sellShares}
                            onChange={(e) => setSellShares(Math.max(1, Math.min(
                              getAvailableSharesForSale(selectedInvestment),
                              Number.parseInt(e.target.value) || 1
                            )))}
                            className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-red-600 transition-colors"
                          />
                        </div>

                        <div>
                          <label className="text-sm font-medium text-white mb-2 block">
                            Price per Share (₹)
                          </label>
                          <input
                            type="number"
                            min="1"
                            step="0.01"
                            value={sellPrice}
                            onChange={(e) => setSellPrice(Math.max(1, Number.parseFloat(e.target.value) || 1))}
                            className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-red-600 transition-colors"
                          />
                          <p className="text-xs text-gray-400 mt-1">
                            Original price: ₹{offering.pricePerShare}
                          </p>
                        </div>

                        <div>
                          <label className="text-sm font-medium text-white mb-2 block">
                            Minimum Shares per Purchase
                          </label>
                          <input
                            type="number"
                            min="1"
                            max={sellShares}
                            value={minSellShares}
                            onChange={(e) => setMinSellShares(Math.max(1, Math.min(
                              sellShares,
                              Number.parseInt(e.target.value) || 1
                            )))}
                            className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-red-600 transition-colors"
                          />
                        </div>

                        <div className="p-4 bg-zinc-800 border border-zinc-700 rounded-lg space-y-3">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-400">Shares to List</span>
                            <span className="font-medium text-white">{sellShares}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-400">Price per Share</span>
                            <span className="font-medium text-white">₹{sellPrice}</span>
                          </div>
                          <div className="border-t border-zinc-700 pt-3 flex justify-between">
                            <span className="font-semibold text-white">Total Listing Value</span>
                            <span className="font-bold text-xl text-white">
                              ₹{(sellShares * sellPrice).toLocaleString('en-IN')}
                            </span>
                          </div>
                        </div>

                        {sellPrice < offering.pricePerShare && (
                          <div className="p-3 bg-yellow-600/10 border border-yellow-600/30 rounded-lg">
                            <p className="text-sm text-yellow-400">
                              ⚠️ Your price is {(((offering.pricePerShare - sellPrice) / offering.pricePerShare) * 100).toFixed(1)}% below the original price
                            </p>
                          </div>
                        )}

                        {getAvailableSharesForSale(selectedInvestment) === 0 ? (
                          <div className="p-3 bg-red-600/10 border border-red-600/30 rounded-lg">
                            <p className="text-sm text-red-400">
                              All your shares are already listed for sale
                            </p>
                          </div>
                        ) : (
                          <Button
                            className="youtube-button w-full text-base py-6"
                            onClick={handleCreateSellOrder}
                            disabled={listing || sellShares < 1 || sellPrice < 1}
                          >
                            {listing ? (
                              <>
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                                Creating Listing...
                              </>
                            ) : (
                              <>
                                <Tag className="w-4 h-4 mr-2" />
                                List Shares for Sale
                              </>
                            )}
                          </Button>
                        )}
                      </>
                    )}

                    {/* User's Active Sell Orders */}
                    {userSellOrders.length > 0 && (
                      <div className="mt-6 pt-6 border-t border-zinc-800">
                        <h4 className="text-lg font-semibold text-white mb-4">Your Active Listings</h4>
                        <div className="space-y-3">
                          {userSellOrders.map((order) => (
                            <div
                              key={order.id}
                              className="p-3 bg-zinc-800 border border-zinc-700 rounded-lg"
                            >
                              <div className="flex justify-between items-center">
                                <div>
                                  <span className="font-semibold text-white">{order.sharesRemaining} shares</span>
                                  <span className="text-gray-400 mx-2">@</span>
                                  <span className="font-semibold text-green-400">
                                    ₹{order.pricePerShare.toLocaleString('en-IN')}
                                  </span>
                                </div>
                                <Badge className={`text-xs ${
                                  order.status === 'ACTIVE' 
                                    ? 'bg-green-600/20 text-green-400 border-green-600/30'
                                    : order.status === 'PARTIALLY_FILLED'
                                    ? 'bg-yellow-600/20 text-yellow-400 border-yellow-600/30'
                                    : 'bg-gray-600/20 text-gray-400 border-gray-600/30'
                                }`}>
                                  {order.status.replace('_', ' ')}
                                </Badge>
                              </div>
                              {(order.status === 'ACTIVE' || order.status === 'PARTIALLY_FILLED') && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="mt-2 text-red-400 hover:text-red-300 hover:bg-red-600/10 w-full"
                                  onClick={() => handleCancelSellOrder(order.id)}
                                >
                                  <X className="w-4 h-4 mr-1" />
                                  Cancel Listing
                                </Button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Message Toast */}
        {message && (
          <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg flex items-center gap-3 ${
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
      </div>
    </div>
  );
}
