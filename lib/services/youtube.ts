import { google } from 'googleapis';
import { prisma } from '@/lib/prisma';

export class YouTubeService {
  private youtube;

  constructor(accessToken?: string) {
    const auth = new google.auth.OAuth2(
      process.env.YOUTUBE_CLIENT_ID,
      process.env.YOUTUBE_CLIENT_SECRET
    );
    
    if (accessToken) {
      auth.setCredentials({ access_token: accessToken });
    }

    this.youtube = google.youtube({ version: 'v3', auth });
  }

  async verifyChannelOwnership(userId: string, channelId: string): Promise<boolean> {
    try {
      // Get user's OAuth token
      const account = await prisma.account.findFirst({
        where: { userId, provider: 'google' },
      });

      if (!account?.access_token) {
        throw new Error('No valid YouTube access token found');
      }

      // Set up authenticated YouTube client
      const auth = new google.auth.OAuth2();
      auth.setCredentials({ access_token: account.access_token });
      
      const youtube = google.youtube({ version: 'v3', auth });

      // Get user's channels
      const response = await youtube.channels.list({
        part: ['id', 'snippet'],
        mine: true,
      });

      const userChannels = response.data.items || [];
      return userChannels.some(channel => channel.id === channelId);
    } catch (error) {
      console.error('Channel verification error:', error);
      return false;
    }
  }

  async getChannelAnalytics(channelId: string) {
    try {
      const response = await this.youtube.channels.list({
        part: ['statistics', 'snippet', 'brandingSettings'],
        id: [channelId],
      });

      const channel = response.data.items?.[0];
      if (!channel) {
        throw new Error('Channel not found');
      }

      return {
        channelId: channel.id,
        title: channel.snippet?.title,
        description: channel.snippet?.description,
        subscriberCount: parseInt(channel.statistics?.subscriberCount || '0'),
        viewCount: parseInt(channel.statistics?.viewCount || '0'),
        videoCount: parseInt(channel.statistics?.videoCount || '0'),
        thumbnails: channel.snippet?.thumbnails,
        country: channel.snippet?.country,
      };
    } catch (error) {
      console.error('Analytics fetch error:', error);
      throw error;
    }
  }

  async getRecentVideos(channelId: string, maxResults = 10) {
    try {
      const response = await this.youtube.search.list({
        part: ['snippet'],
        channelId,
        order: 'date',
        maxResults,
        type: ['video'],
      });

      return response.data.items?.map(video => ({
        videoId: video.id?.videoId,
        title: video.snippet?.title,
        publishedAt: video.snippet?.publishedAt,
        thumbnails: video.snippet?.thumbnails,
      })) || [];
    } catch (error) {
      console.error('Recent videos fetch error:', error);
      throw error;
    }
  }

  // Note: YouTube Analytics API requires separate approval and monetization access
  async getRevenueData(channelId: string, startDate: string, endDate: string) {
    // This would require YouTube Analytics API and monetization permissions
    // For MVP, we'll use estimated revenue based on views and industry averages
    try {
      const analytics = await this.getChannelAnalytics(channelId);
      
      // Rough estimation: $1-5 per 1000 views (varies greatly)
      const estimatedRPM = 2.5; // Revenue per mille
      const monthlyViews = analytics.viewCount * 0.1; // Assume 10% of total views per month
      const estimatedMonthlyRevenue = (monthlyViews / 1000) * estimatedRPM;

      return {
        estimatedMonthlyRevenue,
        actualRevenue: null, // Would come from YouTube Analytics API
        note: 'Revenue estimation based on industry averages. Actual revenue requires creator permission.',
      };
    } catch (error) {
      console.error('Revenue data fetch error:', error);
      throw error;
    }
  }
}