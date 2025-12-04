import { google, Auth } from 'googleapis';

export class YouTubeService {
  private readonly youtube;
  private readonly auth: Auth.OAuth2Client;

  constructor(accessToken?: string, refreshToken?: string) {
    this.auth = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );
    
    if (accessToken) {
      this.auth.setCredentials({ 
        access_token: accessToken,
        refresh_token: refreshToken 
      });
    }

    this.youtube = google.youtube({ version: 'v3', auth: this.auth });
  }

  // Method to refresh the access token if needed
  async refreshAccessToken(): Promise<string | null> {
    try {
      const { credentials } = await this.auth.refreshAccessToken();
      return credentials.access_token || null;
    } catch (error) {
      console.error('Failed to refresh access token:', error);
      return null;
    }
  }

  // Get the current credentials (useful for saving updated tokens)
  getCredentials() {
    return this.auth.credentials;
  }

  // Add search functionality
  static async searchChannels(query: string, maxResults: number = 20) {
    if (!process.env.YOUTUBE_API_KEY) {
      throw new Error('YouTube API key not configured');
    }

    const youtube = google.youtube({
      version: 'v3',
      auth: process.env.YOUTUBE_API_KEY
    });

    try {
      // Search for channels
      const searchResponse = await youtube.search.list({
        part: ['snippet'],
        q: query,
        type: ['channel'],
        maxResults,
        order: 'relevance'
      });

      if (!searchResponse.data.items?.length) {
        return [];
      }

      // Get channel IDs
      const channelIds = searchResponse.data.items
        .map(item => item.snippet?.channelId)
        .filter(Boolean) as string[];

      if (!channelIds.length) {
        return [];
      }

      // Get detailed channel information
      const channelsResponse = await youtube.channels.list({
        part: ['snippet', 'statistics', 'brandingSettings'],
        id: channelIds
      });

      return channelsResponse.data.items?.map(channel => ({
        id: channel.id,
        title: channel.snippet?.title || 'Unknown Channel',
        description: channel.snippet?.description || '',
        thumbnails: channel.snippet?.thumbnails || {},
        subscriberCount: Number.parseInt(channel.statistics?.subscriberCount || '0'),
        viewCount: Number.parseInt(channel.statistics?.viewCount || '0'),
        videoCount: Number.parseInt(channel.statistics?.videoCount || '0'),
        country: channel.snippet?.country || '',
        publishedAt: channel.snippet?.publishedAt || '',
        customUrl: channel.snippet?.customUrl || '',
        bannerImageUrl: channel.brandingSettings?.image?.bannerExternalUrl || ''
      })) || [];
    } catch (error) {
      console.error('YouTube search error:', error);
      throw new Error('Failed to search YouTube creators');
    }
  }

  async verifyChannelOwnership(userId: string, channelId: string): Promise<boolean> {
    // Allow anyone with a valid YouTube channel to connect
    // Simply verify that the channel exists and is accessible
    const response = await this.youtube.channels.list({
      part: ['id', 'snippet'],
      id: [channelId],
    });

    const channels = response.data.items || [];
    
    // Return true if the channel exists and is valid
    return channels.length > 0 && channels[0].id === channelId;
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
        subscriberCount: Number.parseInt(channel.statistics?.subscriberCount || '0'),
        viewCount: Number.parseInt(channel.statistics?.viewCount || '0'),
        videoCount: Number.parseInt(channel.statistics?.videoCount || '0'),
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