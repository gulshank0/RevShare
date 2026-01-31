'use client';

import { useEffect, useRef, useState } from 'react';
import { 
  createChart, 
  ColorType, 
  IChartApi, 
  Time,
  CandlestickSeries,
  LineSeries,
  AreaSeries,
  HistogramSeries,
} from 'lightweight-charts';

interface ChartDataPoint {
  time: Time;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

interface TradingViewChartProps {
  data: ChartDataPoint[];
  symbol: string;
  currentPrice: number;
  priceChange: number;
  priceChangePercent: number;
  height?: number;
  showVolume?: boolean;
  chartType?: 'candlestick' | 'line' | 'area';
  timeframe?: string;
  onTimeframeChange?: (tf: string) => void;
}

export default function TradingViewChart({
  data,
  symbol,
  currentPrice,
  priceChange,
  priceChangePercent,
  height = 400,
  showVolume = true,
  chartType = 'candlestick',
  timeframe = '1D',
  onTimeframeChange,
}: TradingViewChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const [selectedTimeframe, setSelectedTimeframe] = useState(timeframe);

  const timeframes = ['1H', '4H', '1D', '1W', '1M'];

  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Create the chart
    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#0f0f0f' },
        textColor: '#a1a1aa',
      },
      grid: {
        vertLines: { color: '#27272a' },
        horzLines: { color: '#27272a' },
      },
      crosshair: {
        mode: 1,
        vertLine: {
          width: 1,
          color: '#52525b',
          style: 2,
        },
        horzLine: {
          width: 1,
          color: '#52525b',
          style: 2,
        },
      },
      rightPriceScale: {
        borderColor: '#27272a',
        scaleMargins: {
          top: 0.1,
          bottom: showVolume ? 0.25 : 0.1,
        },
      },
      timeScale: {
        borderColor: '#27272a',
        timeVisible: true,
        secondsVisible: false,
      },
      width: chartContainerRef.current.clientWidth,
      height: height,
    });

    chartRef.current = chart;

    // Create main series based on chart type using addSeries with type
    if (chartType === 'candlestick') {
      const mainSeries = chart.addSeries(CandlestickSeries, {
        upColor: '#22c55e',
        downColor: '#ef4444',
        borderUpColor: '#22c55e',
        borderDownColor: '#ef4444',
        wickUpColor: '#22c55e',
        wickDownColor: '#ef4444',
      });

      const candleData = data.map(d => ({
        time: d.time,
        open: d.open,
        high: d.high,
        low: d.low,
        close: d.close,
      }));
      mainSeries.setData(candleData);
    } else if (chartType === 'line') {
      const mainSeries = chart.addSeries(LineSeries, {
        color: '#ef4444',
        lineWidth: 2,
      });

      const lineData = data.map(d => ({
        time: d.time,
        value: d.close,
      }));
      mainSeries.setData(lineData);
    } else {
      const mainSeries = chart.addSeries(AreaSeries, {
        topColor: 'rgba(239, 68, 68, 0.4)',
        bottomColor: 'rgba(239, 68, 68, 0.0)',
        lineColor: '#ef4444',
        lineWidth: 2,
      });

      const areaData = data.map(d => ({
        time: d.time,
        value: d.close,
      }));
      mainSeries.setData(areaData);
    }

    // Add volume series if enabled
    if (showVolume && data.some(d => d.volume !== undefined)) {
      const volumeSeries = chart.addSeries(HistogramSeries, {
        color: '#3b82f6',
        priceFormat: {
          type: 'volume',
        },
        priceScaleId: 'volume',
      });

      chart.priceScale('volume').applyOptions({
        scaleMargins: {
          top: 0.8,
          bottom: 0,
        },
      });

      const volumeData = data.map(d => ({
        time: d.time,
        value: d.volume || 0,
        color: d.close >= d.open ? 'rgba(34, 197, 94, 0.5)' : 'rgba(239, 68, 68, 0.5)',
      }));
      volumeSeries.setData(volumeData);
    }

    // Fit content
    chart.timeScale().fitContent();

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [data, chartType, height, showVolume]);

  const handleTimeframeChange = (tf: string) => {
    setSelectedTimeframe(tf);
    onTimeframeChange?.(tf);
  };

  return (
    <div className="bg-zinc-900 rounded-lg border border-zinc-800 overflow-hidden">
      {/* Chart Header */}
      <div className="p-2 sm:p-4 border-b border-zinc-800">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
          <div className="flex items-center gap-2 sm:gap-4">
            <div>
              <h2 className="text-base sm:text-xl font-bold text-white truncate max-w-[150px] sm:max-w-none">{symbol}</h2>
              <div className="flex items-center gap-1 sm:gap-3 mt-0.5 sm:mt-1">
                <span className="text-lg sm:text-2xl font-bold text-white">
                  ₹{currentPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
                <span className={`flex items-center text-xs sm:text-sm font-semibold px-1.5 sm:px-2 py-0.5 rounded ${
                  priceChange >= 0 
                    ? 'bg-green-500/20 text-green-400' 
                    : 'bg-red-500/20 text-red-400'
                }`}>
                  {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)} ({priceChangePercent.toFixed(2)}%)
                </span>
              </div>
            </div>
          </div>

          {/* Timeframe Selector */}
          <div className="flex items-center gap-0.5 sm:gap-1 bg-zinc-800 rounded-lg p-0.5 sm:p-1 overflow-x-auto">
            {timeframes.map((tf) => (
              <button
                key={tf}
                onClick={() => handleTimeframeChange(tf)}
                className={`px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm font-medium rounded-md transition flex-shrink-0 ${
                  selectedTimeframe === tf
                    ? 'bg-red-600 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-zinc-700'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Chart Container */}
      <div ref={chartContainerRef} className="w-full" />

      {/* Chart Footer - OHLCV */}
      {data.length > 0 && (
        <div className="px-2 sm:px-4 py-1.5 sm:py-2 border-t border-zinc-800 flex flex-wrap gap-2 sm:gap-4 text-[10px] sm:text-xs">
          <div>
            <span className="text-gray-400">O: </span>
            <span className="text-white">₹{data[data.length - 1]?.open.toFixed(2)}</span>
          </div>
          <div>
            <span className="text-gray-400">H: </span>
            <span className="text-green-400">₹{data[data.length - 1]?.high.toFixed(2)}</span>
          </div>
          <div>
            <span className="text-gray-400">L: </span>
            <span className="text-red-400">₹{data[data.length - 1]?.low.toFixed(2)}</span>
          </div>
          <div>
            <span className="text-gray-400">C: </span>
            <span className="text-white">₹{data[data.length - 1]?.close.toFixed(2)}</span>
          </div>
          {data[data.length - 1]?.volume && (
            <div>
              <span className="text-gray-400">Vol: </span>
              <span className="text-blue-400">{data[data.length - 1]?.volume?.toLocaleString()}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
