'use client';

import { useMemo } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface MarketDepthData {
  price: number;
  bidVolume: number;
  askVolume: number;
}

interface MarketDepthProps {
  data: MarketDepthData[];
  currentPrice: number;
}

export default function MarketDepth({ data, currentPrice }: MarketDepthProps) {
  const maxVolume = useMemo(() => {
    return Math.max(
      ...data.map(d => Math.max(d.bidVolume, d.askVolume)),
      1
    );
  }, [data]);

  const { totalBidVolume, totalAskVolume } = useMemo(() => {
    return data.reduce(
      (acc, d) => ({
        totalBidVolume: acc.totalBidVolume + d.bidVolume,
        totalAskVolume: acc.totalAskVolume + d.askVolume,
      }),
      { totalBidVolume: 0, totalAskVolume: 0 }
    );
  }, [data]);

  const bidAskRatio = totalBidVolume / (totalBidVolume + totalAskVolume || 1);
  const sentiment = bidAskRatio > 0.55 ? 'bullish' : bidAskRatio < 0.45 ? 'bearish' : 'neutral';

  return (
    <div className="bg-zinc-900 rounded-lg border border-zinc-800 overflow-hidden ">
      {/* Header */}
      <div className="p-2 sm:p-3 border-b border-zinc-800">
        <div className="flex items-center justify-between">
          <h3 className="text-xs sm:text-sm font-semibold text-white">Market Depth</h3>
          <div className={`flex items-center gap-1 text-[10px] sm:text-xs font-medium px-1.5 sm:px-2 py-0.5 sm:py-1 rounded ${
            sentiment === 'bullish' 
              ? 'bg-green-500/20 text-green-400'
              : sentiment === 'bearish'
              ? 'bg-red-500/20 text-red-400'
              : 'bg-zinc-700 text-gray-400'
          }`}>
            {sentiment === 'bullish' && <TrendingUp className="w-2.5 h-2.5 sm:w-3 sm:h-3" />}
            {sentiment === 'bearish' && <TrendingDown className="w-2.5 h-2.5 sm:w-3 sm:h-3" />}
            {sentiment === 'neutral' && <Minus className="w-2.5 h-2.5 sm:w-3 sm:h-3" />}
            <span className="hidden xs:inline">{sentiment.charAt(0).toUpperCase() + sentiment.slice(1)}</span>
          </div>
        </div>
      </div>

      {/* Depth Visualization */}
      <div className="p-2 sm:p-4">
        {/* Volume Summary */}
        <div className="flex justify-between text-[10px] sm:text-xs mb-2 sm:mb-4">
          <div className="flex items-center gap-1 sm:gap-2">
            <div className="w-2 h-2 sm:w-3 sm:h-3 bg-green-500/50 rounded"></div>
            <span className="text-gray-400 hidden xs:inline">Bids:</span>
            <span className="text-green-400 font-medium">{totalBidVolume.toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            <span className="text-gray-400 hidden xs:inline">Asks:</span>
            <span className="text-red-400 font-medium">{totalAskVolume.toLocaleString()}</span>
            <div className="w-2 h-2 sm:w-3 sm:h-3 bg-red-500/50 rounded"></div>
          </div>
        </div>

        {/* Bid/Ask Ratio Bar */}
        <div className="h-1.5 sm:h-2 bg-zinc-700 rounded-full overflow-hidden mb-2 sm:mb-4">
          <div
            className="h-full bg-gradient-to-r from-green-500 to-green-400 transition-all duration-500"
            style={{ width: `${bidAskRatio * 100}%` }}
          />
        </div>

        {/* Depth Chart */}
        <div className="space-y-0.5 sm:space-y-1">
          {data.map((level, index) => (
            <div key={index} className="relative h-5 sm:h-6 flex items-center">
              {/* Bid Bar (left side) */}
              <div className="absolute left-0 right-1/2 h-full flex justify-end">
                <div
                  className="h-full bg-green-500/30 rounded-l transition-all duration-300"
                  style={{ width: `${(level.bidVolume / maxVolume) * 100}%` }}
                />
              </div>
              
              {/* Price Label (center) */}
              <div className="relative z-10 w-full flex justify-center">
                <span className={`text-[10px] sm:text-xs px-1 sm:px-2 py-0.5 rounded ${
                  Math.abs(level.price - currentPrice) < 0.01
                    ? 'bg-zinc-700 text-white font-medium'
                    : 'text-gray-500'
                }`}>
                  ₹{level.price.toFixed(2)}
                </span>
              </div>
              
              {/* Ask Bar (right side) */}
              <div className="absolute left-1/2 right-0 h-full flex justify-start">
                <div
                  className="h-full bg-red-500/30 rounded-r transition-all duration-300"
                  style={{ width: `${(level.askVolume / maxVolume) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="flex justify-center gap-3 sm:gap-6 mt-2 sm:mt-4 pt-2 sm:pt-4 border-t border-zinc-800">
          <div className="flex items-center gap-1 sm:gap-2 text-[10px] sm:text-xs">
            <div className="w-4 sm:w-8 h-1.5 sm:h-2 bg-green-500/30 rounded"></div>
            <span className="text-gray-400">Buy</span>
          </div>
          <div className="flex items-center gap-1 sm:gap-2 text-[10px] sm:text-xs">
            <div className="w-4 sm:w-8 h-1.5 sm:h-2 bg-red-500/30 rounded"></div>
            <span className="text-gray-400">Sell</span>
          </div>
        </div>
      </div>
    </div>
  );
}
