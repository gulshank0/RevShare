import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Demo fund amounts available
const DEMO_FUND_AMOUNTS = [1000, 5000, 10000, 50000, 100000];
const MAX_DEMO_BALANCE = 1000000; // Maximum demo balance allowed

/**
 * POST - Add demo/test funds to wallet (for development/testing only)
 * This should be disabled or removed in production
 */
export async function POST(req: NextRequest) {
  try {
    // Check if we're in development mode
    const isDevelopment = process.env.NODE_ENV === 'development' || 
                          process.env.ENABLE_DEMO_FUNDS === 'true';

    if (!isDevelopment) {
      return NextResponse.json(
        { success: false, error: 'Demo funds are only available in development mode' },
        { status: 403 }
      );
    }

    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    const { amount } = await req.json();

    // Validate amount
    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid amount' },
        { status: 400 }
      );
    }

    if (!DEMO_FUND_AMOUNTS.includes(amount) && amount > 100000) {
      return NextResponse.json(
        { success: false, error: `Amount must be one of: ${DEMO_FUND_AMOUNTS.join(', ')} or up to ₹100,000` },
        { status: 400 }
      );
    }

    // Get or create wallet with transaction
    const result = await prisma.$transaction(async (tx) => {
      // Get or create wallet
      let wallet = await tx.wallet.findUnique({
        where: { userId: user.id },
      });

      if (!wallet) {
        wallet = await tx.wallet.create({
          data: {
            userId: user.id,
            balance: 0,
            totalDeposited: 0,
            totalInvested: 0,
            totalWithdrawn: 0,
            totalEarnings: 0,
          },
        });
      }

      // Check max balance limit
      if (wallet.balance + amount > MAX_DEMO_BALANCE) {
        throw new Error(`Demo balance cannot exceed ₹${MAX_DEMO_BALANCE.toLocaleString('en-IN')}. Current balance: ₹${wallet.balance.toLocaleString('en-IN')}`);
      }

      // Create a demo transaction record
      const transaction = await tx.transaction.create({
        data: {
          userId: user.id,
          type: 'DEPOSIT',
          amount: amount,
          fee: 0,
          netAmount: amount,
          status: 'COMPLETED',
          referenceType: 'demo_fund',
          referenceId: `demo_${Date.now()}`,
          description: `Demo funds added for testing`,
          completedAt: new Date(),
          metadata: {
            isDemoFund: true,
            environment: process.env.NODE_ENV,
          },
        },
      });

      // Update wallet balance
      const updatedWallet = await tx.wallet.update({
        where: { userId: user.id },
        data: {
          balance: { increment: amount },
          totalDeposited: { increment: amount },
          lastActivityAt: new Date(),
        },
      });

      // Create ledger entry
      await tx.walletLedger.create({
        data: {
          walletId: wallet.id,
          transactionId: transaction.id,
          entryType: 'DEPOSIT',
          debit: 0,
          credit: amount,
          balance: updatedWallet.balance,
          description: `Demo funds: +₹${amount.toLocaleString('en-IN')}`,
          referenceType: 'demo_fund',
          referenceId: transaction.id,
          metadata: {
            isDemoFund: true,
          },
        },
      });

      return {
        wallet: updatedWallet,
        transaction,
      };
    });

    return NextResponse.json({
      success: true,
      message: `Successfully added ₹${amount.toLocaleString('en-IN')} demo funds to your wallet`,
      wallet: {
        balance: result.wallet.balance,
        totalDeposited: result.wallet.totalDeposited,
      },
      transaction: {
        id: result.transaction.id,
        amount: result.transaction.amount,
        type: result.transaction.type,
      },
    });
  } catch (error) {
    console.error('Error adding demo funds:', error);
    
    if (error instanceof Error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { success: false, error: 'Failed to add demo funds' },
      { status: 500 }
    );
  }
}

/**
 * GET - Get demo fund status and available amounts
 */
export async function GET(req: NextRequest) {
  try {
    const isDevelopment = process.env.NODE_ENV === 'development' || 
                          process.env.ENABLE_DEMO_FUNDS === 'true';

    if (!isDevelopment) {
      return NextResponse.json({
        success: true,
        enabled: false,
        message: 'Demo funds are disabled in production',
      });
    }

    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        wallet: true,
      },
    });

    const currentBalance = user?.wallet?.balance || 0;
    const remainingCapacity = MAX_DEMO_BALANCE - currentBalance;

    return NextResponse.json({
      success: true,
      enabled: true,
      availableAmounts: DEMO_FUND_AMOUNTS.filter(amt => amt <= remainingCapacity),
      maxBalance: MAX_DEMO_BALANCE,
      currentBalance,
      remainingCapacity,
    });
  } catch (error) {
    console.error('Error fetching demo fund status:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch demo fund status' },
      { status: 500 }
    );
  }
}
