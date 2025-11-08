import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const maxResults = Number.parseInt(searchParams.get('maxResults') || '20');

    if (!query) {
      return NextResponse.json({ error: 'Search query is required' }, { status: 400 });
    }

    // Check if API key is configured
    if (!process.env.YOUTUBE_API_KEY) {
      console.error('YouTube API key not configured');
      return NextResponse.json(
        { error: 'YouTube API is not configured. Please set YOUTUBE_API_KEY environment variable.' },
        { status: 500 }
      );
    }

    // Initialize YouTube API
    const youtube = google.youtube({
      version: 'v3',
      auth: process.env.YOUTUBE_API_KEY
    });

    // Search for channels
    const searchResponse = await youtube.search.list({
      part: ['snippet'],
      q: query,
      type: ['channel'],
      maxResults,
      order: 'relevance'
    });

    if (!searchResponse.data.items || searchResponse.data.items.length === 0) {
      return NextResponse.json({ creators: [] });
    }

    // Get channel IDs from search results
    const channelIds = searchResponse.data.items
      .map(item => item.snippet?.channelId)
      .filter(Boolean) as string[];

    if (channelIds.length === 0) {
      return NextResponse.json({ creators: [] });
    }

    // Get detailed channel information for each result
    const channelsResponse = await youtube.channels.list({
      part: ['snippet', 'statistics', 'brandingSettings'],
      id: channelIds
    });

    const creators = channelsResponse.data.items?.map(channel => ({
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

    return NextResponse.json({ creators });
  } catch (error) {
    console.error('YouTube search error:', error);
    
    // Handle specific YouTube API errors
    if (error instanceof Error) {
      if (error.message.includes('quotaExceeded')) {
        return NextResponse.json(
          { error: 'YouTube API quota exceeded. Please try again later.' },
          { status: 429 }
        );
      }
      if (error.message.includes('invalid')) {
        return NextResponse.json(
          { error: 'Invalid YouTube API configuration.' },
          { status: 500 }
        );
      }
    }
    
    return NextResponse.json(
      { error: 'Failed to search YouTube creators. Please try again.' },
      { status: 500 }
    );
  }
}