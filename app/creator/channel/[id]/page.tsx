'use client';

import { useParams } from 'next/navigation';

export default function ChannelDetailPage() {
  const params = useParams();
  const channelId = params.id;
  
  return (
    <div className="min-h-screen bg-zinc-950 py-16 px-4">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-white">Channel Details</h1>
        <p className="text-gray-400 mt-2">Channel ID: {channelId}</p>
      </div>
    </div>
  );
}
