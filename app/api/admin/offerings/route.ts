/**
 * Admin Offerings API
 * 
 * Endpoints for admin to manage offerings.
 * When an offering is approved, an escrow vault is automatically created.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { dexEscrowService } from '@/lib/services/dex-escrow';

// GET - List all offerings for admin review
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (user?.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      );
    }

    const searchParams = req.nextUrl.searchParams;
    const status = searchParams.get('status');

    const where: Record<string, unknown> = {};
    if (status) {
      where.status = status;
    }

    const offerings = await prisma.offering.findMany({
      where,
      include: {
        channel: {
          include: {
            owner: {
              select: {
                id: true,
                name: true,
                email: true,
                kycStatus: true,
              },
            },
          },
        },
        investments: {
          where: { status: 'CONFIRMED' },
        },
        escrowVault: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      offerings,
    });
  } catch (error) {
    console.error('Error fetching offerings:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch offerings' },
      { status: 500 }
    );
  }
}

// PUT - Approve or reject an offering
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (user?.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      );
    }

    const { offeringId, action, reason } = await req.json();

    if (!offeringId || !action) {
      return NextResponse.json(
        { success: false, error: 'offeringId and action are required' },
        { status: 400 }
      );
    }

    if (!['approve', 'reject', 'suspend'].includes(action)) {
      return NextResponse.json(
        { success: false, error: 'Invalid action. Use approve, reject, or suspend' },
        { status: 400 }
      );
    }

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

    let newStatus: string;
    let vaultId: string | null = null;

    switch (action) {
      case 'approve':
        newStatus = 'ACTIVE';
        break;
      case 'reject':
        newStatus = 'CLOSED';
        break;
      case 'suspend':
        newStatus = 'SUSPENDED';
        break;
      default:
        newStatus = offering.status;
    }

    // Update offering status
    const updatedOffering = await prisma.offering.update({
      where: { id: offeringId },
      data: { status: newStatus as 'ACTIVE' | 'CLOSED' | 'SUSPENDED' },
    });

    // If approving, create escrow vault
    if (action === 'approve') {
      try {
        vaultId = await dexEscrowService.createVault(offeringId);
      } catch (error) {
        console.error('Error creating vault:', error);
        // Continue even if vault creation fails - can be created later
      }
    }

    return NextResponse.json({
      success: true,
      offering: updatedOffering,
      vaultId,
      message: `Offering ${action}d successfully`,
    });
  } catch (error) {
    console.error('Error updating offering:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update offering' },
      { status: 500 }
    );
  }
}
