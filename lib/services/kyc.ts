import { prisma } from '@/lib/prisma';

interface KYCData {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: 'male' | 'female' | 'other';
  phoneNumber: string;
  address: {
    street: string;
    city: string;
    state: string;
    pincode: string;
    country: string;
  };
  panNumber: string;
  documentType: 'aadhaar' | 'passport' | 'voter_id' | 'driving_license';
  aadhaarNumber?: string;
  documentNumber?: string;
  documentFrontUrl?: string;
  documentBackUrl?: string;
  selfieUrl?: string;
}

export class KYCService {
  async initiateKYC(userId: string, kycData: KYCData) {
    try {
      // In production, integrate with services like Aadhaar eKYC, DigiLocker, or Karza
      const verificationId = `kyc_${Date.now()}_${userId}`;
      
      // Prepare sanitized data for storage (sensitive data should be encrypted in production)
      const sanitizedData = {
        firstName: kycData.firstName,
        lastName: kycData.lastName,
        dateOfBirth: kycData.dateOfBirth,
        gender: kycData.gender,
        phoneNumber: kycData.phoneNumber,
        address: kycData.address,
        panNumber: kycData.panNumber,
        documentType: kycData.documentType,
        aadhaarNumber: kycData.aadhaarNumber,
        documentNumber: kycData.documentNumber,
        documentFrontUrl: kycData.documentFrontUrl,
        documentBackUrl: kycData.documentBackUrl,
        selfieUrl: kycData.selfieUrl,
        verificationId,
        submittedAt: new Date().toISOString(),
      };

      // Store KYC data (encrypted in production)
      await prisma.user.update({
        where: { id: userId },
        data: {
          kycStatus: 'PENDING',
          kycData: sanitizedData as any,
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

      // If kycData is null or doesn't have required fields, it means KYC hasn't been submitted
      const kycData = user.kycData as Record<string, unknown> | null;
      const hasSubmittedKyc = kycData && 
        typeof kycData === 'object' && 
        kycData.firstName && 
        kycData.lastName && 
        kycData.submittedAt;

      // Determine the actual status
      let status: string;
      if (!hasSubmittedKyc) {
        status = 'NOT_SUBMITTED';
      } else if (user.kycStatus === 'REJECTED') {
        status = 'REJECTED';
      } else if (user.kycStatus === 'VERIFIED') {
        status = 'VERIFIED';
      } else {
        status = 'PENDING';
      }

      return {
        status,
        data: hasSubmittedKyc ? user.kycData : null,
      };
    } catch (error) {
      console.error('KYC status check error:', error);
      throw error;
    }
  }

  async approveKYC(userId: string, adminId: string) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { kycData: true },
      });

      await prisma.user.update({
        where: { id: userId },
        data: {
          kycStatus: 'VERIFIED',
          kycData: {
            ...(user?.kycData as any),
            verifiedAt: new Date().toISOString(),
            verifiedBy: adminId,
          },
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
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { kycData: true },
      });

      await prisma.user.update({
        where: { id: userId },
        data: {
          kycStatus: 'REJECTED',
          kycData: {
            ...(user?.kycData as any),
            rejectionReason: reason,
            rejectedAt: new Date().toISOString(),
            rejectedBy: adminId,
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

      // Set investment limits based on KYC tier (amounts in INR)
      const maxInvestmentLimit = 1000000; // ₹10,00,000 for basic KYC
      const maxSingleInvestment = 250000; // ₹2,50,000 per investment

      if (investmentAmount > maxSingleInvestment) {
        return {
          eligible: false,
          reason: `Single investment limit is ₹${maxSingleInvestment.toLocaleString('en-IN')}`,
        };
      }

      if (totalInvested + investmentAmount > maxInvestmentLimit) {
        return {
          eligible: false,
          reason: `Total investment limit of ₹${maxInvestmentLimit.toLocaleString('en-IN')} would be exceeded`,
        };
      }

      return { eligible: true };
    } catch (error) {
      console.error('Investment eligibility check error:', error);
      throw error;
    }
  }
}