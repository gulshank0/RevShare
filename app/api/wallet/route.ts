import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { PaymentService } from '@/lib/services/payment';

const paymentService = new PaymentService();

// GET - Fetch wallet balance and details
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
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

    // Get bank accounts
    const bankAccounts = await prisma.bankAccount.findMany({
      where: { userId: user.id },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });

    // Get pending withdrawals
    const pendingWithdrawals = await prisma.withdrawal.findMany({
      where: { 
        userId: user.id,
        status: { in: ['PENDING', 'PROCESSING'] }
      },
      include: { bankAccount: true },
      orderBy: { requestedAt: 'desc' },
    });

    // Get wallet ledger entries for detailed history
    const ledgerEntries = await prisma.walletLedger.findMany({
      where: { walletId: wallet.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return NextResponse.json({
      success: true,
      wallet,
      transactions,
      bankAccounts,
      pendingWithdrawals,
      ledgerEntries,
    });
  } catch (error) {
    console.error('Error fetching wallet:', error);
    return NextResponse.json({ error: 'Failed to fetch wallet' }, { status: 500 });
  }
}

// POST - Create deposit payment intent
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
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

    if (!amount || amount < 55) {
      return NextResponse.json({ error: 'Minimum deposit is ₹55' }, { status: 400 });
    }

    if (amount > 10000000) {
      return NextResponse.json({ error: 'Maximum deposit is ₹1,00,00,000' }, { status: 400 });
    }

    // Ensure wallet exists
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
