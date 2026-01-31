import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { YouTubeService } from '@/lib/services/youtube';

// Helper function to refresh access token if expired
async function getValidAccessToken(account: {
  id: string;
  access_token: string | null;
  refresh_token: string | null;
  expires_at: number | null;
}): Promise<string | null> {
  // Check if token is expired (with 5 minute buffer)
  const now = Math.floor(Date.now() / 1000);
  const isExpired = account.expires_at ? account.expires_at < now + 300 : true;

  if (!isExpired && account.access_token) {
    return account.access_token;
  }

  // Token is expired, try to refresh
  if (!account.refresh_token) {
    console.error('No refresh token available');
    return null;
  }

  try {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        grant_type: 'refresh_token',
        refresh_token: account.refresh_token,
      }),
    });

    const tokens = await response.json();

    if (!response.ok) {
      console.error('Token refresh failed:', tokens);
      return null;
    }

    // Update the account with new tokens
    await prisma.account.update({
      where: { id: account.id },
      data: {
        access_token: tokens.access_token,
        expires_at: Math.floor(Date.now() / 1000) + tokens.expires_in,
        // refresh_token is only returned if it changed
        ...(tokens.refresh_token && { refresh_token: tokens.refresh_token }),
      },
    });

    return tokens.access_token;
  } catch (error) {
    console.error('Error refreshing token:', error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { youtubeChannelId } = await request.json();

    if (!youtubeChannelId) {
      return NextResponse.json(
        { success: false, error: 'YouTube Channel ID is required' },
        { status: 400 }
      );
    }

    // Get user's OAuth token
    const account = await prisma.account.findFirst({
      where: {
        userId: session.user.id,
        provider: 'google',
      },
    });

    if (!account?.access_token) {
      return NextResponse.json(
        { success: false, error: 'YouTube authentication required. Please sign out and sign in again to grant YouTube access.' },
        { status: 401 }
      );
    }

    // Check if the account has YouTube scope
    const hasYouTubeScope = account.scope?.includes('youtube');
    if (!hasYouTubeScope) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'YouTube channel access not authorized. Please sign out and sign in again to grant YouTube permissions.',
          requiresReauth: true
        },
        { status: 403 }
      );
    }

    // Get a valid (refreshed if necessary) access token
    const accessToken = await getValidAccessToken({
      id: account.id,
      access_token: account.access_token,
      refresh_token: account.refresh_token,
      expires_at: account.expires_at,
    });

    if (!accessToken) {
      return NextResponse.json(
        { success: false, error: 'YouTube authentication expired. Please sign out and sign in again to refresh your access.' },
        { status: 401 }
      );
    }

    // Initialize YouTube service with refreshed token
    const youtubeService = new YouTubeService(accessToken, account.refresh_token || undefined);

    // Verify channel exists and is valid
    let isValid: boolean;
    try {
      isValid = await youtubeService.verifyChannelOwnership(
        session.user.id,
        youtubeChannelId
      );
    } catch (error: unknown) {
      // Check for insufficient permissions error (missing YouTube scope)
      const gaxiosError = error as { code?: number; errors?: Array<{ reason?: string }> };
      if (gaxiosError.code === 403 && gaxiosError.errors?.some(e => e.reason === 'insufficientPermissions')) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'YouTube access not authorized. Please sign out completely and sign in again to grant YouTube channel access.',
            requiresReauth: true
          },
          { status: 403 }
        );
      }
      throw error;
    }

    if (!isValid) {
      return NextResponse.json(
        { success: false, error: 'Channel not found. Please check your Channel ID and try again.' },
        { status: 403 }
      );
    }

    // Fetch channel analytics
    const analytics = await youtubeService.getChannelAnalytics(youtubeChannelId);
    const recentVideos = await youtubeService.getRecentVideos(youtubeChannelId, 10);
    
    // Get revenue estimate
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];
    const revenueData = await youtubeService.getRevenueData(
      youtubeChannelId,
      startDate,
      endDate
    );

    // Create or update channel record
    const channel = await prisma.channel.upsert({
      where: { youtubeChannelId },
      update: {
        verified: true,
        analytics: JSON.parse(JSON.stringify({
          ...analytics,
          recentVideos,
        })),
        revenueData: JSON.parse(JSON.stringify(revenueData)),
        status: 'VERIFIED',
      },
      create: {
        youtubeChannelId,
        channelName: analytics.title || 'Unknown Channel',
        channelUrl: `https://youtube.com/channel/${youtubeChannelId}`,
        ownerId: session.user.id,
        verified: true,
        analytics: JSON.parse(JSON.stringify({
          ...analytics,
          recentVideos,
        })),
        revenueData: JSON.parse(JSON.stringify(revenueData)),
        status: 'VERIFIED',
      },
    });

    // Update user role to CREATOR
    await prisma.user.update({
      where: { id: session.user.id },
      data: { role: 'CREATOR' },
    });

    return NextResponse.json({
      success: true,
      channel,
      analytics,
      revenueData,
    });
  } catch (error) {
    console.error('Channel verification error:', error);
    return NextResponse.json(
      { success: false, error: 'Channel verification failed' },
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

    const channels = await prisma.channel.findMany({
      where: { ownerId: session.user.id },
      include: {
        offerings: {
          select: {
            id: true,
            status: true,
            totalShares: true,
            availableShares: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      channels,
    });
  } catch (error) {
    console.error('Channel fetch error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch channels' },
      { status: 500 }
    );
  }
}
