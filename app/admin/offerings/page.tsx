'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { CheckCircle, Loader2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Offering {
  id: string;
  title: string;
  description: string;
  status: string;
  sharePercentage: number;
  pricePerShare: number;
  totalShares: number;
  channel: {
    channelName: string;
    owner: { name: string | null; email: string };
  };
}

export default function AdminOfferingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [offerings, setOfferings] = useState<Offering[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/auth/signin');
    if (status === 'authenticated' && session.user.role !== 'ADMIN') router.push('/');
    if (status === 'authenticated' && session.user.role === 'ADMIN') fetchOfferings();
  }, [status, session, router]);

  const fetchOfferings = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/offerings?status=PENDING_APPROVAL');
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || 'Failed to load offerings');
      setOfferings(result.offerings);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : 'Failed to load offerings');
    } finally {
      setLoading(false);
    }
  };

  const updateOffering = async (offeringId: string, action: 'approve' | 'reject') => {
    try {
      setActionId(offeringId);
      setError('');
      const response = await fetch('/api/admin/offerings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ offeringId, action }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || 'Failed to update offering');
      setOfferings((current) => current.filter((offering) => offering.id !== offeringId));
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Failed to update offering');
    } finally {
      setActionId(null);
    }
  };

  if (status === 'loading' || loading) {
    return <div className="min-h-screen bg-black flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-red-600" /></div>;
  }

  return (
    <div className="min-h-screen bg-black p-6 lg:p-10">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Offering Review</h1>
          <p className="text-gray-400 mt-2">Approve creator offerings to publish them on the marketplace.</p>
        </div>

        {error && <p className="mb-6 rounded-lg border border-red-600/50 bg-red-950/30 p-4 text-red-300">{error}</p>}

        {offerings.length === 0 ? (
          <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-10 text-center text-gray-400">No offerings are waiting for review.</div>
        ) : (
          <div className="space-y-4">
            {offerings.map((offering) => (
              <div key={offering.id} className="rounded-lg border border-zinc-800 bg-zinc-900 p-6">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-2">
                    <h2 className="text-xl font-semibold text-white">{offering.title}</h2>
                    <p className="text-gray-400">{offering.channel.channelName} by {offering.channel.owner.name || offering.channel.owner.email}</p>
                    <p className="max-w-3xl text-gray-300">{offering.description}</p>
                    <p className="text-sm text-gray-400">{offering.sharePercentage}% revenue share · ₹{offering.pricePerShare} per share · {offering.totalShares.toLocaleString()} shares</p>
                  </div>
                  <div className="flex shrink-0 gap-3">
                    <Button disabled={actionId === offering.id} onClick={() => updateOffering(offering.id, 'approve')} className="bg-green-600 hover:bg-green-700">
                      <CheckCircle className="mr-2 h-4 w-4" /> Approve
                    </Button>
                    <Button disabled={actionId === offering.id} onClick={() => updateOffering(offering.id, 'reject')} variant="outline" className="border-red-700 text-red-300 hover:bg-red-950">
                      <XCircle className="mr-2 h-4 w-4" /> Reject
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
