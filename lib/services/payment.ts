import Stripe from 'stripe';
import { prisma } from '@/lib/prisma';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

export class PaymentService {
  // Create payment intent for wallet deposit
  async createWalletDepositIntent(amount: number, userId: string) {
    try {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: 'usd',
        metadata: {
          userId,
          type: 'wallet_deposit',
        },
      });

      // Create pending transaction
      await prisma.transaction.create({
        data: {
          userId,
          type: 'DEPOSIT',
          amount,
          status: 'PENDING',
          stripeId: paymentIntent.id,
          metadata: {
            paymentIntentId: paymentIntent.id,
          },
        },
      });

      return {
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
      };
    } catch (error) {
      console.error('Wallet deposit intent creation error:', error);
      throw error;
    }
  }

  // Confirm wallet deposit and update balance
  async confirmWalletDeposit(paymentIntentId: string) {
    try {
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      
      if (paymentIntent.status === 'succeeded') {
        const { userId } = paymentIntent.metadata;
        const amount = paymentIntent.amount / 100;

        // Get or create wallet
        let wallet = await prisma.wallet.findUnique({
          where: { userId },
        });

        if (!wallet) {
          wallet = await prisma.wallet.create({
            data: {
              userId,
              balance: 0,
              totalDeposited: 0,
              totalInvested: 0,
              totalWithdrawn: 0,
            },
          });
        }

        // Update wallet balance
        await prisma.wallet.update({
          where: { userId },
          data: {
            balance: {
              increment: amount,
            },
            totalDeposited: {
              increment: amount,
            },
          },
        });

        // Update transaction status
        const transaction = await prisma.transaction.findFirst({
          where: { stripeId: paymentIntentId },
        });

        if (transaction) {
          await prisma.transaction.update({
            where: { id: transaction.id },
            data: { status: 'COMPLETED' },
          });
        }

        return wallet;
      }
      
      throw new Error('Payment not successful');
    } catch (error) {
      console.error('Wallet deposit confirmation error:', error);
      throw error;
    }
  }

  // Create investment from wallet balance
  async createInvestmentFromWallet(userId: string, offeringId: string, shares: number) {
    try {
      const offering = await prisma.offering.findUnique({
        where: { id: offeringId },
      });

      if (!offering) {
        throw new Error('Offering not found');
      }

      const totalAmount = shares * offering.pricePerShare;

      // Check wallet balance
      const wallet = await prisma.wallet.findUnique({
        where: { userId },
      });

      if (!wallet || wallet.balance < totalAmount) {
        throw new Error('Insufficient wallet balance');
      }

      // Create investment and update wallet in a transaction
      const result = await prisma.$transaction(async (tx) => {
        // Create investment
        const investment = await tx.investment.create({
          data: {
            investorId: userId,
            offeringId,
            shares,
            totalAmount,
            status: 'CONFIRMED',
          },
        });

        // Update wallet balance
        await tx.wallet.update({
          where: { userId },
          data: {
            balance: {
              decrement: totalAmount,
            },
            totalInvested: {
              increment: totalAmount,
            },
          },
        });

        // Update offering available shares
        await tx.offering.update({
          where: { id: offeringId },
          data: {
            availableShares: {
              decrement: shares,
            },
          },
        });

        // Create transaction record
        await tx.transaction.create({
          data: {
            userId,
            type: 'INVESTMENT',
            amount: totalAmount,
            status: 'COMPLETED',
            metadata: {
              investmentId: investment.id,
              offeringId,
              shares,
            },
          },
        });

        return investment;
      });

      return result;
    } catch (error) {
      console.error('Investment from wallet error:', error);
      throw error;
    }
  }

  async createPaymentIntent(amount: number, userId: string, offeringId: string, investmentId: string) {
    try {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: 'usd',
        metadata: {
          userId,
          offeringId,
          investmentId,
          type: 'investment',
        },
      });

      return {
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
      };
    } catch (error) {
      console.error('Payment intent creation error:', error);
      throw error;
    }
  }

  async confirmPayment(paymentIntentId: string) {
    try {
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      
      if (paymentIntent.status === 'succeeded') {
        const { userId, offeringId, investmentId } = paymentIntent.metadata;
        
        const offering = await prisma.offering.findUnique({
          where: { id: offeringId },
        });

        if (!offering) {
          throw new Error('Offering not found');
        }

        const shares = Math.floor(paymentIntent.amount / 100 / offering.pricePerShare);
        
        let investment;
        
        if (investmentId) {
          // Update existing pending investment
          investment = await prisma.investment.update({
            where: { id: investmentId },
            data: {
              status: 'CONFIRMED',
              updatedAt: new Date(),
            },
          });
        } else {
          // Fallback: Create new investment record if ID missing
          investment = await prisma.investment.create({
            data: {
              investorId: userId,
              offeringId,
              shares,
              totalAmount: paymentIntent.amount / 100,
              status: 'CONFIRMED',
            },
          });
        }

        // Update offering available shares
        await prisma.offering.update({
          where: { id: offeringId },
          data: {
            availableShares: {
              decrement: shares,
            },
          },
        });

        // Update transaction status if exists
        const transaction = await prisma.transaction.findFirst({
            where: { stripeId: paymentIntentId }
        });

        if (transaction) {
            await prisma.transaction.update({
                where: { id: transaction.id },
                data: { status: 'COMPLETED' }
            });
        }

        return investment;
      }
      
      throw new Error('Payment not successful');
    } catch (error) {
      console.error('Payment confirmation error:', error);
      throw error;
    }
  }

  async createPayout(investmentId: string, amount: number) {
    try {
      const investment = await prisma.investment.findUnique({
        where: { id: investmentId },
        include: { investor: true },
      });

      if (!investment) {
        throw new Error('Investment not found');
      }

      // Create Stripe transfer (requires connected accounts for creators)
      const transfer = await stripe.transfers.create({
        amount: Math.round(amount * 100),
        currency: 'usd',
        destination: investment.investor.id, // Would be connected account ID
        metadata: {
          investmentId,
          type: 'revenue_payout',
        },
      });

      // Record payout in database
      const payout = await prisma.payout.create({
        data: {
          investmentId,
          amount,
          revenueMonth: new Date().toISOString().slice(0, 7), // YYYY-MM
          status: 'COMPLETED',
          paidAt: new Date(),
        },
      });

      return payout;
    } catch (error) {
      console.error('Payout creation error:', error);
      throw error;
    }
  }

  async handleWebhook(body: string, signature: string) {
    try {
      const event = stripe.webhooks.constructEvent(
        body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET!
      );

      switch (event.type) {
        case 'payment_intent.succeeded': {
          const metadata = event.data.object.metadata;
          if (metadata.type === 'wallet_deposit') {
            await this.confirmWalletDeposit(event.data.object.id);
          } else if (metadata.type === 'investment') {
            await this.confirmPayment(event.data.object.id);
          }
          break;
        }
        case 'transfer.created':
          // Handle payout notifications
          break;
        default:
          console.log(`Unhandled event type ${event.type}`);
      }

      return { received: true };
    } catch (error) {
      console.error('Webhook error:', error);
      throw error;
    }
  }
}