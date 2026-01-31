import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Platform fee percentage (e.g., 2.5%)
const PLATFORM_FEE_PERCENT = 2.5;

// GET - List trades (user's trade history or market trades for an offering)
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const searchParams = req.nextUrl.searchParams;
    const role = searchParams.get('role'); // 'buyer' | 'seller' | 'all'
    const status = searchParams.get('status');
    const offeringId = searchParams.get('offeringId');
    const market = searchParams.get('market'); // 'true' to get all trades for an offering (public market data)

    // Build where clause
    const where: any = {};

    // If requesting market data for an offering, return all trades for that offering (public data)
    if (market === 'true' && offeringId) {
      where.offeringId = offeringId;
      where.status = 'COMPLETED';

      const trades = await prisma.trade.findMany({
        where,
        select: {
          id: true,
          shares: true,
          pricePerShare: true,
          totalAmount: true,
          status: true,
          createdAt: true,
          buyerId: true,
          sellerId: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 50, // Limit to recent 50 trades for market view
      });

      return NextResponse.json({
        success: true,
        trades,
      });
    }

    // For user-specific trade history, require authentication
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (role === 'buyer') {
      where.buyerId = session.user.id;
    } else if (role === 'seller') {
      where.sellerId = session.user.id;
    } else {
      // All trades involving user
      where.OR = [
        { buyerId: session.user.id },
        { sellerId: session.user.id },
      ];
    }

    if (status) {
      where.status = status;
    }

    if (offeringId) {
      where.offeringId = offeringId;
    }

    const trades = await prisma.trade.findMany({
      where,
      include: {
        sellOrder: {
          select: {
            id: true,
            pricePerShare: true,
          },
        },
        buyer: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
        seller: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
        offering: {
          include: {
            channel: {
              select: {
                channelName: true,
                channelUrl: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Calculate summary
    const buyTrades = trades.filter((t) => t.buyerId === session.user.id);
    const sellTrades = trades.filter((t) => t.sellerId === session.user.id);

    const summary = {
      totalBought: buyTrades.reduce((sum, t) => sum + t.totalAmount, 0),
      totalSold: sellTrades.reduce((sum, t) => sum + t.netAmount, 0),
      totalBuyTrades: buyTrades.length,
      totalSellTrades: sellTrades.length,
      sharesBought: buyTrades.reduce((sum, t) => sum + t.shares, 0),
      sharesSold: sellTrades.reduce((sum, t) => sum + t.shares, 0),
    };

    return NextResponse.json({
      success: true,
      trades,
      summary,
    });
  } catch (error) {
    console.error('Error fetching trades:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch trades' },
      { status: 500 }
    );
  }
}

// POST - Execute a trade (buy from a sell order)
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { sellOrderId, shares } = await req.json();

    if (!sellOrderId || !shares || shares < 1) {
      return NextResponse.json(
        { success: false, error: 'Invalid parameters. Provide sellOrderId and shares.' },
        { status: 400 }
      );
    }

    // Fetch the sell order with related data
    const sellOrder = await prisma.sellOrder.findUnique({
      where: { id: sellOrderId },
      include: {
        offering: {
          include: {
            channel: true,
          },
        },
        seller: true,
        investment: true,
      },
    });

    if (!sellOrder) {
      return NextResponse.json(
        { success: false, error: 'Sell order not found' },
        { status: 404 }
      );
    }

    // Validate sell order status
    if (sellOrder.status !== 'ACTIVE' && sellOrder.status !== 'PARTIALLY_FILLED') {
      return NextResponse.json(
        { success: false, error: 'This sell order is no longer available' },
        { status: 400 }
      );
    }

    // Check expiration
    if (sellOrder.expiresAt && new Date(sellOrder.expiresAt) < new Date()) {
      // Update status to expired
      await prisma.sellOrder.update({
        where: { id: sellOrderId },
        data: { status: 'EXPIRED' },
      });
      return NextResponse.json(
        { success: false, error: 'This sell order has expired' },
        { status: 400 }
      );
    }

    // Prevent self-trading
    if (sellOrder.sellerId === session.user.id) {
      return NextResponse.json(
        { success: false, error: 'You cannot buy your own shares' },
        { status: 400 }
      );
    }

    // Check minimum shares
    if (shares < sellOrder.minShares) {
      return NextResponse.json(
        { success: false, error: `Minimum purchase is ${sellOrder.minShares} shares` },
        { status: 400 }
      );
    }

    // Check available shares
    if (shares > sellOrder.sharesRemaining) {
      return NextResponse.json(
        { success: false, error: `Only ${sellOrder.sharesRemaining} shares available` },
        { status: 400 }
      );
    }

    // Calculate amounts
    const totalAmount = shares * sellOrder.pricePerShare;
    const platformFee = totalAmount * (PLATFORM_FEE_PERCENT / 100);
    const netAmount = totalAmount - platformFee;

    // Check buyer's wallet balance
    const buyerWallet = await prisma.wallet.findUnique({
      where: { userId: session.user.id },
    });

    if (!buyerWallet || buyerWallet.balance < totalAmount) {
      return NextResponse.json(
        {
          success: false,
          error: `Insufficient wallet balance. Required: ₹${totalAmount.toLocaleString('en-IN')}, Available: ₹${(buyerWallet?.balance || 0).toLocaleString('en-IN')}`,
        },
        { status: 400 }
      );
    }

    // Execute trade in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create trade record
      const trade = await tx.trade.create({
        data: {
          sellOrderId,
          buyerId: session.user.id,
          sellerId: sellOrder.sellerId,
          offeringId: sellOrder.offeringId,
          shares,
          pricePerShare: sellOrder.pricePerShare,
          totalAmount,
          platformFee,
          netAmount,
          status: 'COMPLETED',
          completedAt: new Date(),
        },
      });

      // 2. Update sell order
      const newSharesRemaining = sellOrder.sharesRemaining - shares;
      const newStatus = newSharesRemaining === 0 ? 'FILLED' : 'PARTIALLY_FILLED';
      
      await tx.sellOrder.update({
        where: { id: sellOrderId },
        data: {
          sharesRemaining: newSharesRemaining,
          status: newStatus,
        },
      });

      // 3. Update seller's investment (reduce shares)
      await tx.investment.update({
        where: { id: sellOrder.investmentId },
        data: {
          shares: { decrement: shares },
        },
      });

      // 4. Create or update buyer's investment
      const existingBuyerInvestment = await tx.investment.findFirst({
        where: {
          investorId: session.user.id,
          offeringId: sellOrder.offeringId,
          status: 'CONFIRMED',
        },
      });

      let buyerInvestment;
      if (existingBuyerInvestment) {
        // Update existing investment
        buyerInvestment = await tx.investment.update({
          where: { id: existingBuyerInvestment.id },
          data: {
            shares: { increment: shares },
            totalAmount: { increment: totalAmount },
          },
        });
      } else {
        // Create new investment for buyer
        buyerInvestment = await tx.investment.create({
          data: {
            investorId: session.user.id,
            offeringId: sellOrder.offeringId,
            shares,
            totalAmount,
            status: 'CONFIRMED',
          },
        });
      }

      // Update trade with buyer investment ID
      await tx.trade.update({
        where: { id: trade.id },
        data: { buyerInvestmentId: buyerInvestment.id },
      });

      // 5. Deduct from buyer's wallet
      const updatedBuyerWallet = await tx.wallet.update({
        where: { userId: session.user.id },
        data: {
          balance: { decrement: totalAmount },
          totalInvested: { increment: totalAmount },
          lastActivityAt: new Date(),
        },
      });

      // 6. Add to seller's wallet (net amount after fees)
      const sellerWallet = await tx.wallet.findUnique({
        where: { userId: sellOrder.sellerId },
      });

      if (!sellerWallet) {
        throw new Error('Seller wallet not found');
      }

      const updatedSellerWallet = await tx.wallet.update({
        where: { userId: sellOrder.sellerId },
        data: {
          balance: { increment: netAmount },
          totalEarnings: { increment: netAmount },
          lastActivityAt: new Date(),
        },
      });

      // 7. Create transaction records
      // Buyer transaction
      const buyerTransaction = await tx.transaction.create({
        data: {
          userId: session.user.id,
          type: 'INVESTMENT',
          amount: totalAmount,
          fee: 0,
          netAmount: totalAmount,
          status: 'COMPLETED',
          referenceType: 'trade',
          referenceId: trade.id,
          description: `Bought ${shares} shares of ${sellOrder.offering.channel.channelName} at ₹${sellOrder.pricePerShare}/share`,
          completedAt: new Date(),
          metadata: {
            tradeId: trade.id,
            sellOrderId,
            shares,
            pricePerShare: sellOrder.pricePerShare,
            channelName: sellOrder.offering.channel.channelName,
          },
        },
      });

      // Seller transaction  
      const sellerTransaction = await tx.transaction.create({
        data: {
          userId: sellOrder.sellerId,
          type: 'EARNING',
          amount: totalAmount,
          fee: platformFee,
          netAmount,
          status: 'COMPLETED',
          referenceType: 'trade',
          referenceId: trade.id,
          description: `Sold ${shares} shares of ${sellOrder.offering.channel.channelName} at ₹${sellOrder.pricePerShare}/share`,
          completedAt: new Date(),
          metadata: {
            tradeId: trade.id,
            sellOrderId,
            shares,
            pricePerShare: sellOrder.pricePerShare,
            channelName: sellOrder.offering.channel.channelName,
          },
        },
      });

      // 8. Create ledger entries
      // Buyer ledger
      await tx.walletLedger.create({
        data: {
          walletId: buyerWallet.id,
          transactionId: buyerTransaction.id,
          entryType: 'TRADE_BUY',
          debit: totalAmount,
          credit: 0,
          balance: updatedBuyerWallet.balance,
          description: `Trade: Bought ${shares} shares of ${sellOrder.offering.channel.channelName}`,
          referenceType: 'trade',
          referenceId: trade.id,
          metadata: {
            shares,
            pricePerShare: sellOrder.pricePerShare,
          },
        },
      });

      // Seller ledger
      await tx.walletLedger.create({
        data: {
          walletId: sellerWallet.id,
          transactionId: sellerTransaction.id,
          entryType: 'TRADE_SELL',
          debit: 0,
          credit: netAmount,
          balance: updatedSellerWallet.balance,
          description: `Trade: Sold ${shares} shares of ${sellOrder.offering.channel.channelName}`,
          referenceType: 'trade',
          referenceId: trade.id,
          metadata: {
            shares,
            pricePerShare: sellOrder.pricePerShare,
            platformFee,
          },
        },
      });

      // Fee ledger entry for seller
      if (platformFee > 0) {
        await tx.walletLedger.create({
          data: {
            walletId: sellerWallet.id,
            entryType: 'FEE_CHARGED',
            debit: platformFee,
            credit: 0,
            balance: updatedSellerWallet.balance,
            description: `Platform fee (${PLATFORM_FEE_PERCENT}%) for trade`,
            referenceType: 'trade',
            referenceId: trade.id,
          },
        });
      }

      return {
        trade,
        buyerInvestment,
        buyerWallet: updatedBuyerWallet,
        sellerWallet: updatedSellerWallet,
      };
    });

    return NextResponse.json({
      success: true,
      trade: result.trade,
      investment: result.buyerInvestment,
      wallet: {
        balance: result.buyerWallet.balance,
      },
      message: `Successfully bought ${shares} shares for ₹${totalAmount.toLocaleString('en-IN')}`,
    });
  } catch (error) {
    console.error('Error executing trade:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to execute trade' },
      { status: 500 }
    );
  }
}
