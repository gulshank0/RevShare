import Stripe from 'stripe';
import { prisma } from '@/lib/prisma';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

export class PaymentService {
  async createPaymentIntent(amount: number, userId: string, offeringId: string) {
    try {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: 'usd',
        metadata: {
          userId,
          offeringId,
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
        // Create investment record
        const { userId, offeringId } = paymentIntent.metadata;
        
        const offering = await prisma.offering.findUnique({
          where: { id: offeringId },
        });

        if (!offering) {
          throw new Error('Offering not found');
        }

        const shares = Math.floor(paymentIntent.amount / 100 / offering.pricePerShare);
        
        const investment = await prisma.investment.create({
          data: {
            investorId: userId,
            offeringId,
            shares,
            totalAmount: paymentIntent.amount / 100,
            status: 'CONFIRMED',
          },
        });

        // Update offering available shares
        await prisma.offering.update({
          where: { id: offeringId },
          data: {
            availableShares: {
              decrement: shares,
            },
          },
        });

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
        case 'payment_intent.succeeded':
          await this.confirmPayment(event.data.object.id);
          break;
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