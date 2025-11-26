import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { headers } from 'next/headers';

// Withdrawal processing fee
const WITHDRAWAL_FEE_PERCENT = 1.5;
const MIN_WITHDRAWAL = 50;
const MAX_WITHDRAWAL = 5000000;

// POST - Request a withdrawal
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const headersList = headers();
    const ipAddress = headersList.get('x-forwarded-for') || headersList.get('x-real-ip') || 'unknown';
    const userAgent = headersList.get('user-agent') || 'unknown';

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        wallet: {
          include: {
            bankAccounts: {
              where: { isVerified: true, status: 'VERIFIED' }
            }
          }
        }
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check KYC status
    if (user.kycStatus !== 'VERIFIED') {
      return NextResponse.json({ 
        error: 'KYC verification required for withdrawals',
        code: 'KYC_REQUIRED'
      }, { status: 403 });
    }

    const { amount, bankAccountId } = await req.json();

    // Validate amount
    if (!amount || typeof amount !== 'number') {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
    }

    if (amount < MIN_WITHDRAWAL) {
      return NextResponse.json({ 
        error: `Minimum withdrawal is ₹${MIN_WITHDRAWAL.toLocaleString('en-IN')}`,
        code: 'MIN_AMOUNT'
      }, { status: 400 });
    }

    if (amount > MAX_WITHDRAWAL) {
      return NextResponse.json({ 
        error: `Maximum withdrawal is ₹${MAX_WITHDRAWAL.toLocaleString('en-IN')}`,
        code: 'MAX_AMOUNT'
      }, { status: 400 });
    }

    // Check wallet exists and has sufficient balance
    if (!user.wallet) {
      return NextResponse.json({ error: 'Wallet not found' }, { status: 404 });
    }

    const availableBalance = user.wallet.balance - user.wallet.lockedBalance;
    if (availableBalance < amount) {
      return NextResponse.json({ 
        error: 'Insufficient available balance',
        code: 'INSUFFICIENT_BALANCE',
        available: availableBalance
      }, { status: 400 });
    }

    // Validate bank account
    if (!bankAccountId) {
      return NextResponse.json({ 
        error: 'Bank account is required',
        code: 'BANK_REQUIRED'
      }, { status: 400 });
    }

    const bankAccount = user.wallet.bankAccounts.find(ba => ba.id === bankAccountId);
    if (!bankAccount) {
      return NextResponse.json({ 
        error: 'Invalid or unverified bank account',
        code: 'INVALID_BANK'
      }, { status: 400 });
    }

    // Calculate fee
    const fee = Math.round(amount * WITHDRAWAL_FEE_PERCENT) / 100;
    const netAmount = amount - fee;

    // Check for pending withdrawals (prevent duplicate requests)
    const pendingWithdrawal = await prisma.withdrawal.findFirst({
      where: {
        userId: user.id,
        status: { in: ['PENDING', 'PROCESSING'] }
      }
    });

    if (pendingWithdrawal) {
      return NextResponse.json({ 
        error: 'You have a pending withdrawal. Please wait for it to complete.',
        code: 'PENDING_WITHDRAWAL'
      }, { status: 400 });
    }

    // Create withdrawal with transaction
    const result = await prisma.$transaction(async (tx) => {
      // Lock the funds
      const updatedWallet = await tx.wallet.update({
        where: { id: user.wallet!.id },
        data: {
          balance: { decrement: amount },
          lockedBalance: { increment: amount },
          lastActivityAt: new Date()
        }
      });

      // Create withdrawal record
      const withdrawal = await tx.withdrawal.create({
        data: {
          userId: user.id,
          bankAccountId,
          amount,
          fee,
          netAmount,
          status: 'PENDING'
        }
      });

      // Create transaction record
      const transaction = await tx.transaction.create({
        data: {
          userId: user.id,
          type: 'WITHDRAWAL',
          amount,
          fee,
          netAmount,
          status: 'PENDING',
          referenceType: 'withdrawal',
          referenceId: withdrawal.id,
          description: `Withdrawal to ${bankAccount.bankName} ****${bankAccount.accountNumberLast4}`,
          ipAddress,
          userAgent,
          metadata: {
            bankAccountId,
            bankName: bankAccount.bankName,
            accountLast4: bankAccount.accountNumberLast4
          }
        }
      });

      // Create ledger entry for lock
      await tx.walletLedger.create({
        data: {
          walletId: user.wallet!.id,
          transactionId: transaction.id,
          entryType: 'LOCK',
          debit: amount,
          credit: 0,
          balance: updatedWallet.balance,
          description: `Funds locked for withdrawal #${withdrawal.id.slice(-8)}`,
          referenceType: 'withdrawal',
          referenceId: withdrawal.id
        }
      });

      return { withdrawal, transaction, wallet: updatedWallet };
    });

    return NextResponse.json({
      success: true,
      withdrawal: {
        id: result.withdrawal.id,
        amount: result.withdrawal.amount,
        fee: result.withdrawal.fee,
        netAmount: result.withdrawal.netAmount,
        status: result.withdrawal.status,
        requestedAt: result.withdrawal.requestedAt
      },
      wallet: {
        balance: result.wallet.balance,
        lockedBalance: result.wallet.lockedBalance,
        availableBalance: result.wallet.balance - result.wallet.lockedBalance
      }
    });
  } catch (error) {
    console.error('Error creating withdrawal:', error);
    return NextResponse.json({ error: 'Failed to create withdrawal' }, { status: 500 });
  }
}

// GET - Get withdrawal history
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');
    const status = searchParams.get('status');

    const where: any = { userId: user.id };
    if (status) {
      where.status = status;
    }

    const [withdrawals, total] = await Promise.all([
      prisma.withdrawal.findMany({
        where,
        include: {
          bankAccount: {
            select: {
              bankName: true,
              accountNumberLast4: true,
              accountType: true
            }
          }
        },
        orderBy: { requestedAt: 'desc' },
        take: limit,
        skip: offset
      }),
      prisma.withdrawal.count({ where })
    ]);

    return NextResponse.json({
      success: true,
      withdrawals,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + withdrawals.length < total
      }
    });
  } catch (error) {
    console.error('Error fetching withdrawals:', error);
    return NextResponse.json({ error: 'Failed to fetch withdrawals' }, { status: 500 });
  }
}

// DELETE - Cancel a pending withdrawal
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { wallet: true }
    });

    if (!user || !user.wallet) {
      return NextResponse.json({ error: 'User or wallet not found' }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const withdrawalId = searchParams.get('id');

    if (!withdrawalId) {
      return NextResponse.json({ error: 'Withdrawal ID is required' }, { status: 400 });
    }

    const withdrawal = await prisma.withdrawal.findUnique({
      where: { id: withdrawalId }
    });

    if (!withdrawal) {
      return NextResponse.json({ error: 'Withdrawal not found' }, { status: 404 });
    }

    if (withdrawal.userId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    if (withdrawal.status !== 'PENDING') {
      return NextResponse.json({ 
        error: 'Only pending withdrawals can be cancelled',
        code: 'INVALID_STATUS'
      }, { status: 400 });
    }

    // Cancel withdrawal and unlock funds
    const result = await prisma.$transaction(async (tx) => {
      // Update withdrawal status
      const updatedWithdrawal = await tx.withdrawal.update({
        where: { id: withdrawalId },
        data: { status: 'CANCELLED' }
      });

      // Unlock funds
      const updatedWallet = await tx.wallet.update({
        where: { id: user.wallet!.id },
        data: {
          balance: { increment: withdrawal.amount },
          lockedBalance: { decrement: withdrawal.amount },
          lastActivityAt: new Date()
        }
      });

      // Update transaction
      await tx.transaction.updateMany({
        where: {
          referenceType: 'withdrawal',
          referenceId: withdrawalId
        },
        data: { status: 'CANCELLED' }
      });

      // Create ledger entry for unlock
      await tx.walletLedger.create({
        data: {
          walletId: user.wallet!.id,
          entryType: 'UNLOCK',
          debit: 0,
          credit: withdrawal.amount,
          balance: updatedWallet.balance,
          description: `Funds unlocked - withdrawal cancelled #${withdrawalId.slice(-8)}`,
          referenceType: 'withdrawal',
          referenceId: withdrawalId
        }
      });

      return { withdrawal: updatedWithdrawal, wallet: updatedWallet };
    });

    return NextResponse.json({
      success: true,
      message: 'Withdrawal cancelled successfully',
      wallet: {
        balance: result.wallet.balance,
        lockedBalance: result.wallet.lockedBalance,
        availableBalance: result.wallet.balance - result.wallet.lockedBalance
      }
    });
  } catch (error) {
    console.error('Error cancelling withdrawal:', error);
    return NextResponse.json({ error: 'Failed to cancel withdrawal' }, { status: 500 });
  }
}
