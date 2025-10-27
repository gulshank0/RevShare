import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { YouTubeService } from '@/lib/services/youtube';

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
        { success: false, error: 'YouTube authentication required' },
        { status: 401 }
      );
    }

    // Initialize YouTube service
    const youtubeService = new YouTubeService(account.access_token);

    // Verify channel ownership
    const isOwner = await youtubeService.verifyChannelOwnership(
      session.user.id,
      youtubeChannelId
    );

    if (!isOwner) {
      return NextResponse.json(
        { success: false, error: 'Channel ownership verification failed' },
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
