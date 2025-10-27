import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const offering = await prisma.offering.findUnique({
      where: { id: params.id },
      include: {
        channel: {
          select: {
            channelName: true,
            channelUrl: true,
            analytics: true,
          },
        },
        investments: {
          where: { status: 'CONFIRMED' },
          select: {
            id: true,
            shares: true,
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

    const soldShares = offering.totalShares - offering.availableShares;
    const fundingProgress = Math.round((soldShares / offering.totalShares) * 100);

    return NextResponse.json({
      success: true,
      offering: {
        ...offering,
        fundingProgress,
        investorCount: offering.investments.length,
      },
    });
  } catch (error) {
    console.error('Offering fetch error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch offering' },
      { status: 500 }
    );
  }
}
