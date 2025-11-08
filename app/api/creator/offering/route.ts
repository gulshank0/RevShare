import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      channelId,
      title,
      description,
      sharePercentage,
      totalShares,
      pricePerShare,
      minInvestment,
      maxInvestment,
      duration,
    } = body;

    // Validate channel ownership
    const channel = await prisma.channel.findFirst({
      where: {
        id: channelId,
        ownerId: session.user.id,
        status: 'VERIFIED',
      },
    });

    if (!channel) {
      return NextResponse.json(
        { success: false, error: 'Channel not found or not verified' },
        { status: 404 }
      );
    }

    // Validate offering parameters
    if (sharePercentage < 1 || sharePercentage > 50) {
      return NextResponse.json(
        { success: false, error: 'Share percentage must be between 1% and 50%' },
        { status: 400 }
      );
    }

    if (minInvestment < 100) {
      return NextResponse.json(
        { success: false, error: 'Minimum investment must be at least $100' },
        { status: 400 }
      );
    }

    // Create offering
    const offering = await prisma.offering.create({
      data: {
        channelId,
        title,
        description,
        sharePercentage,
        totalShares,
        availableShares: totalShares,
        pricePerShare,
        minInvestment,
        maxInvestment,
        duration,
        status: 'PENDING_APPROVAL', // Requires admin approval
      },
    });

    return NextResponse.json({
      success: true,
      offering,
      message: 'Offering created successfully. Pending admin approval.',
    });
  } catch (error) {
    console.error('Offering creation error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create offering' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const offerings = await prisma.offering.findMany({
      where: {
        channel: {
          ownerId: session.user.id,
        },
      },
      include: {
        channel: {
          select: {
            channelName: true,
            channelUrl: true,
          },
        },
        investments: {
          where: { status: 'CONFIRMED' },
          select: {
            id: true,
            shares: true,
            totalAmount: true,
            investor: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      offerings,
    });
  } catch (error) {
    console.error('Offerings fetch error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch offerings' },
      { status: 500 }
    );
  }
}
