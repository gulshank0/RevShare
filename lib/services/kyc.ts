import { prisma } from '@/lib/prisma';

interface KYCData {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  identityDocument: {
    type: 'passport' | 'drivers_license' | 'national_id';
    number: string;
    expiryDate: string;
  };
  phoneNumber: string;
  taxId?: string; // SSN or Tax ID
}

export class KYCService {
  async initiateKYC(userId: string, kycData: KYCData) {
    try {
      // In production, integrate with services like Jumio, Onfido, or Veriff
      const verificationId = `kyc_${Date.now()}_${userId}`;
      
      // Store KYC data (encrypted in production)
      await prisma.user.update({
        where: { id: userId },
        data: {
          kycStatus: 'PENDING',
          kycData: {
            ...kycData,
            verificationId,
            submittedAt: new Date().toISOString(),
          },
        },
      });

      // Simulate KYC process - in production, this would be handled by the KYC provider
      return {
        verificationId,
        status: 'PENDING',
        message: 'KYC verification initiated. You will receive an update within 24-48 hours.',
      };
    } catch (error) {
      console.error('KYC initiation error:', error);
      throw error;
    }
  }

  async checkKYCStatus(userId: string) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { kycStatus: true, kycData: true },
      });

      if (!user) {
        throw new Error('User not found');
      }

      return {
        status: user.kycStatus,
        data: user.kycData,
      };
    } catch (error) {
      console.error('KYC status check error:', error);
      throw error;
    }
  }

  async approveKYC(userId: string, adminId: string) {
    try {
      await prisma.user.update({
        where: { id: userId },
        data: {
          kycStatus: 'VERIFIED',
          updatedAt: new Date(),
        },
      });

      // Send notification email (implement email service)
      return { success: true, message: 'KYC approved successfully' };
    } catch (error) {
      console.error('KYC approval error:', error);
      throw error;
    }
  }

  async rejectKYC(userId: string, reason: string, adminId: string) {
    try {
      await prisma.user.update({
        where: { id: userId },
        data: {
          kycStatus: 'REJECTED',
          kycData: {
            ...(await prisma.user.findUnique({ where: { id: userId } }))?.kycData,
            rejectionReason: reason,
            rejectedAt: new Date().toISOString(),
          },
        },
      });

      return { success: true, message: 'KYC rejected' };
    } catch (error) {
      console.error('KYC rejection error:', error);
      throw error;
    }
  }

  // Compliance check for investment limits
  async checkInvestmentEligibility(userId: string, investmentAmount: number) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          investments: {
            where: { status: 'CONFIRMED' },
          },
        },
      });

      if (!user || user.kycStatus !== 'VERIFIED') {
        return {
          eligible: false,
          reason: 'KYC verification required',
        };
      }

      // Calculate total invested amount
      const totalInvested = user.investments.reduce(
        (sum, investment) => sum + investment.totalAmount,
        0
      );

      // Set investment limits based on KYC tier
      const maxInvestmentLimit = 10000; // $10,000 for basic KYC
      const maxSingleInvestment = 2500; // $2,500 per investment

      if (investmentAmount > maxSingleInvestment) {
        return {
          eligible: false,
          reason: `Single investment limit is $${maxSingleInvestment}`,
        };
      }

      if (totalInvested + investmentAmount > maxInvestmentLimit) {
        return {
          eligible: false,
          reason: `Total investment limit of $${maxInvestmentLimit} would be exceeded`,
        };
      }

      return { eligible: true };
    } catch (error) {
      console.error('Investment eligibility check error:', error);
      throw error;
    }
  }
}