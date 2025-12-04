'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Video, IndianRupee, Users, Shield, AlertCircle, Loader2 } from 'lucide-react';

interface StepData {
  kycCompleted: boolean;
  channelConnected: boolean;
  offeringCreated: boolean;
}

interface ChannelData {
  id: string;
  youtubeChannelId: string;
  channelName: string;
  analytics: any;
}

export default function CreatorOnboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [stepData, setStepData] = useState<StepData>({
    kycCompleted: false,
    channelConnected: false,
    offeringCreated: false,
  });
  const [channelData, setChannelData] = useState<ChannelData | null>(null);
  const [kycData, setKycData] = useState({
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    phoneNumber: '',
    street: '',
    city: '',
    state: '',
    zipCode: '',
    country: '',
    documentType: 'drivers_license' as 'passport' | 'drivers_license' | 'national_id',
    documentNumber: '',
    documentExpiry: '',
    taxId: '',
  });
  const [youtubeChannelId, setYoutubeChannelId] = useState('');
  const [offeringData, setOfferingData] = useState({
    title: '',
    description: '',
    sharePercentage: 10,
    totalShares: 1000,
    pricePerShare: 100,
    minInvestment: 100,
    maxInvestment: 5000,
    duration: 24,
  });

  // Check existing progress on mount
  useEffect(() => {
    if (session?.user) {
      checkProgress();
    }
  }, [session]);

  const getStepStatus = (stepId: number) => {
    if (stepId === 1) {
      return stepData.kycCompleted ? 'completed' : currentStep === 1 ? 'current' : 'pending';
    }
    if (stepId === 2) {
      return stepData.channelConnected ? 'completed' : currentStep === 2 ? 'current' : 'pending';
    }
    if (stepId === 3) {
      return stepData.offeringCreated ? 'completed' : currentStep === 3 ? 'current' : 'pending';
    }
    return currentStep === 4 ? 'completed' : 'pending';
  };

  const getBadgeVariant = (status: string) => {
    if (status === 'completed') return 'default';
    if (status === 'current') return 'secondary';
    return 'outline';
  };

  const getBadgeClassName = (status: string) => {
    if (status === 'completed') return 'bg-green-600 text-white';
    if (status === 'current') return 'bg-red-600 text-white';
    return 'bg-zinc-700 text-gray-400 border-zinc-600';
  };

  const getBadgeText = (status: string) => {
    if (status === 'completed') return 'Complete';
    if (status === 'current') return 'Current';
    return 'Pending';
  };

  const checkProgress = async () => {
    try {
      setLoading(true);
      
      // Check KYC status
      const kycRes = await fetch('/api/kyc');
      const kycResult = await kycRes.json();
      
      // Check channel status
      const channelRes = await fetch('/api/creator/channel');
      const channelResult = await channelRes.json();
      
      // Check offering status
      const offeringRes = await fetch('/api/creator/offering');
      const offeringResult = await offeringRes.json();

      const progress = {
        kycCompleted: kycResult.success && kycResult.status === 'VERIFIED',
        channelConnected: channelResult.success && channelResult.channels?.length > 0,
        offeringCreated: offeringResult.success && offeringResult.offerings?.length > 0,
      };

      setStepData(progress);

      if (channelResult.success && channelResult.channels?.length > 0) {
        setChannelData(channelResult.channels[0]);
      }

      // Determine current step
      if (!progress.kycCompleted) {
        setCurrentStep(1);
      } else if (!progress.channelConnected) {
        setCurrentStep(2);
      } else if (progress.offeringCreated) {
        setCurrentStep(4);
      } else {
        setCurrentStep(3);
      }
    } catch (err) {
      console.error('Progress check error:', err);
      setError('Failed to load progress. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  };

  const handleKYCSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/kyc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: kycData.firstName,
          lastName: kycData.lastName,
          dateOfBirth: kycData.dateOfBirth,
          phoneNumber: kycData.phoneNumber,
          address: {
            street: kycData.street,
            city: kycData.city,
            state: kycData.state,
            zipCode: kycData.zipCode,
            country: kycData.country,
          },
          identityDocument: {
            type: kycData.documentType,
            number: kycData.documentNumber,
            expiryDate: kycData.documentExpiry,
          },
          taxId: kycData.taxId,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setStepData({ ...stepData, kycCompleted: true });
        setCurrentStep(2);
      } else {
        setError(result.error || 'KYC submission failed');
      }
    } catch (err) {
      console.error('KYC submission error:', err);
      setError('Failed to submit KYC information');
    } finally {
      setLoading(false);
    }
  };

  const handleChannelConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/creator/channel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ youtubeChannelId }),
      });

      const result = await response.json();

      if (result.success) {
        setStepData({ ...stepData, channelConnected: true });
        setChannelData(result.channel);
        setCurrentStep(3);
      } else {
        setError(result.error || 'Channel verification failed');
      }
    } catch (err) {
      console.error('Channel connection error:', err);
      setError('Failed to connect YouTube channel');
    } finally {
      setLoading(false);
    }
  };

  const handleOfferingCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!channelData) {
      setError('Please connect your YouTube channel first');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/creator/offering', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...offeringData,
          channelId: channelData.id,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setStepData({ ...stepData, offeringCreated: true });
        setCurrentStep(4);
      } else {
        setError(result.error || 'Offering creation failed');
      }
    } catch (err) {
      console.error('Offering creation error:', err);
      setError('Failed to create offering');
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    {
      id: 1,
      title: 'KYC Verification',
      description: 'Verify your identity and comply with regulations',
      icon: Shield,
      status: getStepStatus(1)
    },
    {
      id: 2,
      title: 'YouTube Verification',
      description: 'Connect your YouTube channel to get started',
      icon: Video,
      status: getStepStatus(2)
    },
    {
      id: 3,
      title: 'Revenue Share Setup',
      description: 'Configure your investment offering details',
      icon: IndianRupee,
      status: getStepStatus(3)
    },
    {
      id: 4,
      title: 'Go Live',
      description: 'Launch your offering to investors',
      icon: Users,
      status: getStepStatus(4)
    }
  ];

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-red-600 animate-spin" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-zinc-950 py-16 px-4">
        <div className="max-w-3xl mx-auto text-center space-y-6">
          <h1 className="text-4xl font-bold text-white">Sign In Required</h1>
          <p className="text-xl text-gray-400">Please sign in to start your creator onboarding</p>
          <Button className="youtube-button text-xl px-8 py-3 h-auto" onClick={() => router.push('/auth/signin')}>
            Sign In with Google
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 py-16 px-4">
      <div className="max-w-7xl mx-auto space-y-12">
        <div className="text-center space-y-6">
          <h1 className="text-4xl md:text-6xl font-bold text-white leading-tight">
            Creator <span className="text-red-600">Onboarding</span>
          </h1>
          <p className="text-xl md:text-2xl text-gray-400 max-w-3xl mx-auto leading-relaxed">
            Turn your YouTube success into investment opportunities
          </p>
        </div>

        {/* Progress Steps */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {steps.map((step) => {
            const Icon = step.icon;
            const badgeVariant = getBadgeVariant(step.status);
            const badgeClassName = getBadgeClassName(step.status);
            const badgeText = getBadgeText(step.status);
            
            return (
              <div key={step.id} className={`youtube-card p-6 ${step.status === 'current' ? 'border border-red-600' : ''}`}>
                <div className="text-center space-y-4">
                  <div className="mx-auto">
                    {step.status === 'completed' ? (
                      <div className="w-12 h-12 bg-green-600/20 rounded-full flex items-center justify-center">
                        <CheckCircle className="h-6 w-6 text-green-400" />
                      </div>
                    ) : (
                      <div className={`w-12 h-12 ${step.status === 'current' ? 'bg-red-600/20' : 'bg-zinc-800'} rounded-full flex items-center justify-center`}>
                        <Icon className={`h-6 w-6 ${step.status === 'current' ? 'text-red-600' : 'text-gray-400'}`} />
                      </div>
                    )}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">{step.title}</h3>
                    <p className="text-sm text-gray-400 mt-1">
                      {step.description}
                    </p>
                  </div>
                  <Badge 
                    variant={badgeVariant}
                    className={badgeClassName}
                  >
                    {badgeText}
                  </Badge>
                </div>
              </div>
            );
          })}
        </div>

        {/* Error Display */}
        {error && (
          <div className="youtube-card border-red-600/50 bg-red-950/20 p-4">
            <div className="flex items-center gap-3 text-red-400">
              <AlertCircle className="h-5 w-5" />
              <p>{error}</p>
            </div>
          </div>
        )}

        {/* Step Content */}
        {currentStep === 1 && (
          <div className="youtube-card">
            <div className="p-8 border-b border-zinc-800">
              <h2 className="text-2xl font-bold text-white">Step 1: KYC Verification</h2>
              <p className="text-gray-400 text-lg mt-2">
                We need to verify your identity to comply with financial regulations
              </p>
            </div>
            <form onSubmit={handleKYCSubmit} className="p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">First Name *</label>
                  <input
                    type="text"
                    required
                    value={kycData.firstName}
                    onChange={(e) => setKycData({ ...kycData, firstName: e.target.value })}
                    className="w-full px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:border-red-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Last Name *</label>
                  <input
                    type="text"
                    required
                    value={kycData.lastName}
                    onChange={(e) => setKycData({ ...kycData, lastName: e.target.value })}
                    className="w-full px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:border-red-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Date of Birth *</label>
                  <input
                    type="date"
                    required
                    value={kycData.dateOfBirth}
                    onChange={(e) => setKycData({ ...kycData, dateOfBirth: e.target.value })}
                    className="w-full px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:border-red-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Phone Number *</label>
                  <input
                    type="tel"
                    required
                    value={kycData.phoneNumber}
                    onChange={(e) => setKycData({ ...kycData, phoneNumber: e.target.value })}
                    className="w-full px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:border-red-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white">Address Information</h3>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Street Address *</label>
                  <input
                    type="text"
                    required
                    value={kycData.street}
                    onChange={(e) => setKycData({ ...kycData, street: e.target.value })}
                    className="w-full px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:border-red-600 focus:outline-none"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">City *</label>
                    <input
                      type="text"
                      required
                      value={kycData.city}
                      onChange={(e) => setKycData({ ...kycData, city: e.target.value })}
                      className="w-full px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:border-red-600 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">State *</label>
                    <input
                      type="text"
                      required
                      value={kycData.state}
                      onChange={(e) => setKycData({ ...kycData, state: e.target.value })}
                      className="w-full px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:border-red-600 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">ZIP Code *</label>
                    <input
                      type="text"
                      required
                      value={kycData.zipCode}
                      onChange={(e) => setKycData({ ...kycData, zipCode: e.target.value })}
                      className="w-full px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:border-red-600 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Country *</label>
                    <input
                      type="text"
                      required
                      value={kycData.country}
                      onChange={(e) => setKycData({ ...kycData, country: e.target.value })}
                      className="w-full px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:border-red-600 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white">Identity Document</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Document Type *</label>
                    <select
                      required
                      value={kycData.documentType}
                      onChange={(e) => setKycData({ ...kycData, documentType: e.target.value as any })}
                      className="w-full px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:border-red-600 focus:outline-none"
                    >
                      <option value="drivers_license">Driver's License</option>
                      <option value="passport">Passport</option>
                      <option value="national_id">National ID</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Document Number *</label>
                    <input
                      type="text"
                      required
                      value={kycData.documentNumber}
                      onChange={(e) => setKycData({ ...kycData, documentNumber: e.target.value })}
                      className="w-full px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:border-red-600 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Expiry Date *</label>
                    <input
                      type="date"
                      required
                      value={kycData.documentExpiry}
                      onChange={(e) => setKycData({ ...kycData, documentExpiry: e.target.value })}
                      className="w-full px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:border-red-600 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Tax ID / SSN (Optional)</label>
                <input
                  type="text"
                  value={kycData.taxId}
                  onChange={(e) => setKycData({ ...kycData, taxId: e.target.value })}
                  className="w-full px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:border-red-600 focus:outline-none"
                  placeholder="For tax reporting purposes"
                />
              </div>

              <Button type="submit" disabled={loading} className="youtube-button w-full text-lg py-6">
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit KYC Information'
                )}
              </Button>
            </form>
          </div>
        )}

        {currentStep === 2 && (
          <div className="youtube-card">
            <div className="p-8 border-b border-zinc-800">
              <h2 className="text-2xl font-bold text-white">Step 2: Connect YouTube Channel</h2>
              <p className="text-gray-400 text-lg mt-2">
                Link your YouTube channel to enable revenue sharing
              </p>
            </div>
            <form onSubmit={handleChannelConnect} className="p-8 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  YouTube Channel ID *
                </label>
                <input
                  type="text"
                  required
                  value={youtubeChannelId}
                  onChange={(e) => setYoutubeChannelId(e.target.value)}
                  placeholder="UCxxxxxxxxxxxxxxxxxx"
                  className="w-full px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:border-red-600 focus:outline-none"
                />
                <p className="text-sm text-gray-500 mt-2">
                  Find your Channel ID: Go to YouTube Studio → Settings → Channel → Advanced Settings
                </p>
              </div>

              <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 space-y-3">
                <h3 className="font-semibold text-white">Requirements:</h3>
                <ul className="space-y-2 text-gray-400">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-5 w-5 text-green-400 mt-0.5 shrink-0" />
                    <span>Valid YouTube Channel ID</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-5 w-5 text-green-400 mt-0.5 shrink-0" />
                    <span>Active YouTube channel</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-5 w-5 text-green-400 mt-0.5 shrink-0" />
                    <span>Good standing with YouTube policies</span>
                  </li>
                </ul>
              </div>

              <div className="flex gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCurrentStep(1)}
                  className="flex-1 border-zinc-700 text-black hover:bg-zinc-800 hover:text-gray-300"
                >
                  Back
                </Button>
                <Button type="submit" disabled={loading} className="youtube-button flex-1 text-lg py-6">
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    'Verify Channel'
                  )}
                </Button>
              </div>
            </form>
          </div>
        )}

        {currentStep === 3 && (
          <div className="youtube-card">
            <div className="p-8 border-b border-zinc-800">
              <h2 className="text-2xl font-bold text-white">Step 3: Create Investment Offering</h2>
              <p className="text-gray-400 text-lg mt-2">
                Set up your revenue sharing terms for investors
              </p>
            </div>
            <form onSubmit={handleOfferingCreate} className="p-8 space-y-6">
              {channelData && (
                <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
                  <h3 className="font-semibold text-white mb-2">Connected Channel</h3>
                  <p className="text-gray-400">{channelData.channelName}</p>
                  {channelData.analytics && (
                    <div className="grid grid-cols-3 gap-4 mt-4">
                      <div>
                        <p className="text-sm text-gray-500">Subscribers</p>
                        <p className="text-lg font-semibold text-white">
                          {(channelData.analytics.subscriberCount || 0).toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Total Views</p>
                        <p className="text-lg font-semibold text-white">
                          {(channelData.analytics.viewCount || 0).toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Videos</p>
                        <p className="text-lg font-semibold text-white">
                          {(channelData.analytics.videoCount || 0).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Offering Title *</label>
                  <input
                    type="text"
                    required
                    value={offeringData.title}
                    onChange={(e) => setOfferingData({ ...offeringData, title: e.target.value })}
                    placeholder="e.g., Revenue Share in My Gaming Channel"
                    className="w-full px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:border-red-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Description *</label>
                  <textarea
                    required
                    value={offeringData.description}
                    onChange={(e) => setOfferingData({ ...offeringData, description: e.target.value })}
                    rows={4}
                    placeholder="Describe your channel, content strategy, and growth plans..."
                    className="w-full px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:border-red-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Revenue Share Percentage * (1-50%)
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    max="50"
                    value={offeringData.sharePercentage}
                    onChange={(e) => setOfferingData({ ...offeringData, sharePercentage: Number(e.target.value) })}
                    className="w-full px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:border-red-600 focus:outline-none"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Percentage of YouTube revenue to share with investors
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Duration (months) *</label>
                  <input
                    type="number"
                    required
                    min="12"
                    max="60"
                    value={offeringData.duration}
                    onChange={(e) => setOfferingData({ ...offeringData, duration: Number(e.target.value) })}
                    className="w-full px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:border-red-600 focus:outline-none"
                  />
                  <p className="text-sm text-gray-500 mt-1">How long the revenue share will last</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Total Shares *</label>
                  <input
                    type="number"
                    required
                    min="100"
                    value={offeringData.totalShares}
                    onChange={(e) => setOfferingData({ ...offeringData, totalShares: Number(e.target.value) })}
                    className="w-full px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:border-red-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Price Per Share (₹) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={offeringData.pricePerShare}
                    onChange={(e) => setOfferingData({ ...offeringData, pricePerShare: Number(e.target.value) })}
                    className="w-full px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:border-red-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Minimum Investment (₹) *</label>
                  <input
                    type="number"
                    required
                    min="100"
                    value={offeringData.minInvestment}
                    onChange={(e) => setOfferingData({ ...offeringData, minInvestment: Number(e.target.value) })}
                    className="w-full px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:border-red-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Maximum Investment (₹)</label>
                  <input
                    type="number"
                    value={offeringData.maxInvestment}
                    onChange={(e) => setOfferingData({ ...offeringData, maxInvestment: Number(e.target.value) })}
                    className="w-full px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:border-red-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="bg-blue-950/20 border border-blue-600/50 rounded-lg p-6">
                <h3 className="font-semibold text-blue-400 mb-2">Offering Summary</h3>
                <div className="space-y-2 text-gray-300">
                  <p>Total Funding Goal: <span className="font-semibold text-white">
                    ₹{(offeringData.totalShares * offeringData.pricePerShare).toLocaleString('en-IN')}
                  </span></p>
                  <p>Revenue Share: <span className="font-semibold text-white">
                    {offeringData.sharePercentage}% for {offeringData.duration} months
                  </span></p>
                  <p>Investment Range: <span className="font-semibold text-white">
                    ₹{offeringData.minInvestment.toLocaleString('en-IN')} - ₹{offeringData.maxInvestment.toLocaleString('en-IN')}
                  </span></p>
                </div>
              </div>

              <div className="flex gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCurrentStep(2)}
                  className="flex-1 border-zinc-700 text-white hover:bg-zinc-800"
                >
                  Back
                </Button>
                <Button type="submit" disabled={loading} className="youtube-button flex-1 text-lg py-6">
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create Offering'
                  )}
                </Button>
              </div>
            </form>
          </div>
        )}

        {currentStep === 4 && (
          <div className="youtube-card">
            <div className="p-8 text-center space-y-6">
              <div className="w-20 h-20 bg-green-600/20 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="h-10 w-10 text-green-400" />
              </div>
              <h2 className="text-3xl font-bold text-white">Onboarding Complete!</h2>
              <p className="text-xl text-gray-400 max-w-2xl mx-auto">
                Your offering has been submitted and is pending admin approval. 
                You'll receive an email once it's approved and live on the marketplace.
              </p>
              <div className="flex gap-4 justify-center pt-6">
                <Button 
                  onClick={() => router.push('/dashboard/creator')}
                  className="youtube-button text-lg px-8 py-6"
                >
                  Go to Dashboard
                </Button>
                <Button 
                  onClick={() => router.push('/marketplace')}
                  variant="outline"
                  className="border-zinc-700 text-white hover:bg-zinc-800 text-lg px-8 py-6"
                >
                  View Marketplace
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Benefits Section */}
        <div className="youtube-card p-8">
          <h2 className="text-2xl md:text-3xl font-bold text-white text-center mb-8">
            Why Creators Choose Our Platform
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-3">
              <h3 className="font-semibold text-white flex items-center gap-3">
                <div className="w-8 h-8 bg-green-600/20 rounded-full flex items-center justify-center">
                  <CheckCircle className="h-4 w-4 text-green-400" />
                </div>
                Keep Creative Control
              </h3>
              <p className="text-gray-400 ml-11">Maintain full ownership and creative freedom of your channel</p>
            </div>
            <div className="space-y-3">
              <h3 className="font-semibold text-white flex items-center gap-3">
                <div className="w-8 h-8 bg-green-600/20 rounded-full flex items-center justify-center">
                  <CheckCircle className="h-4 w-4 text-green-400" />
                </div>
                Upfront Capital
              </h3>
              <p className="text-gray-400 ml-11">Get funding now for future growth and equipment</p>
            </div>
            <div className="space-y-3">
              <h3 className="font-semibold text-white flex items-center gap-3">
                <div className="w-8 h-8 bg-green-600/20 rounded-full flex items-center justify-center">
                  <CheckCircle className="h-4 w-4 text-green-400" />
                </div>
                Fair Revenue Split
              </h3>
              <p className="text-gray-400 ml-11">Set your own terms and percentage shares</p>
            </div>
            <div className="space-y-3">
              <h3 className="font-semibold text-white flex items-center gap-3">
                <div className="w-8 h-8 bg-green-600/20 rounded-full flex items-center justify-center">
                  <CheckCircle className="h-4 w-4 text-green-400" />
                </div>
                Transparent Reporting
              </h3>
              <p className="text-gray-400 ml-11">Automated revenue tracking and investor updates</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}