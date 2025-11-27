import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
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
    const requiredFields = ['firstName', 'lastName', 'dateOfBirth', 'address', 'phoneNumber', 'panNumber', 'documentType'];
    for (const field of requiredFields) {
      if (!kycData[field]) {
        return NextResponse.json(
          { success: false, error: `${field} is required` },
          { status: 400 }
        );
      }
    }

    // Validate address sub-fields
    const addressFields = ['street', 'city', 'state', 'pincode'];
    for (const field of addressFields) {
      if (!kycData.address?.[field]) {
        return NextResponse.json(
          { success: false, error: `Address ${field} is required` },
          { status: 400 }
        );
      }
    }

    // Validate PAN format
    const panRegex = /^[A-Z]{5}\d{4}[A-Z]$/;
    if (!panRegex.test(kycData.panNumber)) {
      return NextResponse.json(
        { success: false, error: 'Invalid PAN number format' },
        { status: 400 }
      );
    }

    // Validate Aadhaar if document type is aadhaar
    if (kycData.documentType === 'aadhaar') {
      const aadhaarRegex = /^[2-9]\d{11}$/;
      if (!kycData.aadhaarNumber || !aadhaarRegex.test(kycData.aadhaarNumber.replaceAll(' ', ''))) {
        return NextResponse.json(
          { success: false, error: 'Invalid Aadhaar number' },
          { status: 400 }
        );
      }
    } else if (!kycData.documentNumber) {
      return NextResponse.json(
        { success: false, error: 'Document number is required' },
        { status: 400 }
      );
    }

    // Validate phone number (Indian format)
    const phoneRegex = /^[6-9]\d{9}$/;
    if (!phoneRegex.test(kycData.phoneNumber.replaceAll(' ', ''))) {
      return NextResponse.json(
        { success: false, error: 'Invalid phone number' },
        { status: 400 }
      );
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

    const result = await kycService.checkKYCStatus(session.user.id);

    return NextResponse.json({
      success: true,
      status: result.status,
      data: result.data,
    });
  } catch (error) {
    console.error('KYC status check error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to check KYC status', status: 'NOT_SUBMITTED', data: null },
      { status: 500 }
    );
  }
}
