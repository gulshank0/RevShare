import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET - Get sell order details
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sellOrder = await prisma.sellOrder.findUnique({
      where: { id: params.id },
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
                analytics: true,
              },
            },
          },
        },
        investment: {
          select: {
            id: true,
            shares: true,
            totalAmount: true,
            createdAt: true,
          },
        },
        trades: {
          include: {
            buyer: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    if (!sellOrder) {
      return NextResponse.json(
        { success: false, error: 'Sell order not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      sellOrder,
    });
  } catch (error) {
    console.error('Error fetching sell order:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch sell order' },
      { status: 500 }
    );
  }
}

// PATCH - Update sell order (price or cancel)
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const sellOrder = await prisma.sellOrder.findUnique({
      where: { id: params.id },
    });

    if (!sellOrder) {
      return NextResponse.json(
        { success: false, error: 'Sell order not found' },
        { status: 404 }
      );
    }

    if (sellOrder.sellerId !== session.user.id) {
      return NextResponse.json(
        { success: false, error: 'You can only modify your own sell orders' },
        { status: 403 }
      );
    }

    if (sellOrder.status === 'FILLED' || sellOrder.status === 'CANCELLED') {
      return NextResponse.json(
        { success: false, error: 'Cannot modify a completed or cancelled order' },
        { status: 400 }
      );
    }

    const { pricePerShare, minShares } = await req.json();

    const updateData: any = {};

    if (pricePerShare && pricePerShare > 0) {
      updateData.pricePerShare = pricePerShare;
    }

    if (minShares && minShares > 0 && minShares <= sellOrder.sharesRemaining) {
      updateData.minShares = minShares;
    }

    const updatedOrder = await prisma.sellOrder.update({
      where: { id: params.id },
      data: updateData,
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
      sellOrder: updatedOrder,
      message: 'Sell order updated successfully',
    });
  } catch (error) {
    console.error('Error updating sell order:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update sell order' },
      { status: 500 }
    );
  }
}

// DELETE - Cancel a sell order
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const sellOrder = await prisma.sellOrder.findUnique({
      where: { id: params.id },
    });

    if (!sellOrder) {
      return NextResponse.json(
        { success: false, error: 'Sell order not found' },
        { status: 404 }
      );
    }

    if (sellOrder.sellerId !== session.user.id) {
      return NextResponse.json(
        { success: false, error: 'You can only cancel your own sell orders' },
        { status: 403 }
      );
    }

    if (sellOrder.status === 'FILLED') {
      return NextResponse.json(
        { success: false, error: 'Cannot cancel a filled order' },
        { status: 400 }
      );
    }

    if (sellOrder.status === 'CANCELLED') {
      return NextResponse.json(
        { success: false, error: 'Order is already cancelled' },
        { status: 400 }
      );
    }

    const cancelledOrder = await prisma.sellOrder.update({
      where: { id: params.id },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      sellOrder: cancelledOrder,
      message: 'Sell order cancelled successfully',
    });
  } catch (error) {
    console.error('Error cancelling sell order:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to cancel sell order' },
      { status: 500 }
    );
  }
}
