'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, 
  Wallet, 
  ArrowUpRight, 
  ArrowDownRight,
  DollarSign,
  BarChart3,
  Package,
  Clock,
  X,
  Check,
  AlertCircle
} from 'lucide-react';
import Link from 'next/link';

interface Investment {
  id: string;
  shares: number;
  totalAmount: number;
  status: string;
  createdAt: string;
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
  payouts: Array<{
    id: string;
    amount: number;
    revenueMonth: string;
    status: string;
  }>;
}

interface SellOrder {
  id: string;
  sharesListed: number;
  sharesRemaining: number;
  pricePerShare: number;
  status: string;
  createdAt: string;
  offering: {
    id: string;
    channel: {
      channelName: string;
    };
  };
}

interface Trade {
  id: string;
  shares: number;
  pricePerShare: number;
  totalAmount: number;
  platformFee: number;
  netAmount: number;
  status: string;
  createdAt: string;
  completedAt: string | null;
  buyerId: string;
  sellerId: string;
  offering: {
    channel: {
      channelName: string;
    };
  };
}

export default function PortfolioPage() {
  const { data: session } = useSession();
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [sellOrders, setSellOrders] = useState<SellOrder[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'holdings' | 'orders' | 'history'>('holdings');
  const [showSellModal, setShowSellModal] = useState(false);
  const [selectedInvestment, setSelectedInvestment] = useState<Investment | null>(null);
  const [sellForm, setSellForm] = useState({ shares: 1, pricePerShare: 0 });
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (session?.user) {
      fetchPortfolioData();
    }
  }, [session]);

  const fetchPortfolioData = async () => {
    setLoading(true);
    try {
      const [investmentsRes, ordersRes, tradesRes] = await Promise.all([
        fetch('/api/investment'),
        fetch('/api/trading/sell-orders?myOrders=true'),
        fetch('/api/trading/trades'),
      ]);

      const investmentsData = await investmentsRes.json();
      const ordersData = await ordersRes.json();
      const tradesData = await tradesRes.json();

      if (investmentsData.success) {
        // Filter only confirmed investments with shares > 0
        setInvestments(investmentsData.investments.filter((i: Investment) => 
          i.status === 'CONFIRMED' && i.shares > 0
        ));
      }
      if (ordersData.success) {
        setSellOrders(ordersData.sellOrders);
      }
      if (tradesData.success) {
        setTrades(tradesData.trades);
      }
    } catch (error) {
      console.error('Failed to fetch portfolio data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenSellModal = (investment: Investment) => {
    // Calculate available shares (owned - already listed)
    const listedShares = sellOrders
      .filter(o => o.offering.id === investment.offering.id && 
        (o.status === 'ACTIVE' || o.status === 'PARTIALLY_FILLED'))
      .reduce((sum, o) => sum + o.sharesRemaining, 0);
    
    const availableShares = investment.shares - listedShares;
    
    if (availableShares <= 0) {
      setMessage({ type: 'error', text: 'All shares are already listed for sale' });
      setTimeout(() => setMessage(null), 3000);
      return;
    }

    setSelectedInvestment({ ...investment, shares: availableShares });
    setSellForm({ 
      shares: 1, 
      pricePerShare: investment.offering.pricePerShare 
    });
    setShowSellModal(true);
  };

  const handleCreateSellOrder = async () => {
    if (!selectedInvestment) return;
    
    setProcessing(true);
    try {
      const res = await fetch('/api/trading/sell-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          investmentId: selectedInvestment.id,
          shares: sellForm.shares,
          pricePerShare: sellForm.pricePerShare,
        }),
      });

      const data = await res.json();
      
      if (data.success) {
        setMessage({ type: 'success', text: 'Sell order created successfully!' });
        setShowSellModal(false);
        fetchPortfolioData();
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to create sell order' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to create sell order' });
    } finally {
      setProcessing(false);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    try {
      const res = await fetch(`/api/trading/sell-orders/${orderId}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      
      if (data.success) {
        setMessage({ type: 'success', text: 'Order cancelled successfully' });
        fetchPortfolioData();
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to cancel order' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to cancel order' });
    }
    setTimeout(() => setMessage(null), 3000);
  };

  const formatCurrency = (value: number) => {
    return `₹${value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  // Calculate portfolio stats
  const portfolioStats = {
    totalValue: investments.reduce((sum, inv) => 
      sum + (inv.shares * inv.offering.pricePerShare), 0
    ),
    totalInvested: investments.reduce((sum, inv) => sum + inv.totalAmount, 0),
    totalShares: investments.reduce((sum, inv) => sum + inv.shares, 0),
    totalEarnings: investments.reduce((sum, inv) => 
      sum + inv.payouts.filter(p => p.status === 'COMPLETED').reduce((s, p) => s + p.amount, 0), 0
    ),
    activeOrders: sellOrders.filter(o => o.status === 'ACTIVE' || o.status === 'PARTIALLY_FILLED').length,
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading portfolio...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 px-4 py-6">
      <div className="max-w-7xl mx-auto space-y-6">
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

        {/* Header */}
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-white flex items-center gap-3">
              <Package className="w-8 h-8 text-red-600" />
              My Portfolio
            </h1>
            <p className="text-gray-400 mt-2 text-lg">Manage your investments and sell orders</p>
          </div>
          <div className="flex gap-3">
            <Link href="/marketChannel">
              <Button className="youtube-button-outline">
                <TrendingUp className="w-4 h-4 mr-2" />
                View Market
              </Button>
            </Link>
            <Link href="/marketplace">
              <Button className="youtube-button">
                <ArrowUpRight className="w-4 h-4 mr-2" />
                Buy Shares
              </Button>
            </Link>
          </div>
        </div>

        {/* Portfolio Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="youtube-card p-4">
            <div className="flex items-center gap-2 text-gray-400 mb-2">
              <Wallet className="w-4 h-4" />
              <span className="text-sm">Portfolio Value</span>
            </div>
            <div className="text-2xl font-bold text-white">{formatCurrency(portfolioStats.totalValue)}</div>
          </div>
          <div className="youtube-card p-4">
            <div className="flex items-center gap-2 text-gray-400 mb-2">
              <DollarSign className="w-4 h-4" />
              <span className="text-sm">Total Invested</span>
            </div>
            <div className="text-2xl font-bold text-white">{formatCurrency(portfolioStats.totalInvested)}</div>
          </div>
          <div className="youtube-card p-4">
            <div className="flex items-center gap-2 text-gray-400 mb-2">
              <BarChart3 className="w-4 h-4" />
              <span className="text-sm">Total Shares</span>
            </div>
            <div className="text-2xl font-bold text-white">{portfolioStats.totalShares}</div>
          </div>
          <div className="youtube-card p-4">
            <div className="flex items-center gap-2 text-gray-400 mb-2">
              <TrendingUp className="w-4 h-4" />
              <span className="text-sm">Total Earnings</span>
            </div>
            <div className="text-2xl font-bold text-green-400">{formatCurrency(portfolioStats.totalEarnings)}</div>
          </div>
          <div className="youtube-card p-4">
            <div className="flex items-center gap-2 text-gray-400 mb-2">
              <Clock className="w-4 h-4" />
              <span className="text-sm">Active Orders</span>
            </div>
            <div className="text-2xl font-bold text-white">{portfolioStats.activeOrders}</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-zinc-800 pb-2">
          {(['holdings', 'orders', 'history'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                activeTab === tab
                  ? 'bg-red-600 text-white'
                  : 'bg-zinc-800 text-gray-400 hover:bg-zinc-700 hover:text-white'
              }`}
            >
              {tab === 'holdings' && 'Holdings'}
              {tab === 'orders' && `Sell Orders (${sellOrders.length})`}
              {tab === 'history' && `Trade History (${trades.length})`}
            </button>
          ))}
        </div>

        {/* Holdings Tab */}
        {activeTab === 'holdings' && (
          <div className="space-y-4">
            {investments.length === 0 ? (
              <div className="youtube-card p-12 text-center">
                <Package className="w-16 h-16 mx-auto text-gray-600 mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">No Holdings Yet</h3>
                <p className="text-gray-400 mb-6">Start investing in creator channels to build your portfolio</p>
                <Link href="/marketplace">
                  <Button className="youtube-button">Browse Marketplace</Button>
                </Link>
              </div>
            ) : (
              investments.map((investment) => {
                const currentValue = investment.shares * investment.offering.pricePerShare;
                const gainLoss = currentValue - investment.totalAmount;
                const gainLossPercent = (gainLoss / investment.totalAmount) * 100;

                return (
                  <div key={investment.id} className="youtube-card p-4">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center shrink-0">
                          <span className="text-white font-bold">
                            {investment.offering.channel.channelName[0]?.toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <h3 className="font-semibold text-white text-lg">
                            {investment.offering.channel.channelName}
                          </h3>
                          <p className="text-gray-400 text-sm">{investment.offering.title}</p>
                          <div className="flex items-center gap-4 mt-2 text-sm">
                            <span className="text-gray-400">
                              {investment.shares} shares @ {formatCurrency(investment.offering.pricePerShare)}
                            </span>
                            <Badge className="bg-red-600/20 text-red-400 border-red-600/30">
                              {investment.offering.sharePercentage}% Revenue
                            </Badge>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                        <div className="grid grid-cols-3 gap-6 text-center lg:text-right">
                          <div>
                            <p className="text-xs text-gray-400">Value</p>
                            <p className="font-semibold text-white">{formatCurrency(currentValue)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400">P&L</p>
                            <p className={`font-semibold flex items-center justify-center lg:justify-end gap-1 ${
                              gainLoss >= 0 ? 'text-green-400' : 'text-red-400'
                            }`}>
                              {gainLoss >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                              {formatCurrency(Math.abs(gainLoss))} ({gainLossPercent.toFixed(2)}%)
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400">Earnings</p>
                            <p className="font-semibold text-green-400">
                              {formatCurrency(investment.payouts.filter(p => p.status === 'COMPLETED').reduce((s, p) => s + p.amount, 0))}
                            </p>
                          </div>
                        </div>
                        <Button 
                          className="youtube-button"
                          onClick={() => handleOpenSellModal(investment)}
                        >
                          Sell Shares
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Sell Orders Tab */}
        {activeTab === 'orders' && (
          <div className="space-y-4">
            {sellOrders.length === 0 ? (
              <div className="youtube-card p-12 text-center">
                <Clock className="w-16 h-16 mx-auto text-gray-600 mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">No Sell Orders</h3>
                <p className="text-gray-400">You haven't listed any shares for sale</p>
              </div>
            ) : (
              sellOrders.map((order) => (
                <div key={order.id} className="youtube-card p-4">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div>
                      <h3 className="font-semibold text-white">{order.offering.channel.channelName}</h3>
                      <div className="flex items-center gap-4 mt-2 text-sm">
                        <span className="text-gray-400">
                          {order.sharesRemaining}/{order.sharesListed} shares @ {formatCurrency(order.pricePerShare)}
                        </span>
                        <Badge className={`${
                          order.status === 'ACTIVE' ? 'bg-green-600/20 text-green-400 border-green-600/30' :
                          order.status === 'PARTIALLY_FILLED' ? 'bg-yellow-600/20 text-yellow-400 border-yellow-600/30' :
                          order.status === 'FILLED' ? 'bg-blue-600/20 text-blue-400 border-blue-600/30' :
                          'bg-gray-600/20 text-gray-400 border-gray-600/30'
                        }`}>
                          {order.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">Created {formatDate(order.createdAt)}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-xs text-gray-400">Total Value</p>
                        <p className="font-semibold text-white">
                          {formatCurrency(order.sharesRemaining * order.pricePerShare)}
                        </p>
                      </div>
                      {(order.status === 'ACTIVE' || order.status === 'PARTIALLY_FILLED') && (
                        <Button 
                          variant="outline"
                          className="border-red-600 text-red-400 hover:bg-red-600/10"
                          onClick={() => handleCancelOrder(order.id)}
                        >
                          <X className="w-4 h-4 mr-2" />
                          Cancel
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Trade History Tab */}
        {activeTab === 'history' && (
          <div className="space-y-4">
            {trades.length === 0 ? (
              <div className="youtube-card p-12 text-center">
                <BarChart3 className="w-16 h-16 mx-auto text-gray-600 mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">No Trade History</h3>
                <p className="text-gray-400">Your completed trades will appear here</p>
              </div>
            ) : (
              trades.map((trade) => {
                const isBuyer = trade.buyerId === session?.user?.id;
                return (
                  <div key={trade.id} className="youtube-card p-4">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          isBuyer ? 'bg-green-600/20' : 'bg-red-600/20'
                        }`}>
                          {isBuyer ? (
                            <ArrowDownRight className="w-5 h-5 text-green-400" />
                          ) : (
                            <ArrowUpRight className="w-5 h-5 text-red-400" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className={`font-semibold ${isBuyer ? 'text-green-400' : 'text-red-400'}`}>
                              {isBuyer ? 'Bought' : 'Sold'}
                            </span>
                            <span className="text-white">{trade.shares} shares</span>
                          </div>
                          <p className="text-gray-400 text-sm">{trade.offering.channel.channelName}</p>
                          <p className="text-xs text-gray-500">{formatDate(trade.createdAt)}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-6 text-center lg:text-right">
                        <div>
                          <p className="text-xs text-gray-400">Price/Share</p>
                          <p className="font-semibold text-white">{formatCurrency(trade.pricePerShare)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400">Total</p>
                          <p className="font-semibold text-white">{formatCurrency(trade.totalAmount)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400">{isBuyer ? 'Paid' : 'Received'}</p>
                          <p className={`font-semibold ${isBuyer ? 'text-red-400' : 'text-green-400'}`}>
                            {isBuyer ? formatCurrency(trade.totalAmount) : formatCurrency(trade.netAmount)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Sell Modal */}
        {showSellModal && selectedInvestment && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="youtube-card max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white">Create Sell Order</h2>
                <button onClick={() => setShowSellModal(false)} className="text-gray-400 hover:text-white">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="p-4 bg-zinc-800 rounded-lg">
                  <p className="text-gray-400 text-sm">Channel</p>
                  <p className="font-semibold text-white">{selectedInvestment.offering.channel.channelName}</p>
                  <p className="text-gray-400 text-sm mt-2">Available Shares</p>
                  <p className="font-semibold text-white">{selectedInvestment.shares}</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-white mb-2 block">
                    Shares to Sell
                  </label>
                  <input
                    type="number"
                    min="1"
                    max={selectedInvestment.shares}
                    value={sellForm.shares}
                    onChange={(e) => setSellForm({ ...sellForm, shares: Math.max(1, Math.min(selectedInvestment.shares, Number.parseInt(e.target.value) || 1)) })}
                    className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-red-600"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-white mb-2 block">
                    Price per Share (₹)
                  </label>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={sellForm.pricePerShare}
                    onChange={(e) => setSellForm({ ...sellForm, pricePerShare: Number.parseFloat(e.target.value) || 0 })}
                    className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-red-600"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Original price: {formatCurrency(selectedInvestment.offering.pricePerShare)}
                  </p>
                </div>

                <div className="p-4 bg-zinc-800 rounded-lg">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Total Value</span>
                    <span className="font-semibold text-white">
                      {formatCurrency(sellForm.shares * sellForm.pricePerShare)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm mt-2">
                    <span className="text-gray-400">Platform Fee (2.5%)</span>
                    <span className="text-gray-400">
                      -{formatCurrency(sellForm.shares * sellForm.pricePerShare * 0.025)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm mt-2 pt-2 border-t border-zinc-700">
                    <span className="text-gray-400">You'll Receive</span>
                    <span className="font-semibold text-green-400">
                      {formatCurrency(sellForm.shares * sellForm.pricePerShare * 0.975)}
                    </span>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1 border-zinc-700"
                    onClick={() => setShowSellModal(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    className="flex-1 youtube-button"
                    onClick={handleCreateSellOrder}
                    disabled={processing || sellForm.shares < 1 || sellForm.pricePerShare <= 0}
                  >
                    {processing ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                        Creating...
                      </>
                    ) : (
                      'List for Sale'
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
