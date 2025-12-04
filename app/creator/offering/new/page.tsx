'use client';

import { useRouter } from 'next/navigation';

export default function NewOfferingPage() {
  const router = useRouter();
  
  // Redirect to onboarding page which handles offering creation
  router.push('/creator/onboard');
  
  return (
    <div className="min-h-screen bg-zinc-950 py-16 px-4">
      <div className="max-w-7xl mx-auto text-center">
        <p className="text-gray-400">Redirecting to onboarding...</p>
      </div>
    </div>
  );
}
