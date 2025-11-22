import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { PaymentService } from '@/lib/services/payment';

const paymentService = new PaymentService();

// POST - Invest from wallet balance
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

    const { offeringId, shares } = await req.json();

    if (!offeringId || !shares || shares < 1) {
      return NextResponse.json({ error: 'Invalid investment parameters' }, { status: 400 });
    }

    const investment = await paymentService.createInvestmentFromWallet(
      user.id,
      offeringId,
      shares
    );

    return NextResponse.json({
      success: true,
      investment,
    });
  } catch (error: any) {
    console.error('Error creating investment from wallet:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create investment' },
      { status: 500 }
    );
  }
}
