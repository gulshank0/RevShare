'use client';

import { useState } from 'react';
import { ArrowUpRight, ArrowDownRight, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TradingPanelProps {
  symbol: string;
  currentPrice: number;
  userBalance: number;
  userShares: number;
  bestBid: number;
  bestAsk: number;
  onPlaceOrder: (order: {
    type: 'buy' | 'sell';
    orderType: 'market' | 'limit';
    price: number;
    shares: number;
    total: number;
  }) => Promise<void>;
  processing?: boolean;
}

export default function TradingPanel({
  symbol,
  currentPrice,
  userBalance,
  userShares,
  bestBid,
  bestAsk,
  onPlaceOrder,
  processing = false,
}: TradingPanelProps) {
  const [activeTab, setActiveTab] = useState<'buy' | 'sell'>('buy');
  const [orderType, setOrderType] = useState<'market' | 'limit'>('limit');
  const [price, setPrice] = useState(currentPrice.toFixed(2));
  const [shares, setShares] = useState('1');
  const [total, setTotal] = useState((currentPrice * 1).toFixed(2));

  // Update total when price or shares change
  const handlePriceChange = (value: string) => {
    setPrice(value);
    const newTotal = (Number.parseFloat(value) || 0) * (Number.parseInt(shares) || 0);
    setTotal(newTotal.toFixed(2));
  };

  const handleSharesChange = (value: string) => {
    const numShares = Number.parseInt(value) || 0;
    setShares(numShares.toString());
    const priceValue = orderType === 'market' 
      ? (activeTab === 'buy' ? bestAsk : bestBid) 
      : Number.parseFloat(price);
    const newTotal = priceValue * numShares;
    setTotal(newTotal.toFixed(2));
  };

  const handleTotalChange = (value: string) => {
    setTotal(value);
    const totalValue = Number.parseFloat(value) || 0;
    const priceValue = orderType === 'market' 
      ? (activeTab === 'buy' ? bestAsk : bestBid) 
      : Number.parseFloat(price);
    if (priceValue > 0) {
      const newShares = Math.floor(totalValue / priceValue);
      setShares(newShares.toString());
    }
  };

  const handlePercentClick = (percent: number) => {
    if (activeTab === 'buy') {
      const maxBuyable = Math.floor(userBalance / (orderType === 'market' ? bestAsk : Number.parseFloat(price)));
      const shares = Math.floor(maxBuyable * percent);
      handleSharesChange(shares.toString());
    } else {
      const shares = Math.floor(userShares * percent);
      handleSharesChange(shares.toString());
    }
  };

  const handleSubmit = async () => {
    const orderPrice = orderType === 'market' 
      ? (activeTab === 'buy' ? bestAsk : bestBid)
      : Number.parseFloat(price);
    
    await onPlaceOrder({
      type: activeTab,
      orderType,
      price: orderPrice,
      shares: Number.parseInt(shares),
      total: Number.parseFloat(total),
    });
  };

  const executionPrice = orderType === 'market' 
    ? (activeTab === 'buy' ? bestAsk : bestBid)
    : Number.parseFloat(price);

  const isValidOrder = () => {
    const sharesNum = Number.parseInt(shares);
    const totalNum = Number.parseFloat(total);
    
    if (sharesNum <= 0) return false;
    
    if (activeTab === 'buy') {
      return totalNum <= userBalance && totalNum > 0;
    } else {
      return sharesNum <= userShares && sharesNum > 0;
    }
  };

  return (
    <div className="bg-zinc-900 rounded-lg border border-zinc-800 overflow-hidden">
      {/* Buy/Sell Tabs */}
      <div className="grid grid-cols-2">
        <button
          onClick={() => setActiveTab('buy')}
          className={`py-2 sm:py-3 text-sm sm:text-base font-semibold transition-colors ${
            activeTab === 'buy'
              ? 'bg-green-600 text-white'
              : 'bg-zinc-800 text-gray-400 hover:text-white'
          }`}
        >
          <span className="flex items-center justify-center gap-1 sm:gap-2">
            <ArrowDownRight className="w-3 h-3 sm:w-4 sm:h-4" />
            Buy
          </span>
        </button>
        <button
          onClick={() => setActiveTab('sell')}
          className={`py-2 sm:py-3 text-sm sm:text-base font-semibold transition-colors ${
            activeTab === 'sell'
              ? 'bg-red-600 text-white'
              : 'bg-zinc-800 text-gray-400 hover:text-white'
          }`}
        >
          <span className="flex items-center justify-center gap-1 sm:gap-2">
            <ArrowUpRight className="w-3 h-3 sm:w-4 sm:h-4" />
            Sell
          </span>
        </button>
      </div>

      <div className="p-2 sm:p-4 space-y-2 sm:space-y-4">
        {/* Order Type */}
        <div className="flex gap-1 sm:gap-2">
          <button
            onClick={() => setOrderType('limit')}
            className={`flex-1 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition ${
              orderType === 'limit'
                ? 'bg-zinc-700 text-white'
                : 'bg-zinc-800 text-gray-400 hover:text-white'
            }`}
          >
            Limit
          </button>
          <button
            onClick={() => setOrderType('market')}
            className={`flex-1 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition ${
              orderType === 'market'
                ? 'bg-zinc-700 text-white'
                : 'bg-zinc-800 text-gray-400 hover:text-white'
            }`}
          >
            Market
          </button>
        </div>

        {/* Balance/Holdings Display */}
        <div className="flex justify-between text-xs sm:text-sm">
          <span className="text-gray-400">
            {activeTab === 'buy' ? 'Available' : 'Shares'}
          </span>
          <span className="text-white font-medium">
            {activeTab === 'buy' 
              ? `₹${userBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
              : `${userShares.toLocaleString()}`
            }
          </span>
        </div>

        {/* Price Input (only for limit orders) */}
        {orderType === 'limit' && (
          <div>
            <label className="text-[10px] sm:text-xs text-gray-400 mb-1 block">Price (₹)</label>
            <div className="relative">
              <input
                type="number"
                value={price}
                onChange={(e) => handlePriceChange(e.target.value)}
                step="0.01"
                min="0"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-2 sm:px-4 py-2 sm:py-3 text-sm sm:text-base text-white font-medium focus:outline-none focus:border-red-600"
              />
              <div className="absolute right-1 sm:right-3 top-1/2 -translate-y-1/2 flex gap-0.5 sm:gap-1">
                <button
                  onClick={() => setPrice(bestBid.toFixed(2))}
                  className="text-[10px] sm:text-xs px-1 sm:px-2 py-0.5 sm:py-1 bg-zinc-700 rounded text-gray-400 hover:text-white"
                >
                  Bid
                </button>
                <button
                  onClick={() => setPrice(bestAsk.toFixed(2))}
                  className="text-[10px] sm:text-xs px-1 sm:px-2 py-0.5 sm:py-1 bg-zinc-700 rounded text-gray-400 hover:text-white"
                >
                  Ask
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Market Price Display (for market orders) */}
        {orderType === 'market' && (
          <div className="bg-zinc-800 rounded-lg p-2 sm:p-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-xs text-gray-400 flex items-center gap-1">
                <Info className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                Est. Price
              </span>
              <span className="text-white font-medium text-xs sm:text-sm">
                ₹{executionPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        )}

        {/* Shares Input */}
        <div>
          <label className="text-[10px] sm:text-xs text-gray-400 mb-1 block">Shares</label>
          <input
            type="number"
            value={shares}
            onChange={(e) => handleSharesChange(e.target.value)}
            min="1"
            step="1"
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-2 sm:px-4 py-2 sm:py-3 text-sm sm:text-base text-white font-medium focus:outline-none focus:border-red-600"
          />
        </div>

        {/* Quick Percent Buttons */}
        <div className="grid grid-cols-4 gap-1 sm:gap-2">
          {[0.25, 0.5, 0.75, 1].map((percent) => (
            <button
              key={percent}
              onClick={() => handlePercentClick(percent)}
              className="py-1.5 sm:py-2 text-[10px] sm:text-xs font-medium bg-zinc-800 rounded-lg text-gray-400 hover:text-white hover:bg-zinc-700 transition"
            >
              {percent * 100}%
            </button>
          ))}
        </div>

        {/* Total */}
        <div>
          <label className="text-[10px] sm:text-xs text-gray-400 mb-1 block">Total (₹)</label>
          <input
            type="number"
            value={total}
            onChange={(e) => handleTotalChange(e.target.value)}
            step="0.01"
            min="0"
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-2 sm:px-4 py-2 sm:py-3 text-sm sm:text-base text-white font-medium focus:outline-none focus:border-red-600"
          />
        </div>

        {/* Order Summary */}
        <div className="bg-zinc-800 rounded-lg p-2 sm:p-3 space-y-1 sm:space-y-2 text-xs sm:text-sm">
          <div className="flex justify-between">
            <span className="text-gray-400">Order Type</span>
            <span className="text-white capitalize">{orderType}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Est. Price</span>
            <span className="text-white">
              ₹{executionPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Shares</span>
            <span className="text-white">{Number.parseInt(shares).toLocaleString()}</span>
          </div>
          <div className="flex justify-between border-t border-zinc-700 pt-1 sm:pt-2">
            <span className="text-gray-400">Total</span>
            <span className={`font-semibold ${activeTab === 'buy' ? 'text-green-400' : 'text-red-400'}`}>
              ₹{(executionPrice * Number.parseInt(shares || '0')).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* Submit Button */}
        <Button
          onClick={handleSubmit}
          disabled={!isValidOrder() || processing}
          className="w-full py-2 sm:py-4 text-sm sm:text-sm font-semibold transition-colors bg-red-600 hover:bg-red-700 disabled:bg-red-600/50 text-white overflow-hidden text-ellipsis whitespace-nowrap"
        >
          {processing ? (
            <span className="flex items-center justify-center gap-2">
              <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white border-t-transparent rounded-full animate-spin flex-shrink-0" />
              <span className="truncate">Processing...</span>
            </span>
          ) : (
            <span className="truncate">{activeTab === 'buy' ? 'Buy' : 'Sell'} {symbol}</span>
          )}
        </Button>

        {/* Error Message */}
        {!isValidOrder() && Number.parseInt(shares) > 0 && (
          <p className="text-[10px] sm:text-xs text-red-400 text-center">
            {activeTab === 'buy' 
              ? 'Insufficient balance' 
              : 'Insufficient shares'}
          </p>
        )}
      </div>
    </div>
  );
}
