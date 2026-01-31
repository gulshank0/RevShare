'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { ArrowUpRight, ArrowDownRight, TrendingUp, ChevronRight } from 'lucide-react';
import MiniChart from './MiniChart';

interface MarketTicker {
  id: string;
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  chartData: { time: number; value: number }[];
}

interface MarketTickerBarProps {
  markets: MarketTicker[];
}

export default function MarketTickerBar({ markets }: MarketTickerBarProps) {
  const [hoveredMarket, setHoveredMarket] = useState<string | null>(null);

  const formatPrice = (price: number) => {
    return `₹${price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="bg-zinc-900 border-b border-zinc-800 overflow-hidden">
      <div className="flex items-center gap-6 px-4 py-2 overflow-x-auto scrollbar-hide">
        <div className="flex items-center gap-2 shrink-0">
          <TrendingUp className="w-4 h-4 text-red-600" />
          <span className="text-sm font-semibold text-white">Live Markets</span>
        </div>
        
        <div className="flex items-center gap-8">
          {markets.map(market => (
            <Link
              key={market.id}
              href={`/exchange?symbol=${market.id}`}
              className="flex items-center gap-3 shrink-0 group"
              onMouseEnter={() => setHoveredMarket(market.id)}
              onMouseLeave={() => setHoveredMarket(null)}
            >
              <div>
                <span className="text-sm font-medium text-white group-hover:text-red-400 transition-colors">
                  {market.symbol}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-300">{formatPrice(market.price)}</span>
                  <span className={`text-xs flex items-center ${
                    market.changePercent >= 0 ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {market.changePercent >= 0 ? (
                      <ArrowUpRight className="w-3 h-3" />
                    ) : (
                      <ArrowDownRight className="w-3 h-3" />
                    )}
                    {Math.abs(market.changePercent).toFixed(2)}%
                  </span>
                </div>
              </div>
              {market.chartData.length > 0 && (
                <MiniChart
                  data={market.chartData}
                  width={60}
                  height={30}
                  positive={market.changePercent >= 0}
                />
              )}
            </Link>
          ))}
        </div>

        <Link 
          href="/exchange" 
          className="flex items-center gap-1 text-sm text-gray-400 hover:text-white shrink-0 ml-auto"
        >
          View All
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
