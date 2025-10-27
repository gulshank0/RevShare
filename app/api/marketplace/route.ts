import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const minInvestment = searchParams.get('minInvestment');
    const sortBy = searchParams.get('sortBy') || 'newest';

    // Build where clause
    const where: any = {
      status: 'ACTIVE',
      availableShares: { gt: 0 },
    };

    if (minInvestment) {
      where.minInvestment = { gte: Number.parseFloat(minInvestment) };
    }

    // Determine sort order
    let orderBy: any;
    if (sortBy === 'newest') {
      orderBy = { createdAt: 'desc' };
    } else if (sortBy === 'funding') {
      orderBy = { availableShares: 'asc' };
    } else {
      orderBy = { pricePerShare: 'desc' };
    }

    // Fetch active offerings with channel data
    const offerings = await prisma.offering.findMany({
      where,
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
      orderBy,
    });

    // Calculate funding progress and investor count
    const enrichedOfferings = offerings.map((offering) => {
      const soldShares = offering.totalShares - offering.availableShares;
      const fundingProgress = Math.round((soldShares / offering.totalShares) * 100);
      const investorCount = offering.investments.length;

      return {
        id: offering.id,
        title: offering.title,
        description: offering.description,
        sharePercentage: offering.sharePercentage,
        totalShares: offering.totalShares,
        availableShares: offering.availableShares,
        pricePerShare: offering.pricePerShare,
        minInvestment: offering.minInvestment,
        maxInvestment: offering.maxInvestment,
        duration: offering.duration,
        fundingProgress,
        investorCount,
        channel: offering.channel,
        createdAt: offering.createdAt,
      };
    });

    return NextResponse.json({
      success: true,
      offerings: enrichedOfferings,
      total: enrichedOfferings.length,
    });
  } catch (error) {
    console.error('Marketplace fetch error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch offerings' },
      { status: 500 }
    );
  }
}