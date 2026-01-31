import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { dexEscrowService } from '@/lib/services/dex-escrow';

/**
 * Revenue Reconciliation API
 * 
 * This endpoint is called by creators to deposit YouTube revenue into the DEX escrow.
 * The escrow system automatically distributes revenue based on ownership percentages.
 * Neither creators nor investors have direct control over the distribution logic.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { channelId, revenueMonth, grossRevenue, source = 'YOUTUBE_ADSENSE', externalRef } = await request.json();

    if (!channelId || !revenueMonth || !grossRevenue) {
      return NextResponse.json(
        { success: false, error: 'channelId, revenueMonth, and grossRevenue are required' },
        { status: 400 }
      );
    }

    if (grossRevenue <= 0) {
      return NextResponse.json(
        { success: false, error: 'grossRevenue must be positive' },
        { status: 400 }
      );
    }

    // Verify channel ownership
    const channel = await prisma.channel.findFirst({
      where: {
        id: channelId,
        ownerId: session.user.id,
      },
      include: {
        offerings: {
          where: { status: 'ACTIVE' },
        },
      },
    });

    if (!channel) {
      return NextResponse.json(
        { success: false, error: 'Channel not found or you do not own it' },
        { status: 404 }
      );
    }

    if (channel.offerings.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No active offerings found for this channel' },
        { status: 400 }
      );
    }

    const distributions = [];

    // Process each offering
    for (const offering of channel.offerings) {
      // Calculate revenue allocated to this offering based on sharePercentage
      const offeringRevenue = grossRevenue * (offering.sharePercentage / 100);

      if (offeringRevenue <= 0) continue;

      try {
        // Ensure vault exists
        let vault = await prisma.escrowVault.findUnique({
          where: { offeringId: offering.id },
        });

        if (!vault) {
          await dexEscrowService.createVault(offering.id);
        }

        // Deposit revenue into escrow
        const depositId = await dexEscrowService.depositRevenue(
          offering.id,
          offeringRevenue,
          revenueMonth,
          source,
          externalRef
        );

        // Verify and distribute
        await dexEscrowService.verifyDeposit(depositId);
        const distribution = await dexEscrowService.distributeRevenue(offering.id, depositId);

        distributions.push({
          offeringId: offering.id,
          offeringTitle: offering.title,
          depositId,
          ...distribution,
        });
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`Error processing offering ${offering.id}:`, error);
        distributions.push({
          offeringId: offering.id,
          offeringTitle: offering.title,
          error: errorMessage,
        });
      }
    }

    // Create transaction record for platform tracking
    await prisma.transaction.create({
      data: {
        userId: session.user.id,
        type: 'EARNING',
        amount: grossRevenue,
        status: 'COMPLETED',
        description: `Revenue reconciliation for ${channel.channelName} (${revenueMonth})`,
        metadata: {
          channelId,
          revenueMonth,
          grossRevenue,
          distributions: distributions.map(d => ({
            offeringId: d.offeringId,
            distributed: 'distributionId' in d,
          })),
        },
        completedAt: new Date(),
      },
    });

    const successfulDistributions = distributions.filter(d => 'distributionId' in d);
    const failedDistributions = distributions.filter(d => 'error' in d);

    return NextResponse.json({
      success: true,
      distributions,
      summary: {
        grossRevenue,
        totalDistributed: successfulDistributions.reduce((sum, d) => sum + (d.totalAmount || 0), 0),
        successfulOfferings: successfulDistributions.length,
        failedOfferings: failedDistributions.length,
        revenueMonth,
      },
      message: 'Revenue deposited into escrow and distributed automatically to all stakeholders',
    });
  } catch (error) {
    console.error('Reconciliation error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to reconcile revenue' },
      { status: 500 }
    );
  }
}
