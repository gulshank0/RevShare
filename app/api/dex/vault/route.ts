/**
 * DEX Escrow Vault API
 * 
 * Endpoints for managing escrow vaults for revenue sharing.
 * Vaults are automatically created when an offering becomes active.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { dexEscrowService } from '@/lib/services/dex-escrow';

// GET - Get vault details for an offering
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

    if (!offeringId) {
      return NextResponse.json(
        { success: false, error: 'offeringId is required' },
        { status: 400 }
      );
    }

    const vaultDetails = await dexEscrowService.getVaultDetails(offeringId);

    if (!vaultDetails) {
      return NextResponse.json(
        { success: false, error: 'Vault not found' },
        { status: 404 }
      );
    }

    // Check if user has access to this vault (creator or investor)
    const offering = await prisma.offering.findUnique({
      where: { id: offeringId },
      include: {
        channel: true,
        investments: {
          where: { investorId: session.user.id, status: 'CONFIRMED' },
        },
      },
    });

    const isCreator = offering?.channel.ownerId === session.user.id;
    const isInvestor = offering?.investments && offering.investments.length > 0;
    const isAdmin = (await prisma.user.findUnique({ where: { id: session.user.id } }))?.role === 'ADMIN';

    if (!isCreator && !isInvestor && !isAdmin) {
      return NextResponse.json(
        { success: false, error: 'You do not have access to this vault' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      ...vaultDetails,
      access: {
        isCreator,
        isInvestor,
        isAdmin,
      },
    });
  } catch (error) {
    console.error('Error fetching vault:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch vault details' },
      { status: 500 }
    );
  }
}

// POST - Create vault for an offering (creator only or system)
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { offeringId } = await req.json();

    if (!offeringId) {
      return NextResponse.json(
        { success: false, error: 'offeringId is required' },
        { status: 400 }
      );
    }

    // Verify ownership or admin
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

    const user = await prisma.user.findUnique({ where: { id: session.user.id } });
    const isCreator = offering.channel.ownerId === session.user.id;
    const isAdmin = user?.role === 'ADMIN';

    if (!isCreator && !isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Only the channel owner can create a vault' },
        { status: 403 }
      );
    }

    if (offering.status !== 'ACTIVE') {
      return NextResponse.json(
        { success: false, error: 'Offering must be active to create a vault' },
        { status: 400 }
      );
    }

    const vaultId = await dexEscrowService.createVault(offeringId);

    return NextResponse.json({
      success: true,
      vaultId,
      message: 'Escrow vault created successfully',
    });
  } catch (error) {
    console.error('Error creating vault:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create vault' },
      { status: 500 }
    );
  }
}
