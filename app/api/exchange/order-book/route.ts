import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/exchange/order-book?offeringId=xxx
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const offeringId = searchParams.get('offeringId');

    if (!offeringId) {
      return NextResponse.json(
        { success: false, error: 'Offering ID is required' },
        { status: 400 }
      );
    }

    // Get the offering for current price
    const offering = await prisma.offering.findUnique({
      where: { id: offeringId },
      select: {
        id: true,
        pricePerShare: true,
        availableShares: true,
        totalShares: true,
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

    // Get active sell orders (asks)
    const sellOrders = await prisma.sellOrder.findMany({
      where: {
        offeringId,
        status: {
          in: ['ACTIVE', 'PARTIALLY_FILLED'],
        },
        sharesRemaining: {
          gt: 0,
        },
      },
      orderBy: {
        pricePerShare: 'asc',
      },
      select: {
        id: true,
        pricePerShare: true,
        sharesRemaining: true,
        minShares: true,
        seller: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Aggregate asks by price level
    const asksByPrice = new Map<number, { price: number; shares: number; total: number; orders: string[] }>();
    
    sellOrders.forEach(order => {
      const price = Number(order.pricePerShare.toFixed(2));
      if (!asksByPrice.has(price)) {
        asksByPrice.set(price, {
          price,
          shares: 0,
          total: 0,
          orders: [],
        });
      }
      const level = asksByPrice.get(price)!;
      level.shares += order.sharesRemaining;
      level.total = level.price * level.shares;
      level.orders.push(order.id);
    });

    const asks = Array.from(asksByPrice.values())
      .sort((a, b) => a.price - b.price)
      .slice(0, 15);

    // Generate synthetic bids (buy orders) based on current market
    // In a real system, these would come from actual limit buy orders
    const currentPrice = offering.pricePerShare;
    const bids: { price: number; shares: number; total: number }[] = [];
    
    for (let i = 1; i <= 15; i++) {
      const bidPrice = Number((currentPrice * (1 - i * 0.005)).toFixed(2));
      const shares = Math.floor(Math.random() * 500) + 50 + (15 - i) * 20;
      bids.push({
        price: bidPrice,
        shares,
        total: Number((bidPrice * shares).toFixed(2)),
      });
    }

    // Calculate spread
    const bestBid = bids.length > 0 ? bids[0].price : currentPrice * 0.995;
    const bestAsk = asks.length > 0 ? asks[0].price : currentPrice * 1.005;
    const spread = bestAsk - bestBid;
    const spreadPercent = (spread / currentPrice) * 100;

    // Calculate market depth
    const totalBidVolume = bids.reduce((sum, b) => sum + b.shares, 0);
    const totalAskVolume = asks.reduce((sum, a) => sum + a.shares, 0);
    const bidAskRatio = totalBidVolume / (totalBidVolume + totalAskVolume || 1);

    return NextResponse.json({
      success: true,
      symbol: offering.channel.channelName,
      currentPrice,
      orderBook: {
        bids,
        asks,
        spread: {
          value: spread,
          percent: spreadPercent,
        },
        depth: {
          totalBidVolume,
          totalAskVolume,
          bidAskRatio,
          sentiment: bidAskRatio > 0.55 ? 'bullish' : bidAskRatio < 0.45 ? 'bearish' : 'neutral',
        },
      },
      bestBid,
      bestAsk,
    });
  } catch (error) {
    console.error('Order book error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch order book' },
      { status: 500 }
    );
  }
}
