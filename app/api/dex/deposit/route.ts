/**
 * DEX Revenue Deposit API
 * 
 * Endpoints for depositing YouTube revenue into escrow.
 * Only channel owners can deposit revenue for their offerings.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { dexEscrowService } from '@/lib/services/dex-escrow';
import { RevenueSource } from '@prisma/client';

// GET - Get deposit history for an offering
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
    const vaultId = searchParams.get('vaultId');

    if (!offeringId && !vaultId) {
      return NextResponse.json(
        { success: false, error: 'offeringId or vaultId is required' },
        { status: 400 }
      );
    }

    let vault;
    if (vaultId) {
      vault = await prisma.escrowVault.findUnique({
        where: { id: vaultId },
        include: {
          deposits: {
            orderBy: { createdAt: 'desc' },
          },
          offering: {
            include: { channel: true },
          },
        },
      });
    } else {
      vault = await prisma.escrowVault.findUnique({
        where: { offeringId: offeringId! },
        include: {
          deposits: {
            orderBy: { createdAt: 'desc' },
          },
          offering: {
            include: { channel: true },
          },
        },
      });
    }

    if (!vault) {
      return NextResponse.json(
        { success: false, error: 'Vault not found' },
        { status: 404 }
      );
    }

    // Check access
    const isCreator = vault.offering.channel.ownerId === session.user.id;
    const hasInvestment = await prisma.investment.findFirst({
      where: {
        investorId: session.user.id,
        offeringId: vault.offeringId,
        status: 'CONFIRMED',
      },
    });

    if (!isCreator && !hasInvestment) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      deposits: vault.deposits,
      summary: {
        totalDeposited: vault.deposits.reduce((sum, d) => sum + d.amount, 0),
        pendingDeposits: vault.deposits.filter(d => d.status === 'PENDING').length,
        verifiedDeposits: vault.deposits.filter(d => d.status === 'VERIFIED').length,
        distributedDeposits: vault.deposits.filter(d => d.status === 'DISTRIBUTED').length,
      },
    });
  } catch (error) {
    console.error('Error fetching deposits:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch deposits' },
      { status: 500 }
    );
  }
}

// POST - Deposit revenue into escrow
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { 
      offeringId, 
      amount, 
      revenueMonth, 
      source = 'YOUTUBE_ADSENSE',
      externalRef,
      autoDistribute = true,
    } = await req.json();

    // Validate input
    if (!offeringId || !amount || !revenueMonth) {
      return NextResponse.json(
        { success: false, error: 'offeringId, amount, and revenueMonth are required' },
        { status: 400 }
      );
    }

    if (amount <= 0) {
      return NextResponse.json(
        { success: false, error: 'Amount must be positive' },
        { status: 400 }
      );
    }

    // Validate revenue month format (YYYY-MM)
    if (!/^\d{4}-\d{2}$/.test(revenueMonth)) {
      return NextResponse.json(
        { success: false, error: 'revenueMonth must be in YYYY-MM format' },
        { status: 400 }
      );
    }

    // Verify ownership
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

    if (offering.channel.ownerId !== session.user.id) {
      const user = await prisma.user.findUnique({ where: { id: session.user.id } });
      if (user?.role !== 'ADMIN') {
        return NextResponse.json(
          { success: false, error: 'Only the channel owner can deposit revenue' },
          { status: 403 }
        );
      }
    }

    // Check if vault exists, create if not
    let vault = await prisma.escrowVault.findUnique({
      where: { offeringId },
    });

    if (!vault) {
      await dexEscrowService.createVault(offeringId);
    }

    // Deposit revenue
    const depositId = await dexEscrowService.depositRevenue(
      offeringId,
      amount,
      revenueMonth,
      source as RevenueSource,
      externalRef
    );

    // Auto-verify and distribute if requested
    if (autoDistribute) {
      await dexEscrowService.verifyDeposit(depositId);
      const distribution = await dexEscrowService.distributeRevenue(offeringId, depositId);

      return NextResponse.json({
        success: true,
        depositId,
        distribution,
        message: 'Revenue deposited and distributed successfully',
      });
    }

    return NextResponse.json({
      success: true,
      depositId,
      message: 'Revenue deposited successfully. Awaiting verification.',
    });
  } catch (error) {
    console.error('Error depositing revenue:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to deposit revenue' },
      { status: 500 }
    );
  }
}
