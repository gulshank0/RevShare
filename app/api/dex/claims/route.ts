/**
 * DEX Claims API
 * 
 * Endpoints for managing and processing revenue claims.
 * Users can claim their share of distributed revenue.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { dexEscrowService } from '@/lib/services/dex-escrow';

// GET - Get user's claims
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
    const status = searchParams.get('status'); // 'available', 'claimed', 'expired', 'all'
    const offeringId = searchParams.get('offeringId');

    // Build where clause
    const where: Record<string, unknown> = {
      userId: session.user.id,
    };

    if (status && status !== 'all') {
      where.status = status.toUpperCase();
    }

    if (offeringId) {
      where.vault = { offeringId };
    }

    const claims = await prisma.escrowClaim.findMany({
      where,
      include: {
        vault: {
          include: {
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
          },
        },
        distribution: {
          select: {
            id: true,
            totalAmount: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Calculate summary
    const summary = {
      totalAvailable: claims
        .filter((c) => c.status === 'AVAILABLE')
        .reduce((sum, c) => sum + c.amount, 0),
      totalClaimed: claims
        .filter((c) => c.status === 'CLAIMED')
        .reduce((sum, c) => sum + c.amount, 0),
      totalExpired: claims
        .filter((c) => c.status === 'EXPIRED')
        .reduce((sum, c) => sum + c.amount, 0),
      availableCount: claims.filter((c) => c.status === 'AVAILABLE').length,
    };

    return NextResponse.json({
      success: true,
      claims,
      summary,
    });
  } catch (error) {
    console.error('Error fetching claims:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch claims' },
      { status: 500 }
    );
  }
}

// POST - Process a claim (transfer to wallet)
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { claimId, claimAll = false, offeringId } = await req.json();

    if (!claimId && !claimAll) {
      return NextResponse.json(
        { success: false, error: 'claimId is required, or set claimAll to true' },
        { status: 400 }
      );
    }

    if (claimAll) {
      // Claim all available claims for user
      const where: Record<string, unknown> = {
        userId: session.user.id,
        status: 'AVAILABLE',
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } },
        ],
      };

      if (offeringId) {
        where.vault = { offeringId };
      }

      const availableClaims = await prisma.escrowClaim.findMany({ where });

      if (availableClaims.length === 0) {
        return NextResponse.json(
          { success: false, error: 'No available claims' },
          { status: 400 }
        );
      }

      const results = [];
      let totalClaimed = 0;

      for (const claim of availableClaims) {
        try {
          await dexEscrowService.processClaim(claim.id, session.user.id);
          results.push({ claimId: claim.id, success: true, amount: claim.amount });
          totalClaimed += claim.amount;
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          results.push({ claimId: claim.id, success: false, error: errorMessage });
        }
      }

      return NextResponse.json({
        success: true,
        results,
        totalClaimed,
        message: `Processed ${results.filter(r => r.success).length} claims, total ₹${totalClaimed.toLocaleString('en-IN')}`,
      });
    }

    // Process single claim
    await dexEscrowService.processClaim(claimId, session.user.id);

    const claim = await prisma.escrowClaim.findUnique({
      where: { id: claimId },
      include: {
        vault: {
          include: {
            offering: {
              include: { channel: true },
            },
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      claim,
      message: `Successfully claimed ₹${claim?.amount.toLocaleString('en-IN')} from ${claim?.vault.offering.channel.channelName}`,
    });
  } catch (error: unknown) {
    console.error('Error processing claim:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to process claim';
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
