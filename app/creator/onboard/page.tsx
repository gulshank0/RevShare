'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Youtube, DollarSign, Users, Shield } from 'lucide-react';

export default function CreatorOnboardPage() {
  const { data: session } = useSession();
  const [currentStep, setCurrentStep] = useState(1);

  const steps = [
    {
      id: 1,
      title: 'Account Setup',
      description: 'Create your creator account and verify identity',
      icon: Shield,
      status: session ? 'completed' : 'current'
    },
    {
      id: 2,
      title: 'YouTube Verification',
      description: 'Connect and verify your YouTube channel ownership',
      icon: Youtube,
      status: 'pending'
    },
    {
      id: 3,
      title: 'Revenue Share Setup',
      description: 'Configure your investment offering details',
      icon: DollarSign,
      status: 'pending'
    },
    {
      id: 4,
      title: 'Go Live',
      description: 'Launch your offering to investors',
      icon: Users,
      status: 'pending'
    }
  ];

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
                    variant={step.status === 'completed' ? 'default' : step.status === 'current' ? 'secondary' : 'outline'}
                    className={
                      step.status === 'completed' 
                        ? 'bg-green-600 text-white' 
                        : step.status === 'current' 
                        ? 'bg-red-600 text-white' 
                        : 'bg-zinc-700 text-gray-400 border-zinc-600'
                    }
                  >
                    {step.status === 'completed' ? 'Complete' : step.status === 'current' ? 'Current' : 'Pending'}
                  </Badge>
                </div>
              </div>
            );
          })}
        </div>

        {/* Current Step Content */}
        <div className="youtube-card">
          <div className="p-8 border-b border-zinc-800">
            <h2 className="text-2xl font-bold text-white">Get Started as a Creator</h2>
            <p className="text-gray-400 text-lg mt-2">
              Join hundreds of successful YouTube creators who are raising funds through revenue sharing
            </p>
          </div>
          <div className="p-8 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-red-600/10 rounded-full p-4 mx-auto flex items-center justify-center">
                  <span className="text-2xl font-bold text-red-600">1M+</span>
                </div>
                <h3 className="font-semibold text-white">Minimum Subscribers</h3>
                <p className="text-sm text-gray-400">Established audience required</p>
              </div>
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-green-600/10 rounded-full p-4 mx-auto flex items-center justify-center">
                  <span className="text-2xl font-bold text-green-400">$5K+</span>
                </div>
                <h3 className="font-semibold text-white">Monthly Revenue</h3>
                <p className="text-sm text-gray-400">Proven monetization track record</p>
              </div>
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-purple-600/10 rounded-full p-4 mx-auto flex items-center justify-center">
                  <span className="text-2xl font-bold text-purple-400">6mo+</span>
                </div>
                <h3 className="font-semibold text-white">Channel Age</h3>
                <p className="text-sm text-gray-400">Consistent content creation</p>
              </div>
            </div>

            <div className="text-center space-y-6">
              <p className="text-gray-400 text-lg">
                Ready to get started? Connect your Google account to verify your YouTube channel.
              </p>
              {!session ? (
                <Button className="youtube-button text-xl px-8 py-3 h-auto cursor-pointer" onClick={() => window.location.href = '/api/auth/signin'}>
                  Sign In with Google
                </Button>
              ) : (
                <Button className="youtube-button text-xl px-8 py-3 h-auto" onClick={() => setCurrentStep(2)}>
                  Continue Setup
                </Button>
              )}
            </div>
          </div>
        </div>

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