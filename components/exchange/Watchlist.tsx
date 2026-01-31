'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Star, 
  ArrowUpRight, 
  ArrowDownRight, 
  X, 
  Plus,
  Search,
  Bell,
  BellOff
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface WatchlistItem {
  id: string;
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  alertPrice?: number;
  alertEnabled?: boolean;
}

interface WatchlistProps {
  items: WatchlistItem[];
  onRemove: (id: string) => void;
  onAlertToggle?: (id: string, price?: number) => void;
  maxItems?: number;
}

export default function Watchlist({ 
  items, 
  onRemove, 
  onAlertToggle,
  maxItems = 10 
}: WatchlistProps) {
  const [editingAlert, setEditingAlert] = useState<string | null>(null);
  const [alertPrice, setAlertPrice] = useState<string>('');

  const handleSetAlert = (id: string) => {
    if (alertPrice && onAlertToggle) {
      onAlertToggle(id, Number.parseFloat(alertPrice));
      setEditingAlert(null);
      setAlertPrice('');
    }
  };

  return (
    <div className="bg-zinc-900 rounded-lg border border-zinc-800 overflow-hidden">
      {/* Header */}
      <div className="p-3 border-b border-zinc-800 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
          Watchlist
        </h3>
        <span className="text-xs text-gray-400">{items.length}/{maxItems}</span>
      </div>

      {/* Watchlist Items */}
      <div className="divide-y divide-zinc-800 max-h-80 overflow-y-auto">
        {items.length === 0 ? (
          <div className="p-6 text-center">
            <Star className="w-8 h-8 mx-auto text-gray-600 mb-2" />
            <p className="text-sm text-gray-400">No items in watchlist</p>
            <p className="text-xs text-gray-500 mt-1">Click the star icon on any market to add it</p>
          </div>
        ) : (
          items.map(item => (
            <div key={item.id} className="p-3 hover:bg-zinc-800/50 transition-colors">
              <div className="flex items-center justify-between">
                <Link 
                  href={`/exchange?symbol=${item.id}`}
                  className="flex-1 group"
                >
                  <p className="text-sm font-medium text-white group-hover:text-red-400 transition-colors">
                    {item.symbol}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-sm text-gray-300">
                      ₹{item.price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                    <span className={`text-xs flex items-center ${
                      item.changePercent >= 0 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {item.changePercent >= 0 ? (
                        <ArrowUpRight className="w-3 h-3" />
                      ) : (
                        <ArrowDownRight className="w-3 h-3" />
                      )}
                      {Math.abs(item.changePercent).toFixed(2)}%
                    </span>
                  </div>
                </Link>

                <div className="flex items-center gap-1">
                  {/* Alert Button */}
                  {onAlertToggle && (
                    <button
                      onClick={() => {
                        if (item.alertEnabled) {
                          onAlertToggle(item.id);
                        } else {
                          setEditingAlert(item.id);
                          setAlertPrice(item.price.toFixed(2));
                        }
                      }}
                      className={`p-1.5 rounded transition-colors ${
                        item.alertEnabled 
                          ? 'text-yellow-400 hover:text-yellow-300' 
                          : 'text-gray-500 hover:text-gray-400'
                      }`}
                      title={item.alertEnabled ? 'Alert enabled' : 'Set price alert'}
                    >
                      {item.alertEnabled ? (
                        <Bell className="w-4 h-4 fill-yellow-400" />
                      ) : (
                        <BellOff className="w-4 h-4" />
                      )}
                    </button>
                  )}
                  
                  {/* Remove Button */}
                  <button
                    onClick={() => onRemove(item.id)}
                    className="p-1.5 text-gray-500 hover:text-red-400 rounded transition-colors"
                    title="Remove from watchlist"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Alert Price Input */}
              {editingAlert === item.id && (
                <div className="mt-2 flex items-center gap-2">
                  <input
                    type="number"
                    value={alertPrice}
                    onChange={(e) => setAlertPrice(e.target.value)}
                    placeholder="Alert price"
                    className="flex-1 px-2 py-1 text-sm bg-zinc-800 border border-zinc-700 rounded text-white focus:outline-none focus:border-red-600"
                  />
                  <button
                    onClick={() => handleSetAlert(item.id)}
                    className="px-2 py-1 text-xs bg-yellow-600 text-white rounded hover:bg-yellow-700"
                  >
                    Set
                  </button>
                  <button
                    onClick={() => {
                      setEditingAlert(null);
                      setAlertPrice('');
                    }}
                    className="px-2 py-1 text-xs text-gray-400 hover:text-white"
                  >
                    Cancel
                  </button>
                </div>
              )}

              {/* Show Alert Price if enabled */}
              {item.alertEnabled && item.alertPrice && editingAlert !== item.id && (
                <div className="mt-1 text-xs text-yellow-400">
                  Alert at ₹{item.alertPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
