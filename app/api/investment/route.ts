import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { PaymentService } from '@/lib/services/payment';
import { KYCService } from '@/lib/services/kyc';

const paymentService = new PaymentService();
const kycService = new KYCService();

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { offeringId, shares } = await request.json();

    // Fetch offering details
    const offering = await prisma.offering.findUnique({
      where: { id: offeringId },
      include: {
        channel: true,
      },
    });

    if (!offering || offering.status !== 'ACTIVE') {
      return NextResponse.json(
        { success: false, error: 'Offering not available' },
        { status: 404 }
      );
    }

    // Validate shares availability
    if (shares > offering.availableShares) {
      return NextResponse.json(
        { success: false, error: 'Insufficient shares available' },
        { status: 400 }
      );
    }

    const totalAmount = shares * offering.pricePerShare;

    // Validate investment amount
    if (totalAmount < offering.minInvestment) {
      return NextResponse.json(
        {
          success: false,
          error: `Minimum investment is $${offering.minInvestment}`,
        },
        { status: 400 }
      );
    }

    if (offering.maxInvestment && totalAmount > offering.maxInvestment) {
      return NextResponse.json(
        {
          success: false,
          error: `Maximum investment is $${offering.maxInvestment}`,
        },
        { status: 400 }
      );
    }

    // Check KYC status and investment eligibility
    const eligibility = await kycService.checkInvestmentEligibility(
      session.user.id,
      totalAmount
    );

    if (!eligibility.eligible) {
      return NextResponse.json(
        { success: false, error: eligibility.reason },
        { status: 403 }
      );
    }

    // Create pending investment record first
    const investment = await prisma.investment.create({
      data: {
        investorId: session.user.id,
        offeringId,
        shares,
        totalAmount,
        status: 'PENDING',
      },
    });

    // Create payment intent with investment ID
    const payment = await paymentService.createPaymentIntent(
      totalAmount,
      session.user.id,
      offeringId,
      investment.id
    );

    // Create transaction record
    await prisma.transaction.create({
      data: {
        userId: session.user.id,
        type: 'INVESTMENT',
        amount: totalAmount,
        status: 'PENDING',
        stripeId: payment.paymentIntentId,
        metadata: {
          investmentId: investment.id,
          offeringId,
          shares,
        },
      },
    });

    return NextResponse.json({
      success: true,
      investment,
      payment,
      message: 'Investment initiated. Complete payment to confirm.',
    });
  } catch (error) {
    console.error('Investment creation error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process investment' },
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

    const searchParams = request.nextUrl.searchParams;
    const offeringId = searchParams.get('offeringId');

    const whereClause: any = { investorId: session.user.id };
    if (offeringId) {
      whereClause.offeringId = offeringId;
    }

    const investments = await prisma.investment.findMany({
      where: whereClause,
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
        payouts: {
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Calculate total invested and total returns
    const totalInvested = investments
      .filter((inv) => inv.status === 'CONFIRMED')
      .reduce((sum, inv) => sum + inv.totalAmount, 0);

    const totalReturns = investments
      .flatMap((inv) => inv.payouts)
      .filter((payout) => payout.status === 'COMPLETED')
      .reduce((sum, payout) => sum + payout.amount, 0);

    return NextResponse.json({
      success: true,
      investments,
      summary: {
        totalInvested,
        totalReturns,
        activeInvestments: investments.filter((inv) => inv.status === 'CONFIRMED')
          .length,
      },
    });
  } catch (error) {
    console.error('Investments fetch error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch investments' },
      { status: 500 }
    );
  }
}
