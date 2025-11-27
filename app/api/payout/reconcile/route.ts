import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { PaymentService } from '@/lib/services/payment';

const paymentService = new PaymentService();

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { channelId, revenueMonth, grossRevenue } = await request.json();

    // Verify channel ownership
    const channel = await prisma.channel.findFirst({
      where: {
        id: channelId,
        ownerId: session.user.id,
      },
      include: {
        offerings: {
          where: { status: 'ACTIVE' },
          include: {
            investments: {
              where: { status: 'CONFIRMED' },
              include: {
                investor: true,
              },
            },
          },
        },
      },
    });

    if (!channel) {
      return NextResponse.json(
        { success: false, error: 'Channel not found' },
        { status: 404 }
      );
    }

    const payouts = [];
    const platformFeeRate = 0.05; // 5% platform fee

    for (const offering of channel.offerings) {
      const totalShares = offering.totalShares;
      const sharePercentage = offering.sharePercentage;
      
      // Calculate revenue allocated to this offering
      const offeringRevenue = grossRevenue * (sharePercentage / 100);
      
      // Deduct platform fee
      const netRevenue = offeringRevenue * (1 - platformFeeRate);

      for (const investment of offering.investments) {
        // Calculate investor's share
        const investorSharePercentage = investment.shares / totalShares;
        const investorPayout = netRevenue * investorSharePercentage;

        // Check if payout already exists for this period
        const existingPayout = await prisma.payout.findFirst({
          where: {
            investmentId: investment.id,
            revenueMonth,
          },
        });

        if (!existingPayout && investorPayout > 0) {
          // Create payout record
          const payout = await prisma.payout.create({
            data: {
              investmentId: investment.id,
              amount: investorPayout,
              revenueMonth,
              status: 'PENDING',
            },
          });

          payouts.push({
            payoutId: payout.id,
            investorId: investment.investorId,
            investorName: investment.investor.name,
            amount: investorPayout,
          });

          // Process payment (in production, batch these)
          try {
            await paymentService.createPayout(investment.id, investorPayout);
            
            await prisma.payout.update({
              where: { id: payout.id },
              data: {
                status: 'COMPLETED',
                paidAt: new Date(),
              },
            });
          } catch (payoutError) {
            console.error('Payout processing error:', payoutError);
            await prisma.payout.update({
              where: { id: payout.id },
              data: { status: 'FAILED' },
            });
          }
        }
      }
    }

    // Create transaction record for platform fee
    const platformFee = grossRevenue * platformFeeRate;
    await prisma.transaction.create({
      data: {
        userId: session.user.id,
        type: 'FEE',
        amount: platformFee,
        status: 'COMPLETED',
        metadata: {
          channelId,
          revenueMonth,
          grossRevenue,
        },
      },
    });

    return NextResponse.json({
      success: true,
      payouts,
      summary: {
        grossRevenue,
        platformFee,
        totalPayouts: payouts.reduce((sum, p) => sum + p.amount, 0),
        payoutCount: payouts.length,
      },
      message: 'Revenue reconciliation completed successfully',
    });
  } catch (error) {
    console.error('Reconciliation error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to reconcile revenue' },
      { status: 500 }
    );
  }
}
