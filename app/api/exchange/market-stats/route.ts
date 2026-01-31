import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

interface TradeData {
  totalAmount: number;
  shares: number;
  pricePerShare: number;
}

interface MarketDataItem {
  id: string;
  symbol: string;
  channelName: string;
  price: number;
  priceChange: number;
  priceChangePercent: number;
  marketCap: number;
  volume24h: number;
  shares24h: number;
  investorCount: number;
  availableShares: number;
  totalShares: number;
  sharePercentage: number;
  analytics: unknown;
}

// GET /api/exchange/market-stats
export async function GET() {
  try {
    // Get all active offerings with their data
    const offerings = await prisma.offering.findMany({
      where: {
        status: 'ACTIVE',
      },
      include: {
        channel: {
          select: {
            channelName: true,
            analytics: true,
          },
        },
        investments: {
          where: {
            status: 'CONFIRMED',
          },
          select: {
            id: true,
          },
        },
        trades: {
          where: {
            status: 'COMPLETED',
            createdAt: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24h
            },
          },
          select: {
            totalAmount: true,
            shares: true,
            pricePerShare: true,
          },
        },
      },
    });

    // Calculate market-wide stats
    let totalMarketCap = 0;
    let total24hVolume = 0;
    
    const marketData: MarketDataItem[] = offerings.map(offering => {
      const marketCap = offering.pricePerShare * offering.totalShares;
      const volume24h = offering.trades.reduce((sum: number, t: TradeData) => sum + t.totalAmount, 0);
      const shares24h = offering.trades.reduce((sum: number, t: TradeData) => sum + t.shares, 0);
      const investorCount = offering.investments.length;
      
      totalMarketCap += marketCap;
      total24hVolume += volume24h;
      
      // Calculate price change (mock for now)
      const priceChange = (Math.random() - 0.45) * 10;
      const priceChangePercent = (priceChange / offering.pricePerShare) * 100;
      
      return {
        id: offering.id,
        symbol: offering.channel.channelName,
        channelName: offering.channel.channelName,
        price: offering.pricePerShare,
        priceChange,
        priceChangePercent,
        marketCap,
        volume24h,
        shares24h,
        investorCount,
        availableShares: offering.availableShares,
        totalShares: offering.totalShares,
        sharePercentage: offering.sharePercentage,
        analytics: offering.channel.analytics,
      };
    });

    // Sort by market cap
    marketData.sort((a: MarketDataItem, b: MarketDataItem) => b.marketCap - a.marketCap);

    // Calculate gainers and losers
    const gainers = [...marketData]
      .filter(m => m.priceChangePercent > 0)
      .sort((a, b) => b.priceChangePercent - a.priceChangePercent)
      .slice(0, 5);
    
    const losers = [...marketData]
      .filter(m => m.priceChangePercent < 0)
      .sort((a, b) => a.priceChangePercent - b.priceChangePercent)
      .slice(0, 5);

    const mostTraded = [...marketData]
      .sort((a, b) => b.volume24h - a.volume24h)
      .slice(0, 5);

    return NextResponse.json({
      success: true,
      stats: {
        totalMarketCap,
        total24hVolume,
        totalMarkets: offerings.length,
        totalInvestors: offerings.reduce((sum: number, o) => sum + o.investments.length, 0),
      },
      markets: marketData,
      gainers,
      losers,
      mostTraded,
    });
  } catch (error) {
    console.error('Market stats error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch market stats' },
      { status: 500 }
    );
  }
}
