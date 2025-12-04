import Stripe from 'stripe';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  // @ts-expect-error - Using latest Stripe API version
  apiVersion: '2024-11-20.acacia',
});

// Withdrawal processing fee
const WITHDRAWAL_FEE_PERCENT = 1.5;

export class PaymentService {
  // Hash bank account number for secure storage
  hashAccountNumber(accountNumber: string): string {
    return crypto.createHash('sha256').update(accountNumber + process.env.ENCRYPTION_KEY).digest('hex');
  }

  // Create payment intent for wallet deposit
  async createWalletDepositIntent(amount: number, userId: string, ipAddress?: string, userAgent?: string) {
    try {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to paise
        currency: 'inr',
        metadata: {
          userId,
          type: 'wallet_deposit',
        },
      });

      // Create pending transaction with audit info
      await prisma.transaction.create({
        data: {
          userId,
          type: 'DEPOSIT',
          amount,
          fee: 0,
          netAmount: amount,
          status: 'PENDING',
          stripeId: paymentIntent.id,
          description: 'Wallet deposit',
          ipAddress,
          userAgent,
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

  // Confirm wallet deposit and update balance with ledger entry
  async confirmWalletDeposit(paymentIntentId: string) {
    try {
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      
      if (paymentIntent.status === 'succeeded') {
        const { userId } = paymentIntent.metadata;
        const amount = paymentIntent.amount / 100;

        const result = await prisma.$transaction(async (tx) => {
          // Get or create wallet
          let wallet = await tx.wallet.findUnique({
            where: { userId },
          });

          if (!wallet) {
            wallet = await tx.wallet.create({
              data: {
                userId,
                balance: 0,
                pendingBalance: 0,
                lockedBalance: 0,
                totalDeposited: 0,
                totalInvested: 0,
                totalWithdrawn: 0,
                totalEarnings: 0,
              },
            });
          }

          // Update wallet balance
          const newBalance = wallet.balance + amount;
          const updatedWallet = await tx.wallet.update({
            where: { userId },
            data: {
              balance: newBalance,
              totalDeposited: {
                increment: amount,
              },
              lastActivityAt: new Date(),
            },
          });

          // Update transaction status
          const transaction = await tx.transaction.findFirst({
            where: { stripeId: paymentIntentId },
          });

          if (transaction) {
            await tx.transaction.update({
              where: { id: transaction.id },
              data: { 
                status: 'COMPLETED',
                completedAt: new Date(),
              },
            });

            // Create ledger entry
            await tx.walletLedger.create({
              data: {
                walletId: updatedWallet.id,
                transactionId: transaction.id,
                entryType: 'DEPOSIT',
                debit: 0,
                credit: amount,
                balance: newBalance,
                description: `Deposit via Stripe`,
                referenceType: 'deposit',
                referenceId: transaction.id,
                metadata: { stripePaymentIntentId: paymentIntentId },
              },
            });
          }

          return updatedWallet;
        });

        return result;
      }
      
      throw new Error('Payment not successful');
    } catch (error) {
      console.error('Wallet deposit confirmation error:', error);
      throw error;
    }
  }

  // Process withdrawal (called by admin or cron job after review)
  async processWithdrawal(withdrawalId: string) {
    try {
      const withdrawal = await prisma.withdrawal.findUnique({
        where: { id: withdrawalId },
        include: {
          bankAccount: true,
        },
      });

      if (!withdrawal) {
        throw new Error('Withdrawal not found');
      }

      if (withdrawal.status !== 'PENDING') {
        throw new Error('Withdrawal is not in pending status');
      }

      // Update status to processing
      await prisma.withdrawal.update({
        where: { id: withdrawalId },
        data: { 
          status: 'PROCESSING',
          processedAt: new Date(),
        },
      });

      // In production, you would initiate ACH transfer via Stripe or other payment processor
      // For now, we'll simulate the payout
      // const payout = await stripe.payouts.create({
      //   amount: Math.round(withdrawal.netAmount * 100),
      //   currency: 'usd',
      //   destination: withdrawal.bankAccount.stripeExternalId,
      // });

      return { success: true, withdrawalId };
    } catch (error) {
      console.error('Withdrawal processing error:', error);
      throw error;
    }
  }

  // Complete withdrawal (called after bank transfer is confirmed)
  async completeWithdrawal(withdrawalId: string, stripePayoutId?: string) {
    try {
      const withdrawal = await prisma.withdrawal.findUnique({
        where: { id: withdrawalId },
        include: { bankAccount: true },
      });

      if (!withdrawal) {
        throw new Error('Withdrawal not found');
      }

      const result = await prisma.$transaction(async (tx) => {
        // Get wallet
        const wallet = await tx.wallet.findFirst({
          where: { userId: withdrawal.userId },
        });

        if (!wallet) {
          throw new Error('Wallet not found');
        }

        // Update withdrawal status
        const updatedWithdrawal = await tx.withdrawal.update({
          where: { id: withdrawalId },
          data: {
            status: 'COMPLETED',
            stripePayoutId,
            completedAt: new Date(),
          },
        });

        // Update wallet - remove from locked, add to withdrawn
        const updatedWallet = await tx.wallet.update({
          where: { id: wallet.id },
          data: {
            lockedBalance: { decrement: withdrawal.amount },
            totalWithdrawn: { increment: withdrawal.netAmount },
            lastActivityAt: new Date(),
          },
        });

        // Update transaction
        await tx.transaction.updateMany({
          where: {
            referenceType: 'withdrawal',
            referenceId: withdrawalId,
          },
          data: { 
            status: 'COMPLETED',
            completedAt: new Date(),
          },
        });

        // Create ledger entry for completed withdrawal
        await tx.walletLedger.create({
          data: {
            walletId: wallet.id,
            entryType: 'WITHDRAWAL',
            debit: withdrawal.amount,
            credit: 0,
            balance: updatedWallet.balance,
            description: `Withdrawal completed to ${withdrawal.bankAccount.bankName} ****${withdrawal.bankAccount.accountNumberLast4}`,
            referenceType: 'withdrawal',
            referenceId: withdrawalId,
            metadata: { 
              fee: withdrawal.fee,
              netAmount: withdrawal.netAmount,
            },
          },
        });

        // If there was a fee, create fee ledger entry
        if (withdrawal.fee > 0) {
          await tx.walletLedger.create({
            data: {
              walletId: wallet.id,
              entryType: 'FEE_CHARGED',
              debit: withdrawal.fee,
              credit: 0,
              balance: updatedWallet.balance,
              description: `Withdrawal fee (${WITHDRAWAL_FEE_PERCENT}%)`,
              referenceType: 'withdrawal',
              referenceId: withdrawalId,
            },
          });
        }

        return { withdrawal: updatedWithdrawal, wallet: updatedWallet };
      });

      return result;
    } catch (error) {
      console.error('Withdrawal completion error:', error);
      throw error;
    }
  }

  // Fail withdrawal and refund locked funds
  async failWithdrawal(withdrawalId: string, failureReason: string) {
    try {
      const withdrawal = await prisma.withdrawal.findUnique({
        where: { id: withdrawalId },
      });

      if (!withdrawal) {
        throw new Error('Withdrawal not found');
      }

      const result = await prisma.$transaction(async (tx) => {
        // Get wallet
        const wallet = await tx.wallet.findFirst({
          where: { userId: withdrawal.userId },
        });

        if (!wallet) {
          throw new Error('Wallet not found');
        }

        // Update withdrawal status
        const updatedWithdrawal = await tx.withdrawal.update({
          where: { id: withdrawalId },
          data: {
            status: 'FAILED',
            failureReason,
          },
        });

        // Unlock funds back to available balance
        const updatedWallet = await tx.wallet.update({
          where: { id: wallet.id },
          data: {
            balance: { increment: withdrawal.amount },
            lockedBalance: { decrement: withdrawal.amount },
            lastActivityAt: new Date(),
          },
        });

        // Update transaction
        await tx.transaction.updateMany({
          where: {
            referenceType: 'withdrawal',
            referenceId: withdrawalId,
          },
          data: { status: 'FAILED' },
        });

        // Create ledger entry for failed withdrawal
        await tx.walletLedger.create({
          data: {
            walletId: wallet.id,
            entryType: 'UNLOCK',
            debit: 0,
            credit: withdrawal.amount,
            balance: updatedWallet.balance,
            description: `Withdrawal failed - funds returned: ${failureReason}`,
            referenceType: 'withdrawal',
            referenceId: withdrawalId,
          },
        });

        return { withdrawal: updatedWithdrawal, wallet: updatedWallet };
      });

      return result;
    } catch (error) {
      console.error('Withdrawal failure handling error:', error);
      throw error;
    }
  }

  // Create investment from wallet balance
  async createInvestmentFromWallet(userId: string, offeringId: string, shares: number) {
    try {
      const offering = await prisma.offering.findUnique({
        where: { id: offeringId },
        include: { channel: true },
      });

      if (!offering) {
        throw new Error('Offering not found');
      }

      if (offering.status !== 'ACTIVE') {
        throw new Error('Offering is not available for investment');
      }

      if (shares > offering.availableShares) {
        throw new Error('Not enough shares available');
      }

      const totalAmount = shares * offering.pricePerShare;

      // Check wallet balance
      const wallet = await prisma.wallet.findUnique({
        where: { userId },
      });

      if (!wallet) {
        throw new Error('Wallet not found');
      }

      const availableBalance = wallet.balance - wallet.lockedBalance;
      if (availableBalance < totalAmount) {
        throw new Error(`Insufficient wallet balance. Available: ₹${availableBalance.toLocaleString('en-IN')}`);
      }

      // Check min/max investment
      if (totalAmount < offering.minInvestment) {
        throw new Error(`Minimum investment is ₹${offering.minInvestment.toLocaleString('en-IN')}`);
      }

      if (offering.maxInvestment && totalAmount > offering.maxInvestment) {
        throw new Error(`Maximum investment is ₹${offering.maxInvestment.toLocaleString('en-IN')}`);
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
        const newBalance = wallet.balance - totalAmount;
        const updatedWallet = await tx.wallet.update({
          where: { userId },
          data: {
            balance: newBalance,
            totalInvested: {
              increment: totalAmount,
            },
            lastActivityAt: new Date(),
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
        const transaction = await tx.transaction.create({
          data: {
            userId,
            type: 'INVESTMENT',
            amount: totalAmount,
            fee: 0,
            netAmount: totalAmount,
            status: 'COMPLETED',
            referenceType: 'investment',
            referenceId: investment.id,
            description: `Investment in ${offering.channel.channelName} - ${shares} shares`,
            completedAt: new Date(),
            metadata: {
              investmentId: investment.id,
              offeringId,
              shares,
              pricePerShare: offering.pricePerShare,
              channelName: offering.channel.channelName,
            },
          },
        });

        // Create ledger entry
        await tx.walletLedger.create({
          data: {
            walletId: wallet.id,
            transactionId: transaction.id,
            entryType: 'INVESTMENT',
            debit: totalAmount,
            credit: 0,
            balance: newBalance,
            description: `Investment: ${offering.channel.channelName} (${shares} shares @ ₹${offering.pricePerShare})`,
            referenceType: 'investment',
            referenceId: investment.id,
            metadata: {
              offeringId,
              shares,
              pricePerShare: offering.pricePerShare,
            },
          },
        });

        return { investment, transaction, wallet: updatedWallet };
      });

      return result.investment;
    } catch (error) {
      console.error('Investment from wallet error:', error);
      throw error;
    }
  }

  // Record earnings from investments (payouts)
  async recordInvestmentEarning(userId: string, investmentId: string, amount: number, revenueMonth: string) {
    try {
      const result = await prisma.$transaction(async (tx) => {
        // Get wallet
        const wallet = await tx.wallet.findUnique({
          where: { userId },
        });

        if (!wallet) {
          throw new Error('Wallet not found');
        }

        // Get investment details
        const investment = await tx.investment.findUnique({
          where: { id: investmentId },
          include: { offering: { include: { channel: true } } },
        });

        if (!investment) {
          throw new Error('Investment not found');
        }

        // Create payout record
        const payout = await tx.payout.create({
          data: {
            investmentId,
            amount,
            revenueMonth,
            status: 'COMPLETED',
            paidAt: new Date(),
          },
        });

        // Update wallet
        const newBalance = wallet.balance + amount;
        const updatedWallet = await tx.wallet.update({
          where: { userId },
          data: {
            balance: newBalance,
            totalEarnings: { increment: amount },
            lastActivityAt: new Date(),
          },
        });

        // Create transaction
        const transaction = await tx.transaction.create({
          data: {
            userId,
            type: 'EARNING',
            amount,
            fee: 0,
            netAmount: amount,
            status: 'COMPLETED',
            referenceType: 'payout',
            referenceId: payout.id,
            description: `Revenue share from ${investment.offering.channel.channelName} (${revenueMonth})`,
            completedAt: new Date(),
            metadata: {
              investmentId,
              payoutId: payout.id,
              revenueMonth,
              channelName: investment.offering.channel.channelName,
            },
          },
        });

        // Create ledger entry
        await tx.walletLedger.create({
          data: {
            walletId: wallet.id,
            transactionId: transaction.id,
            entryType: 'PAYOUT_RECEIVED',
            debit: 0,
            credit: amount,
            balance: newBalance,
            description: `Revenue share: ${investment.offering.channel.channelName} (${revenueMonth})`,
            referenceType: 'payout',
            referenceId: payout.id,
          },
        });

        return { payout, wallet: updatedWallet };
      });

      return result;
    } catch (error) {
      console.error('Investment earning recording error:', error);
      throw error;
    }
  }

  async createPaymentIntent(amount: number, userId: string, offeringId: string, investmentId: string) {
    try {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to paise
        currency: 'inr',
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
        currency: 'inr',
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

      console.log('Webhook event received:', event.type);

      switch (event.type) {
        case 'payment_intent.succeeded': {
          const paymentIntent = event.data.object;
          const metadata = paymentIntent.metadata;
          console.log('Payment succeeded:', paymentIntent.id, 'metadata:', metadata);
          
          if (metadata.type === 'wallet_deposit') {
            console.log('Processing wallet deposit for payment intent:', paymentIntent.id);
            const result = await this.confirmWalletDeposit(paymentIntent.id);
            console.log('Wallet deposit confirmed:', result);
          } else if (metadata.type === 'investment') {
            await this.confirmPayment(paymentIntent.id);
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