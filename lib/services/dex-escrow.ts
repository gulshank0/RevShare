/**
 * Decentralized Exchange (DEX) Escrow Service
 * 
 * This service acts as a neutral, trustless escrow system for revenue sharing.
 * Neither creators nor investors have direct control over funds.
 * All distributions are automatic and based on smart contract-like rules.
 * 
 * Key Principles:
 * 1. Funds are held in escrow, not controlled by any party
 * 2. Distribution is automatic based on ownership percentages
 * 3. All actions are logged immutably for transparency
 * 4. Claims are time-bound and follow strict rules
 */

import { prisma } from '@/lib/prisma';
import { 
  ClaimantType,
  RevenueSource
} from '@prisma/client';
import crypto from 'node:crypto';

// Platform configuration
const PLATFORM_FEE_PERCENT = 5; // 5% platform fee
const CLAIM_EXPIRY_DAYS = 90; // Claims expire after 90 days

export interface DistributionResult {
  distributionId: string;
  totalAmount: number;
  creatorAmount: number;
  investorAmount: number;
  platformFee: number;
  claims: Array<{
    userId: string;
    type: ClaimantType;
    amount: number;
    ownershipPercent: number;
  }>;
}

export interface OwnershipSnapshot {
  creator: {
    userId: string;
    ownershipPercent: number;
  };
  investors: Array<{
    userId: string;
    shares: number;
    ownershipPercent: number;
  }>;
  totalShares: number;
  soldShares: number;
}

export class DEXEscrowService {
  
  /**
   * Generate cryptographic signature for audit integrity
   */
  private generateSignature(data: object): string {
    const payload = JSON.stringify(data);
    return crypto
      .createHmac('sha256', process.env.ESCROW_SECRET_KEY || 'escrow-secret')
      .update(payload)
      .digest('hex');
  }

  /**
   * Create an escrow vault for an offering
   * Called when an offering becomes ACTIVE
   */
  async createVault(offeringId: string): Promise<string> {
    const offering = await prisma.offering.findUnique({
      where: { id: offeringId },
      include: { channel: true },
    });

    if (!offering) {
      throw new Error('Offering not found');
    }

    // Check if vault already exists
    const existingVault = await prisma.escrowVault.findUnique({
      where: { offeringId },
    });

    if (existingVault) {
      return existingVault.id;
    }

    const vault = await prisma.$transaction(async (tx) => {
      const newVault = await tx.escrowVault.create({
        data: {
          offeringId,
          totalBalance: 0,
          pendingRelease: 0,
          totalDistributed: 0,
          creatorShare: 0,
          investorPool: 0,
          status: 'ACTIVE',
        },
      });

      // Create audit log
      await tx.escrowAuditLog.create({
        data: {
          vaultId: newVault.id,
          action: 'VAULT_CREATED',
          actorType: 'SYSTEM',
          newState: {
            offeringId,
            channelName: offering.channel.channelName,
            totalShares: offering.totalShares,
            sharePercentage: offering.sharePercentage,
          },
          signature: this.generateSignature({ vaultId: newVault.id, action: 'VAULT_CREATED' }),
        },
      });

      return newVault;
    });

    return vault.id;
  }

  /**
   * Get current ownership snapshot for an offering
   * This determines how revenue will be split
   */
  async getOwnershipSnapshot(offeringId: string): Promise<OwnershipSnapshot> {
    const offering = await prisma.offering.findUnique({
      where: { id: offeringId },
      include: {
        channel: true,
        investments: {
          where: { status: 'CONFIRMED' },
          include: { investor: true },
        },
      },
    });

    if (!offering) {
      throw new Error('Offering not found');
    }

    const totalShares = offering.totalShares;
    const soldShares = totalShares - offering.availableShares;
    
    // Creator retains ownership of unsold shares + (100% - sharePercentage) of sold shares
    // For sold shares, investors get sharePercentage% of revenue
    
    // Calculate investor ownership from their shares
    const investors = offering.investments.map((investment) => {
      const investorShareOfSold = investment.shares / soldShares;
      const ownershipPercent = investorShareOfSold * offering.sharePercentage;
      
      return {
        userId: investment.investorId,
        shares: investment.shares,
        ownershipPercent,
      };
    });

    // Creator gets remainder
    const totalInvestorPercent = investors.reduce((sum, inv) => sum + inv.ownershipPercent, 0);
    const creatorOwnershipPercent = 100 - totalInvestorPercent;

    return {
      creator: {
        userId: offering.channel.ownerId,
        ownershipPercent: creatorOwnershipPercent,
      },
      investors,
      totalShares,
      soldShares,
    };
  }

  /**
   * Deposit revenue into escrow
   * This is called when YouTube revenue is received
   */
  async depositRevenue(
    offeringId: string,
    amount: number,
    revenueMonth: string,
    source: RevenueSource = 'YOUTUBE_ADSENSE',
    externalRef?: string
  ): Promise<string> {
    const vault = await prisma.escrowVault.findUnique({
      where: { offeringId },
    });

    if (!vault) {
      throw new Error('Escrow vault not found. Create vault first.');
    }

    if (vault.status !== 'ACTIVE') {
      throw new Error('Escrow vault is not active');
    }

    if (amount <= 0) {
      throw new Error('Deposit amount must be positive');
    }

    const deposit = await prisma.$transaction(async (tx) => {
      // Create deposit record
      const newDeposit = await tx.escrowDeposit.create({
        data: {
          vaultId: vault.id,
          amount,
          source,
          externalRef,
          revenueMonth,
          status: 'PENDING',
          metadata: {
            depositedAt: new Date().toISOString(),
          },
        },
      });

      // Update vault balance
      await tx.escrowVault.update({
        where: { id: vault.id },
        data: {
          totalBalance: { increment: amount },
          pendingRelease: { increment: amount },
          lastRevenueAt: new Date(),
        },
      });

      // Audit log
      await tx.escrowAuditLog.create({
        data: {
          vaultId: vault.id,
          action: 'DEPOSIT_RECEIVED',
          actorType: 'SYSTEM',
          amount,
          previousState: { totalBalance: vault.totalBalance },
          newState: { totalBalance: vault.totalBalance + amount },
          signature: this.generateSignature({ 
            depositId: newDeposit.id, 
            amount, 
            revenueMonth 
          }),
        },
      });

      return newDeposit;
    });

    return deposit.id;
  }

  /**
   * Verify a deposit (e.g., after YouTube payment confirmation)
   */
  async verifyDeposit(depositId: string): Promise<void> {
    const deposit = await prisma.escrowDeposit.findUnique({
      where: { id: depositId },
      include: { vault: true },
    });

    if (!deposit) {
      throw new Error('Deposit not found');
    }

    if (deposit.status !== 'PENDING') {
      throw new Error('Deposit is not pending');
    }

    await prisma.$transaction(async (tx) => {
      await tx.escrowDeposit.update({
        where: { id: depositId },
        data: {
          status: 'VERIFIED',
          verifiedAt: new Date(),
        },
      });

      await tx.escrowAuditLog.create({
        data: {
          vaultId: deposit.vaultId,
          action: 'DEPOSIT_VERIFIED',
          actorType: 'SYSTEM',
          amount: deposit.amount,
          signature: this.generateSignature({ depositId, action: 'DEPOSIT_VERIFIED' }),
        },
      });
    });
  }

  /**
   * Distribute funds from escrow to all stakeholders
   * This is the core "smart contract" logic
   */
  async distributeRevenue(
    offeringId: string,
    depositId?: string
  ): Promise<DistributionResult> {
    const vault = await prisma.escrowVault.findUnique({
      where: { offeringId },
    });

    if (!vault) {
      throw new Error('Escrow vault not found');
    }

    if (vault.status !== 'ACTIVE') {
      throw new Error('Escrow vault is not active');
    }

    // Get amount to distribute
    let amountToDistribute = vault.pendingRelease;
    
    if (depositId) {
      const deposit = await prisma.escrowDeposit.findUnique({
        where: { id: depositId },
      });
      if (!deposit || deposit.status === 'DISTRIBUTED') {
        throw new Error('Invalid or already distributed deposit');
      }
      amountToDistribute = deposit.amount;
    }

    if (amountToDistribute <= 0) {
      throw new Error('No funds available for distribution');
    }

    // Get ownership snapshot
    const ownership = await this.getOwnershipSnapshot(offeringId);

    // Calculate platform fee
    const platformFee = amountToDistribute * (PLATFORM_FEE_PERCENT / 100);
    const distributableAmount = amountToDistribute - platformFee;

    // Calculate creator's share
    const creatorAmount = distributableAmount * (ownership.creator.ownershipPercent / 100);

    // Calculate investor shares
    const investorAmount = distributableAmount - creatorAmount;

    const claims: Array<{
      userId: string;
      type: ClaimantType;
      amount: number;
      ownershipPercent: number;
      shares?: number;
    }> = [];

    // Creator claim
    if (creatorAmount > 0) {
      claims.push({
        userId: ownership.creator.userId,
        type: 'CREATOR' as ClaimantType,
        amount: creatorAmount,
        ownershipPercent: ownership.creator.ownershipPercent,
      });
    }

    // Investor claims
    for (const investor of ownership.investors) {
      if (investor.ownershipPercent > 0) {
        const investorShare = distributableAmount * (investor.ownershipPercent / 100);
        claims.push({
          userId: investor.userId,
          type: 'INVESTOR' as ClaimantType,
          amount: investorShare,
          ownershipPercent: investor.ownershipPercent,
          shares: investor.shares,
        });
      }
    }

    // Execute distribution in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create distribution record
      const distribution = await tx.escrowDistribution.create({
        data: {
          vaultId: vault.id,
          depositId,
          totalAmount: amountToDistribute,
          creatorAmount,
          investorAmount,
          platformFee,
          distributionRatio: ownership as object,
          status: 'PROCESSING',
        },
      });

      // Create claims for each stakeholder
      const claimExpiresAt = new Date();
      claimExpiresAt.setDate(claimExpiresAt.getDate() + CLAIM_EXPIRY_DAYS);

      for (const claim of claims) {
        await tx.escrowClaim.create({
          data: {
            vaultId: vault.id,
            distributionId: distribution.id,
            userId: claim.userId,
            claimantType: claim.type,
            amount: claim.amount,
            shares: claim.shares,
            ownershipPercent: claim.ownershipPercent,
            status: 'AVAILABLE',
            expiresAt: claimExpiresAt,
          },
        });
      }

      // Update vault
      await tx.escrowVault.update({
        where: { id: vault.id },
        data: {
          pendingRelease: { decrement: amountToDistribute },
          totalDistributed: { increment: amountToDistribute },
          creatorShare: { increment: creatorAmount },
          investorPool: { increment: investorAmount },
          lastDistributionAt: new Date(),
        },
      });

      // Update deposit if specified
      if (depositId) {
        await tx.escrowDeposit.update({
          where: { id: depositId },
          data: { status: 'DISTRIBUTED' },
        });
      }

      // Mark distribution as completed
      await tx.escrowDistribution.update({
        where: { id: distribution.id },
        data: {
          status: 'COMPLETED',
          executedAt: new Date(),
        },
      });

      // Audit log
      await tx.escrowAuditLog.create({
        data: {
          vaultId: vault.id,
          action: 'DISTRIBUTION_COMPLETED',
          actorType: 'SYSTEM',
          amount: amountToDistribute,
          newState: {
            distributionId: distribution.id,
            claims: claims.map(c => ({ userId: c.userId, amount: c.amount })),
          },
          signature: this.generateSignature({
            distributionId: distribution.id,
            totalAmount: amountToDistribute,
            claims,
          }),
        },
      });

      return distribution;
    });

    return {
      distributionId: result.id,
      totalAmount: amountToDistribute,
      creatorAmount,
      investorAmount,
      platformFee,
      claims,
    };
  }

  /**
   * Process a claim - transfer funds from escrow to user's wallet
   */
  async processClaim(claimId: string, userId: string): Promise<void> {
    const claim = await prisma.escrowClaim.findUnique({
      where: { id: claimId },
      include: {
        vault: {
          include: {
            offering: {
              include: { channel: true },
            },
          },
        },
      },
    });

    if (!claim) {
      throw new Error('Claim not found');
    }

    if (claim.userId !== userId) {
      throw new Error('Unauthorized: You cannot claim this');
    }

    if (claim.status !== 'AVAILABLE') {
      throw new Error(`Claim is ${claim.status.toLowerCase()}`);
    }

    if (claim.expiresAt && new Date() > claim.expiresAt) {
      await prisma.escrowClaim.update({
        where: { id: claimId },
        data: { status: 'EXPIRED' },
      });
      throw new Error('Claim has expired');
    }

    await prisma.$transaction(async (tx) => {
      // Get or create user's wallet
      let wallet = await tx.wallet.findUnique({
        where: { userId },
      });

      wallet ??= await tx.wallet.create({
        data: {
          userId,
          balance: 0,
          totalDeposited: 0,
          totalInvested: 0,
          totalWithdrawn: 0,
          totalEarnings: 0,
        },
      });

      // Update wallet balance
      const newBalance = wallet.balance + claim.amount;
      await tx.wallet.update({
        where: { userId },
        data: {
          balance: newBalance,
          totalEarnings: { increment: claim.amount },
          lastActivityAt: new Date(),
        },
      });

      // Create transaction record
      const transaction = await tx.transaction.create({
        data: {
          userId,
          type: 'EARNING',
          amount: claim.amount,
          fee: 0,
          netAmount: claim.amount,
          status: 'COMPLETED',
          referenceType: 'escrow_claim',
          referenceId: claimId,
          description: `Revenue share from ${claim.vault.offering.channel.channelName}`,
          completedAt: new Date(),
          metadata: {
            claimId,
            vaultId: claim.vaultId,
            distributionId: claim.distributionId,
            ownershipPercent: claim.ownershipPercent,
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
          credit: claim.amount,
          balance: newBalance,
          description: `Revenue claim: ${claim.vault.offering.channel.channelName} (${claim.ownershipPercent.toFixed(2)}% ownership)`,
          referenceType: 'escrow_claim',
          referenceId: claimId,
        },
      });

      // Update vault balances
      if (claim.claimantType === 'CREATOR') {
        await tx.escrowVault.update({
          where: { id: claim.vaultId },
          data: {
            creatorShare: { decrement: claim.amount },
            totalBalance: { decrement: claim.amount },
          },
        });
      } else {
        await tx.escrowVault.update({
          where: { id: claim.vaultId },
          data: {
            investorPool: { decrement: claim.amount },
            totalBalance: { decrement: claim.amount },
          },
        });
      }

      // Mark claim as processed
      await tx.escrowClaim.update({
        where: { id: claimId },
        data: {
          status: 'CLAIMED',
          claimedAt: new Date(),
        },
      });

      // Audit log
      await tx.escrowAuditLog.create({
        data: {
          vaultId: claim.vaultId,
          action: 'CLAIM_PROCESSED',
          actorId: userId,
          actorType: claim.claimantType,
          amount: claim.amount,
          signature: this.generateSignature({
            claimId,
            userId,
            amount: claim.amount,
          }),
        },
      });
    });
  }

  /**
   * Get all available claims for a user
   */
  async getUserClaims(userId: string): Promise<any[]> {
    return prisma.escrowClaim.findMany({
      where: {
        userId,
        status: 'AVAILABLE',
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } },
        ],
      },
      include: {
        vault: {
          include: {
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
        },
        distribution: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get vault details and statistics
   */
  async getVaultDetails(offeringId: string): Promise<any> {
    const vault = await prisma.escrowVault.findUnique({
      where: { offeringId },
      include: {
        offering: {
          include: {
            channel: true,
          },
        },
        deposits: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        distributions: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        claims: {
          where: { status: 'AVAILABLE' },
        },
      },
    });

    if (!vault) {
      return null;
    }

    const ownership = await this.getOwnershipSnapshot(offeringId);

    return {
      vault,
      ownership,
      statistics: {
        totalBalance: vault.totalBalance,
        pendingRelease: vault.pendingRelease,
        totalDistributed: vault.totalDistributed,
        creatorUnclaimed: vault.creatorShare,
        investorUnclaimed: vault.investorPool,
        availableClaims: vault.claims.length,
      },
    };
  }

  /**
   * Batch process all pending distributions
   * This can be run by a cron job
   */
  async processAllPendingDistributions(): Promise<void> {
    const pendingDeposits = await prisma.escrowDeposit.findMany({
      where: {
        status: 'VERIFIED',
      },
      include: {
        vault: true,
      },
    });

    for (const deposit of pendingDeposits) {
      try {
        await this.distributeRevenue(deposit.vault.offeringId, deposit.id);
      } catch (error) {
        console.error(`Failed to distribute deposit ${deposit.id}:`, error);
      }
    }
  }

  /**
   * Expire old unclaimed claims
   */
  async expireOldClaims(): Promise<number> {
    const result = await prisma.escrowClaim.updateMany({
      where: {
        status: 'AVAILABLE',
        expiresAt: { lt: new Date() },
      },
      data: {
        status: 'EXPIRED',
      },
    });

    return result.count;
  }
}

// Singleton instance
export const dexEscrowService = new DEXEscrowService();
