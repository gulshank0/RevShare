import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/exchange/price-history?offeringId=xxx&timeframe=1D
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const offeringId = searchParams.get('offeringId');
    const timeframe = searchParams.get('timeframe') || '1D';

    if (!offeringId) {
      return NextResponse.json(
        { success: false, error: 'Offering ID is required' },
        { status: 400 }
      );
    }

    // Get the offering for base price
    const offering = await prisma.offering.findUnique({
      where: { id: offeringId },
      select: {
        id: true,
        pricePerShare: true,
        channel: {
          select: {
            channelName: true,
          },
        },
      },
    });

    if (!offering) {
      return NextResponse.json(
        { success: false, error: 'Offering not found' },
        { status: 404 }
      );
    }

    // Get completed trades to build price history
    const trades = await prisma.trade.findMany({
      where: {
        offeringId,
        status: 'COMPLETED',
      },
      orderBy: {
        createdAt: 'asc',
      },
      select: {
        pricePerShare: true,
        shares: true,
        totalAmount: true,
        createdAt: true,
      },
    });

    // Calculate time range based on timeframe
    const now = new Date();
    let startDate: Date;
    let interval: number; // in minutes

    switch (timeframe) {
      case '1H':
        startDate = new Date(now.getTime() - 60 * 60 * 1000);
        interval = 1;
        break;
      case '4H':
        startDate = new Date(now.getTime() - 4 * 60 * 60 * 1000);
        interval = 5;
        break;
      case '1W':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        interval = 60 * 4;
        break;
      case '1M':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        interval = 60 * 24;
        break;
      case '1D':
      default:
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        interval = 15;
        break;
    }

    // Generate OHLCV data from trades (or synthetic if no trades)
    const priceHistory = [];
    const basePrice = offering.pricePerShare;
    let currentPrice = basePrice * 0.95; // Start slightly below current

    // If we have actual trades, use them
    if (trades.length > 0) {
      // Group trades by interval
      const tradesByInterval = new Map<number, typeof trades>();
      
      trades.forEach(trade => {
        const intervalStart = Math.floor(trade.createdAt.getTime() / (interval * 60 * 1000)) * interval * 60 * 1000;
        if (!tradesByInterval.has(intervalStart)) {
          tradesByInterval.set(intervalStart, []);
        }
        tradesByInterval.get(intervalStart)!.push(trade);
      });

      // Convert to OHLCV
      let lastClose = basePrice * 0.95;
      
      for (let time = startDate.getTime(); time <= now.getTime(); time += interval * 60 * 1000) {
        const intervalTrades = tradesByInterval.get(time);
        
        if (intervalTrades && intervalTrades.length > 0) {
          const prices = intervalTrades.map(t => t.pricePerShare);
          const volumes = intervalTrades.reduce((sum, t) => sum + t.shares, 0);
          
          priceHistory.push({
            time: Math.floor(time / 1000),
            open: lastClose,
            high: Math.max(...prices),
            low: Math.min(...prices),
            close: prices[prices.length - 1],
            volume: volumes,
          });
          
          lastClose = prices[prices.length - 1];
        } else {
          // Generate synthetic candle with slight variation
          const change = (Math.random() - 0.48) * 0.02;
          const open = lastClose;
          const close = lastClose * (1 + change);
          const high = Math.max(open, close) * (1 + Math.random() * 0.005);
          const low = Math.min(open, close) * (1 - Math.random() * 0.005);
          
          priceHistory.push({
            time: Math.floor(time / 1000),
            open: Number(open.toFixed(2)),
            high: Number(high.toFixed(2)),
            low: Number(low.toFixed(2)),
            close: Number(close.toFixed(2)),
            volume: Math.floor(Math.random() * 500),
          });
          
          lastClose = close;
        }
      }
    } else {
      // Generate synthetic data if no trades
      for (let time = startDate.getTime(); time <= now.getTime(); time += interval * 60 * 1000) {
        const change = (Math.random() - 0.48) * 0.02;
        const open = currentPrice;
        currentPrice = currentPrice * (1 + change);
        const close = currentPrice;
        const high = Math.max(open, close) * (1 + Math.random() * 0.005);
        const low = Math.min(open, close) * (1 - Math.random() * 0.005);
        
        priceHistory.push({
          time: Math.floor(time / 1000),
          open: Number(open.toFixed(2)),
          high: Number(high.toFixed(2)),
          low: Number(low.toFixed(2)),
          close: Number(close.toFixed(2)),
          volume: Math.floor(Math.random() * 1000) + 100,
        });
      }
      
      // Ensure last candle closes at current price
      if (priceHistory.length > 0) {
        priceHistory[priceHistory.length - 1].close = basePrice;
      }
    }

    // Calculate stats
    const firstPrice = priceHistory[0]?.open || basePrice;
    const lastPrice = priceHistory[priceHistory.length - 1]?.close || basePrice;
    const change = lastPrice - firstPrice;
    const changePercent = (change / firstPrice) * 100;
    const high24h = Math.max(...priceHistory.map(p => p.high));
    const low24h = Math.min(...priceHistory.map(p => p.low));
    const volume24h = priceHistory.reduce((sum, p) => sum + p.volume, 0);

    return NextResponse.json({
      success: true,
      symbol: offering.channel.channelName,
      currentPrice: basePrice,
      priceHistory,
      stats: {
        change,
        changePercent,
        high24h,
        low24h,
        volume24h,
      },
    });
  } catch (error) {
    console.error('Price history error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch price history' },
      { status: 500 }
    );
  }
}
