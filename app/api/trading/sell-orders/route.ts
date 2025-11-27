import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET - List all active sell orders (optionally filter by offering)
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const offeringId = searchParams.get('offeringId');
    const userId = searchParams.get('userId');
    const myOrders = searchParams.get('myOrders') === 'true';

    const session = await getServerSession(authOptions);

    // Build where clause
    const where: any = {
      status: { in: ['ACTIVE', 'PARTIALLY_FILLED'] },
      sharesRemaining: { gt: 0 },
    };

    if (offeringId) {
      where.offeringId = offeringId;
    }

    // If user wants their own orders
    if (myOrders && session?.user?.id) {
      where.sellerId = session.user.id;
      delete where.status; // Show all statuses for own orders
      delete where.sharesRemaining;
    } else if (userId) {
      where.sellerId = userId;
    }

    const sellOrders = await prisma.sellOrder.findMany({
      where,
      include: {
        seller: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
        offering: {
          include: {
            channel: {
              select: {
                channelName: true,
                channelUrl: true,
              },
            },
          },
        },
        investment: {
          select: {
            id: true,
            shares: true,
            totalAmount: true,
          },
        },
        _count: {
          select: {
            trades: true,
          },
        },
      },
      orderBy: [
        { pricePerShare: 'asc' }, // Best price first
        { createdAt: 'asc' }, // Then by oldest
      ],
    });

    return NextResponse.json({
      success: true,
      sellOrders,
      total: sellOrders.length,
    });
  } catch (error) {
    console.error('Error fetching sell orders:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch sell orders' },
      { status: 500 }
    );
  }
}

// POST - Create a new sell order
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { investmentId, shares, pricePerShare, minShares = 1, expiresAt } = await req.json();

    // Validate input
    if (!investmentId || !shares || shares < 1) {
      return NextResponse.json(
        { success: false, error: 'Invalid parameters. Provide investmentId and shares.' },
        { status: 400 }
      );
    }

    if (!pricePerShare || pricePerShare <= 0) {
      return NextResponse.json(
        { success: false, error: 'Price per share must be greater than 0' },
        { status: 400 }
      );
    }

    // Fetch the investment
    const investment = await prisma.investment.findUnique({
      where: { id: investmentId },
      include: {
        offering: {
          include: {
            channel: true,
          },
        },
      },
    });

    if (!investment) {
      return NextResponse.json(
        { success: false, error: 'Investment not found' },
        { status: 404 }
      );
    }

    // Verify ownership
    if (investment.investorId !== session.user.id) {
      return NextResponse.json(
        { success: false, error: 'You do not own this investment' },
        { status: 403 }
      );
    }

    // Verify investment is confirmed
    if (investment.status !== 'CONFIRMED') {
      return NextResponse.json(
        { success: false, error: 'Investment must be confirmed before selling' },
        { status: 400 }
      );
    }

    // Calculate available shares (shares owned - shares already listed for sale)
    const existingListings = await prisma.sellOrder.findMany({
      where: {
        investmentId,
        sellerId: session.user.id,
        status: { in: ['ACTIVE', 'PARTIALLY_FILLED'] },
      },
      select: {
        sharesRemaining: true,
      },
    });

    const sharesAlreadyListed = existingListings.reduce(
      (sum, order) => sum + order.sharesRemaining,
      0
    );
    const availableShares = investment.shares - sharesAlreadyListed;

    if (shares > availableShares) {
      return NextResponse.json(
        {
          success: false,
          error: sharesAlreadyListed > 0 
            ? `You can only list ${availableShares} shares. ${sharesAlreadyListed} shares are already listed.`
            : `You can only list ${availableShares} shares.`,
        },
        { status: 400 }
      );
    }

    // Create the sell order
    const sellOrder = await prisma.sellOrder.create({
      data: {
        sellerId: session.user.id,
        investmentId,
        offeringId: investment.offeringId,
        sharesListed: shares,
        sharesRemaining: shares,
        pricePerShare,
        minShares: Math.min(minShares, shares),
        status: 'ACTIVE',
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      },
      include: {
        offering: {
          include: {
            channel: {
              select: {
                channelName: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      sellOrder,
      message: `Successfully listed ${shares} shares for sale at ₹${pricePerShare} per share`,
    });
  } catch (error) {
    console.error('Error creating sell order:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create sell order' },
      { status: 500 }
    );
  }
}
