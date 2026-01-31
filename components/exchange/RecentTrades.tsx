'use client';

import { ArrowUpRight, ArrowDownRight, Clock } from 'lucide-react';

interface Trade {
  id: string;
  price: number;
  shares: number;
  total: number;
  side: 'buy' | 'sell';
  timestamp: string;
}

interface RecentTradesProps {
  trades: Trade[];
  maxRows?: number;
}

export default function RecentTrades({ trades, maxRows = 20 }: RecentTradesProps) {
  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const formatPrice = (price: number) => {
    return `₹${price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="bg-zinc-900 rounded-lg border border-zinc-800 overflow-hidden h-[300px] sm:h-[400px] flex flex-col">
      {/* Header */}
      <div className="p-2 sm:p-3 border-b border-zinc-800">
        <h3 className="text-xs sm:text-sm font-semibold text-white flex items-center gap-2">
          <Clock className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400" />
          Recent Trades
        </h3>
      </div>

      {/* Column Headers */}
      <div className="grid grid-cols-4 gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 text-[10px] sm:text-xs text-gray-400 border-b border-zinc-800">
        <span>Price</span>
        <span className="text-center">Size</span>
        <span className="text-center hidden xs:block">Total</span>
        <span className="text-right">Time</span>
      </div>

      {/* Trades List */}
      <div className="overflow-y-auto flex-1 max-h-60 sm:max-h-80">
        {trades.length === 0 ? (
          <div className="px-2 sm:px-3 py-6 sm:py-8 text-center text-gray-500 text-xs sm:text-sm">
            No recent trades
          </div>
        ) : (
          trades.slice(0, maxRows).map((trade) => (
            <div
              key={trade.id}
              className="grid grid-cols-4 gap-1 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-xs hover:bg-zinc-800/50 transition-colors"
            >
              <span className={`font-medium flex items-center gap-0.5 sm:gap-1 truncate ${
                trade.side === 'buy' ? 'text-green-400' : 'text-red-400'
              }`}>
                {trade.side === 'buy' ? (
                  <ArrowUpRight className="w-2.5 h-2.5 sm:w-3 sm:h-3 flex-shrink-0" />
                ) : (
                  <ArrowDownRight className="w-2.5 h-2.5 sm:w-3 sm:h-3 flex-shrink-0" />
                )}
                <span className="truncate">{formatPrice(trade.price)}</span>
              </span>
              <span className="text-center text-white">{trade.shares.toLocaleString()}</span>
              <span className="text-center text-gray-400 hidden xs:block truncate">{formatPrice(trade.total)}</span>
              <span className="text-right text-gray-500">{formatTime(trade.timestamp)}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
