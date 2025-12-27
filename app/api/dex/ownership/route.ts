/**
 * DEX Ownership API
 * 
 * Endpoints for viewing ownership percentages and share distribution.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { dexEscrowService } from '@/lib/services/dex-escrow';

// GET - Get ownership snapshot for an offering
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const searchParams = req.nextUrl.searchParams;
    const offeringId = searchParams.get('offeringId');

    if (!offeringId) {
      return NextResponse.json(
        { success: false, error: 'offeringId is required' },
        { status: 400 }
      );
    }

    const offering = await prisma.offering.findUnique({
      where: { id: offeringId },
      include: {
        channel: true,
        investments: {
          where: { status: 'CONFIRMED' },
          include: {
            investor: {
              select: {
                id: true,
                name: true,
                image: true,
              },
            },
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

    const ownership = await dexEscrowService.getOwnershipSnapshot(offeringId);

    // Enrich with user details
    const enrichedInvestors = ownership.investors.map((inv) => {
      const investment = offering.investments.find((i) => i.investorId === inv.userId);
      return {
        ...inv,
        name: investment?.investor.name || 'Anonymous',
        image: investment?.investor.image,
        totalInvested: investment?.totalAmount || 0,
      };
    });

    // Calculate user's position
    const userPosition = ownership.investors.find((inv) => inv.userId === session.user.id);
    const isCreator = offering.channel.ownerId === session.user.id;

    // Determine user position based on role
    let userPositionResult = null;
    if (userPosition) {
      userPositionResult = { ...userPosition, isCreator };
    } else if (isCreator) {
      userPositionResult = {
        userId: session.user.id,
        ownershipPercent: ownership.creator.ownershipPercent,
        isCreator: true,
      };
    }

    return NextResponse.json({
      success: true,
      offering: {
        id: offering.id,
        title: offering.title,
        channelName: offering.channel.channelName,
        sharePercentage: offering.sharePercentage,
        totalShares: offering.totalShares,
        soldShares: ownership.soldShares,
        availableShares: offering.availableShares,
        pricePerShare: offering.pricePerShare,
      },
      ownership: {
        creator: {
          ...ownership.creator,
          name: offering.channel.channelName,
          isYou: isCreator,
        },
        investors: enrichedInvestors,
        totalInvestors: ownership.investors.length,
      },
      userPosition: userPositionResult,
    });
  } catch (error) {
    console.error('Error fetching ownership:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch ownership data' },
      { status: 500 }
    );
  }
}
