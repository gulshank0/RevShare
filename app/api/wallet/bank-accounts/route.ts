import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

// Helper to hash account number
function hashAccountNumber(accountNumber: string): string {
  return crypto.createHash('sha256').update(accountNumber + process.env.ENCRYPTION_KEY).digest('hex');
}

// Helper to validate IFSC code (Indian Financial System Code)
function isValidIFSCCode(ifscCode: string): boolean {
  // IFSC code is 11 characters: first 4 are bank code (alpha), 5th is 0 (reserved), last 6 are branch code (alphanumeric)
  return /^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifscCode.toUpperCase());
}

// Helper to validate Indian bank account number
function isValidAccountNumber(accountNumber: string): boolean {
  // Indian bank account numbers are typically 9-18 digits
  return /^\d{9,18}$/.test(accountNumber);
}

// POST - Add a new bank account
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { 
        wallet: {
          include: {
            bankAccounts: true
          }
        }
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // KYC check for adding bank accounts
    if (user.kycStatus !== 'VERIFIED') {
      return NextResponse.json({ 
        error: 'KYC verification required to add bank accounts',
        code: 'KYC_REQUIRED'
      }, { status: 403 });
    }

    const { 
      accountHolderName, 
      accountType, 
      bankName, 
      routingNumber, // This is now IFSC code
      accountNumber,
      setAsDefault 
    } = await req.json();

    // Validate required fields
    if (!accountHolderName || !bankName || !routingNumber || !accountNumber) {
      return NextResponse.json({ 
        error: 'All fields are required',
        code: 'MISSING_FIELDS'
      }, { status: 400 });
    }

    // Validate IFSC code
    if (!isValidIFSCCode(routingNumber)) {
      return NextResponse.json({ 
        error: 'Invalid IFSC code. Format should be like SBIN0001234',
        code: 'INVALID_IFSC'
      }, { status: 400 });
    }

    // Validate account number
    if (!isValidAccountNumber(accountNumber)) {
      return NextResponse.json({ 
        error: 'Invalid account number. Should be 9-18 digits',
        code: 'INVALID_ACCOUNT'
      }, { status: 400 });
    }

    // Get or create wallet
    let wallet = user.wallet;
    if (!wallet) {
      wallet = await prisma.wallet.create({
        data: {
          userId: user.id,
          balance: 0,
          pendingBalance: 0,
          lockedBalance: 0,
          totalDeposited: 0,
          totalInvested: 0,
          totalWithdrawn: 0,
          totalEarnings: 0,
        },
        include: { bankAccounts: true }
      });
    }

    // Check for duplicate account
    const accountHash = hashAccountNumber(accountNumber);
    const existingAccount = await prisma.bankAccount.findFirst({
      where: {
        walletId: wallet.id,
        accountNumberHash: accountHash,
        routingNumber,
      }
    });

    if (existingAccount) {
      return NextResponse.json({ 
        error: 'This bank account is already linked',
        code: 'DUPLICATE_ACCOUNT'
      }, { status: 400 });
    }

    // Limit bank accounts per user
    if (wallet.bankAccounts && wallet.bankAccounts.length >= 5) {
      return NextResponse.json({ 
        error: 'Maximum of 5 bank accounts allowed',
        code: 'MAX_ACCOUNTS'
      }, { status: 400 });
    }

    // Create bank account
    const isFirstAccount = !wallet.bankAccounts || wallet.bankAccounts.length === 0;
    
    const result = await prisma.$transaction(async (tx) => {
      // If setting as default or first account, unset other defaults
      if (setAsDefault || isFirstAccount) {
        await tx.bankAccount.updateMany({
          where: { walletId: wallet!.id },
          data: { isDefault: false }
        });
      }

      const bankAccount = await tx.bankAccount.create({
        data: {
          walletId: wallet!.id,
          userId: user.id,
          accountHolderName: accountHolderName.trim(),
          accountType: accountType || 'CHECKING',
          bankName: bankName.trim(),
          routingNumber,
          accountNumberLast4: accountNumber.slice(-4),
          accountNumberHash: accountHash,
          isDefault: setAsDefault || isFirstAccount,
          isVerified: false,
          status: 'PENDING',
        }
      });

      return bankAccount;
    });

    // In production, initiate micro-deposit verification via Stripe/Plaid
    // For now, we'll auto-verify for development
    if (process.env.NODE_ENV === 'development') {
      await prisma.bankAccount.update({
        where: { id: result.id },
        data: { 
          isVerified: true, 
          status: 'VERIFIED',
          verifiedAt: new Date()
        }
      });
    }

    return NextResponse.json({
      success: true,
      bankAccount: {
        id: result.id,
        accountHolderName: result.accountHolderName,
        accountType: result.accountType,
        bankName: result.bankName,
        accountNumberLast4: result.accountNumberLast4,
        isDefault: result.isDefault,
        isVerified: process.env.NODE_ENV === 'development' ? true : result.isVerified,
        status: process.env.NODE_ENV === 'development' ? 'VERIFIED' : result.status,
      }
    });
  } catch (error) {
    console.error('Error adding bank account:', error);
    return NextResponse.json({ error: 'Failed to add bank account' }, { status: 500 });
  }
}

// GET - List bank accounts
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        wallet: {
          include: {
            bankAccounts: {
              orderBy: [
                { isDefault: 'desc' },
                { createdAt: 'desc' }
              ]
            }
          }
        }
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const bankAccounts = user.wallet?.bankAccounts?.map(account => ({
      id: account.id,
      accountHolderName: account.accountHolderName,
      accountType: account.accountType,
      bankName: account.bankName,
      accountNumberLast4: account.accountNumberLast4,
      isDefault: account.isDefault,
      isVerified: account.isVerified,
      status: account.status,
      createdAt: account.createdAt,
    })) || [];

    return NextResponse.json({
      success: true,
      bankAccounts
    });
  } catch (error) {
    console.error('Error fetching bank accounts:', error);
    return NextResponse.json({ error: 'Failed to fetch bank accounts' }, { status: 500 });
  }
}

// PATCH - Update bank account (set default)
export async function PATCH(req: NextRequest) {
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

    const { bankAccountId, setAsDefault } = await req.json();

    if (!bankAccountId) {
      return NextResponse.json({ error: 'Bank account ID is required' }, { status: 400 });
    }

    const bankAccount = await prisma.bankAccount.findUnique({
      where: { id: bankAccountId }
    });

    if (!bankAccount || bankAccount.walletId !== user.wallet.id) {
      return NextResponse.json({ error: 'Bank account not found' }, { status: 404 });
    }

    if (setAsDefault) {
      await prisma.$transaction(async (tx) => {
        // Unset all other defaults
        await tx.bankAccount.updateMany({
          where: { walletId: user.wallet!.id },
          data: { isDefault: false }
        });

        // Set new default
        await tx.bankAccount.update({
          where: { id: bankAccountId },
          data: { isDefault: true }
        });
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Bank account updated'
    });
  } catch (error) {
    console.error('Error updating bank account:', error);
    return NextResponse.json({ error: 'Failed to update bank account' }, { status: 500 });
  }
}

// DELETE - Remove bank account
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
    const bankAccountId = searchParams.get('id');

    if (!bankAccountId) {
      return NextResponse.json({ error: 'Bank account ID is required' }, { status: 400 });
    }

    const bankAccount = await prisma.bankAccount.findUnique({
      where: { id: bankAccountId },
      include: {
        withdrawals: {
          where: { status: { in: ['PENDING', 'PROCESSING'] } }
        }
      }
    });

    if (!bankAccount || bankAccount.walletId !== user.wallet.id) {
      return NextResponse.json({ error: 'Bank account not found' }, { status: 404 });
    }

    // Check for pending withdrawals
    if (bankAccount.withdrawals.length > 0) {
      return NextResponse.json({ 
        error: 'Cannot delete account with pending withdrawals',
        code: 'PENDING_WITHDRAWALS'
      }, { status: 400 });
    }

    await prisma.bankAccount.delete({
      where: { id: bankAccountId }
    });

    // If deleted account was default, set another as default
    if (bankAccount.isDefault) {
      const nextAccount = await prisma.bankAccount.findFirst({
        where: { walletId: user.wallet.id },
        orderBy: { createdAt: 'desc' }
      });

      if (nextAccount) {
        await prisma.bankAccount.update({
          where: { id: nextAccount.id },
          data: { isDefault: true }
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Bank account removed'
    });
  } catch (error) {
    console.error('Error deleting bank account:', error);
    return NextResponse.json({ error: 'Failed to delete bank account' }, { status: 500 });
  }
}
