import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { KYCService } from '@/lib/services/kyc';

const kycService = new KYCService();

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const kycData = await request.json();

    // Validate required fields
    const requiredFields = ['firstName', 'lastName', 'dateOfBirth', 'address', 'phoneNumber'];
    for (const field of requiredFields) {
      if (!kycData[field]) {
        return NextResponse.json(
          { success: false, error: `${field} is required` },
          { status: 400 }
        );
      }
    }

    const result = await kycService.initiateKYC(session.user.id, kycData);

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('KYC submission error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to submit KYC' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const status = await kycService.checkKYCStatus(session.user.id);

    return NextResponse.json({
      success: true,
      ...status,
    });
  } catch (error) {
    console.error('KYC status check error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to check KYC status' },
      { status: 500 }
    );
  }
}
