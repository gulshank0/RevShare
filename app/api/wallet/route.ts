import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { PaymentService } from '@/lib/services/payment';

const paymentService = new PaymentService();

// GET - Fetch wallet balance and details
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get or create wallet
    let wallet = await prisma.wallet.findUnique({
      where: { userId: user.id },
    });

    if (!wallet) {
      wallet = await prisma.wallet.create({
        data: {
          userId: user.id,
          balance: 0,
          totalDeposited: 0,
          totalInvested: 0,
          totalWithdrawn: 0,
        },
      });
    }

    // Get recent transactions
    const transactions = await prisma.transaction.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    return NextResponse.json({
      success: true,
      wallet,
      transactions,
    });
  } catch (error) {
    console.error('Error fetching wallet:', error);
    return NextResponse.json({ error: 'Failed to fetch wallet' }, { status: 500 });
  }
}

// POST - Create deposit payment intent
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { amount } = await req.json();

    if (!amount || amount < 10) {
      return NextResponse.json({ error: 'Minimum deposit is $10' }, { status: 400 });
    }

    if (amount > 100000) {
      return NextResponse.json({ error: 'Maximum deposit is $100,000' }, { status: 400 });
    }

    const { clientSecret, paymentIntentId } = await paymentService.createWalletDepositIntent(
      amount,
      user.id
    );

    return NextResponse.json({
      success: true,
      clientSecret,
      paymentIntentId,
    });
  } catch (error) {
    console.error('Error creating deposit intent:', error);
    return NextResponse.json({ error: 'Failed to create deposit' }, { status: 500 });
  }
}
