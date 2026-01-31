/**
 * DEX Distribution API
 * 
 * Endpoints for managing revenue distributions.
 * Distributions are automatic but can be triggered manually.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { dexEscrowService } from '@/lib/services/dex-escrow';

// GET - Get distribution history
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

    const vault = await prisma.escrowVault.findUnique({
      where: { offeringId },
      include: {
        distributions: {
          orderBy: { createdAt: 'desc' },
          include: {
            claims: {
              select: {
                id: true,
                userId: true,
                claimantType: true,
                amount: true,
                ownershipPercent: true,
                status: true,
              },
            },
          },
        },
        offering: {
          include: { channel: true },
        },
      },
    });

    if (!vault) {
      return NextResponse.json(
        { success: false, error: 'Vault not found' },
        { status: 404 }
      );
    }

    // Verify access
    const isCreator = vault.offering.channel.ownerId === session.user.id;
    const hasInvestment = await prisma.investment.findFirst({
      where: {
        investorId: session.user.id,
        offeringId,
        status: 'CONFIRMED',
      },
    });

    if (!isCreator && !hasInvestment) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      );
    }

    // Calculate user's specific distributions
    const userDistributions = vault.distributions.map((dist) => {
      const userClaim = dist.claims.find((c) => c.userId === session.user.id);
      return {
        ...dist,
        userClaim,
        claims: isCreator ? dist.claims : undefined, // Only show all claims to creator
      };
    });

    return NextResponse.json({
      success: true,
      distributions: userDistributions,
      summary: {
        totalDistributed: vault.totalDistributed,
        distributionCount: vault.distributions.length,
        lastDistributionAt: vault.lastDistributionAt,
      },
    });
  } catch (error) {
    console.error('Error fetching distributions:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch distributions' },
      { status: 500 }
    );
  }
}

// POST - Trigger manual distribution (admin/creator only)
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { offeringId, depositId } = await req.json();

    if (!offeringId) {
      return NextResponse.json(
        { success: false, error: 'offeringId is required' },
        { status: 400 }
      );
    }

    // Verify ownership or admin
    const offering = await prisma.offering.findUnique({
      where: { id: offeringId },
      include: { channel: true },
    });

    if (!offering) {
      return NextResponse.json(
        { success: false, error: 'Offering not found' },
        { status: 404 }
      );
    }

    const user = await prisma.user.findUnique({ where: { id: session.user.id } });
    const isCreator = offering.channel.ownerId === session.user.id;
    const isAdmin = user?.role === 'ADMIN';

    if (!isCreator && !isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Only the channel owner or admin can trigger distribution' },
        { status: 403 }
      );
    }

    const distribution = await dexEscrowService.distributeRevenue(offeringId, depositId);

    return NextResponse.json({
      success: true,
      distribution,
      message: 'Distribution completed successfully',
    });
  } catch (error: any) {
    console.error('Error triggering distribution:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to trigger distribution' },
      { status: 500 }
    );
  }
}
