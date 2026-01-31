'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { 
  ArrowUpRight, 
  ArrowDownRight, 
  Wallet,
  TrendingUp,
  TrendingDown,
  MoreVertical
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Position {
  id: string;
  symbol: string;
  channelName: string;
  shares: number;
  avgPrice: number;
  currentPrice: number;
  marketValue: number;
  unrealizedPnL: number;
  unrealizedPnLPercent: number;
  sharePercentage: number;
}

interface PositionTrackerProps {
  positions: Position[];
  totalValue: number;
  totalPnL: number;
  totalPnLPercent: number;
  onSell?: (positionId: string) => void;
}

export default function PositionTracker({
  positions,
  totalValue,
  totalPnL,
  totalPnLPercent,
  onSell,
}: PositionTrackerProps) {
  const sortedPositions = useMemo(() => {
    return [...positions].sort((a, b) => b.marketValue - a.marketValue);
  }, [positions]);

  const formatCurrency = (value: number) => {
    return `₹${Math.abs(value).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="bg-zinc-900 rounded-lg border border-zinc-800 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-zinc-800">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Wallet className="w-5 h-5 text-red-600" />
            Your Positions
          </h3>
          <Link href="/trading/portfolio">
            <Button size="sm" className="youtube-button-outline text-xs">
              View All
            </Button>
          </Link>
        </div>
        
        {/* Summary */}
        <div className="grid grid-cols-2 gap-4 mt-4">
          <div>
            <p className="text-xs text-gray-400">Total Value</p>
            <p className="text-xl font-bold text-white">{formatCurrency(totalValue)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-400">Unrealized P&L</p>
            <p className={`text-xl font-bold flex items-center justify-end gap-1 ${
              totalPnL >= 0 ? 'text-green-400' : 'text-red-400'
            }`}>
              {totalPnL >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              {totalPnL >= 0 ? '+' : '-'}{formatCurrency(totalPnL)}
              <span className="text-sm">({totalPnLPercent >= 0 ? '+' : ''}{totalPnLPercent.toFixed(2)}%)</span>
            </p>
          </div>
        </div>
      </div>

      {/* Positions List */}
      <div className="divide-y divide-zinc-800 max-h-80 overflow-y-auto">
        {positions.length === 0 ? (
          <div className="p-8 text-center">
            <Wallet className="w-12 h-12 mx-auto text-gray-600 mb-3" />
            <p className="text-gray-400 mb-4">No positions yet</p>
            <Link href="/marketplace">
              <Button className="youtube-button">Start Investing</Button>
            </Link>
          </div>
        ) : (
          sortedPositions.map(position => (
            <div key={position.id} className="p-4 hover:bg-zinc-800/50 transition-colors">
              <div className="flex items-center justify-between">
                <Link 
                  href={`/exchange?symbol=${position.id}`}
                  className="flex-1 group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center shrink-0">
                      <span className="text-white font-bold text-sm">
                        {position.channelName[0]?.toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="text-white font-medium group-hover:text-red-400 transition-colors">
                        {position.channelName}
                      </p>
                      <p className="text-xs text-gray-400">
                        {position.shares} shares • {position.sharePercentage}% Rev
                      </p>
                    </div>
                  </div>
                </Link>

                <div className="text-right">
                  <p className="text-white font-medium">{formatCurrency(position.marketValue)}</p>
                  <p className={`text-xs flex items-center justify-end gap-1 ${
                    position.unrealizedPnL >= 0 ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {position.unrealizedPnL >= 0 ? (
                      <ArrowUpRight className="w-3 h-3" />
                    ) : (
                      <ArrowDownRight className="w-3 h-3" />
                    )}
                    {position.unrealizedPnL >= 0 ? '+' : ''}{formatCurrency(position.unrealizedPnL)} ({position.unrealizedPnLPercent.toFixed(2)}%)
                  </p>
                </div>

                {onSell && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="ml-3 border-red-600 text-red-400 hover:bg-red-600/10"
                    onClick={() => onSell(position.id)}
                  >
                    Sell
                  </Button>
                )}
              </div>

              {/* Position Details */}
              <div className="mt-3 grid grid-cols-3 gap-4 text-xs">
                <div>
                  <span className="text-gray-500">Avg Price</span>
                  <p className="text-gray-300">{formatCurrency(position.avgPrice)}</p>
                </div>
                <div>
                  <span className="text-gray-500">Current</span>
                  <p className="text-gray-300">{formatCurrency(position.currentPrice)}</p>
                </div>
                <div>
                  <span className="text-gray-500">Cost Basis</span>
                  <p className="text-gray-300">{formatCurrency(position.shares * position.avgPrice)}</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
