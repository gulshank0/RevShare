/**
 * DEX Audit Log API
 * 
 * Immutable audit trail for all escrow operations.
 * Provides transparency and accountability for the DEX system.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET - Get audit log for a vault
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
    const action = searchParams.get('action');
    const limit = Number.parseInt(searchParams.get('limit') || '50', 10);
    const offset = Number.parseInt(searchParams.get('offset') || '0', 10);

    if (!offeringId && !vaultId) {
      return NextResponse.json(
        { success: false, error: 'offeringId or vaultId is required' },
        { status: 400 }
      );
    }

    // Get vault
    let vault;
    if (vaultId) {
      vault = await prisma.escrowVault.findUnique({
        where: { id: vaultId },
        include: { offering: { include: { channel: true } } },
      });
    } else {
      vault = await prisma.escrowVault.findUnique({
        where: { offeringId: offeringId! },
        include: { offering: { include: { channel: true } } },
      });
    }

    if (!vault) {
      return NextResponse.json(
        { success: false, error: 'Vault not found' },
        { status: 404 }
      );
    }

    // Check access - must be creator, investor, or admin
    const isCreator = vault.offering.channel.ownerId === session.user.id;
    const hasInvestment = await prisma.investment.findFirst({
      where: {
        investorId: session.user.id,
        offeringId: vault.offeringId,
        status: 'CONFIRMED',
      },
    });
    const user = await prisma.user.findUnique({ where: { id: session.user.id } });
    const isAdmin = user?.role === 'ADMIN';

    if (!isCreator && !hasInvestment && !isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      );
    }

    // Build where clause
    const where: Record<string, unknown> = {
      vaultId: vault.id,
    };

    if (action) {
      where.action = action;
    }

    const [logs, total] = await Promise.all([
      prisma.escrowAuditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.escrowAuditLog.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      logs,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + logs.length < total,
      },
      vault: {
        id: vault.id,
        offeringId: vault.offeringId,
        channelName: vault.offering.channel.channelName,
        status: vault.status,
      },
    });
  } catch (error) {
    console.error('Error fetching audit log:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch audit log' },
      { status: 500 }
    );
  }
}
