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
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold">Creator Onboarding</h1>
        <p className="text-xl text-gray-600">
          Turn your YouTube success into investment opportunities
        </p>
      </div>

      {/* Progress Steps */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {steps.map((step) => {
          const Icon = step.icon;
          return (
            <Card key={step.id} className={`relative ${step.status === 'current' ? 'border-blue-500' : ''}`}>
              <CardHeader className="text-center">
                <div className="mx-auto mb-2">
                  {step.status === 'completed' ? (
                    <CheckCircle className="h-8 w-8 text-green-600" />
                  ) : (
                    <Icon className={`h-8 w-8 ${step.status === 'current' ? 'text-blue-600' : 'text-gray-400'}`} />
                  )}
                </div>
                <CardTitle className="text-lg">{step.title}</CardTitle>
                <CardDescription className="text-sm">
                  {step.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <Badge variant={step.status === 'completed' ? 'default' : step.status === 'current' ? 'secondary' : 'outline'}>
                  {step.status === 'completed' ? 'Complete' : step.status === 'current' ? 'Current' : 'Pending'}
                </Badge>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Current Step Content */}
      <Card>
        <CardHeader>
          <CardTitle>Get Started as a Creator</CardTitle>
          <CardDescription>
            Join hundreds of successful YouTube creators who are raising funds through revenue sharing
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center space-y-2">
              <div className="bg-blue-100 rounded-full p-4 w-16 h-16 mx-auto flex items-center justify-center">
                <span className="text-2xl font-bold text-blue-600">1M+</span>
              </div>
              <h3 className="font-semibold">Minimum Subscribers</h3>
              <p className="text-sm text-gray-600">Established audience required</p>
            </div>
            <div className="text-center space-y-2">
              <div className="bg-green-100 rounded-full p-4 w-16 h-16 mx-auto flex items-center justify-center">
                <span className="text-2xl font-bold text-green-600">$5K+</span>
              </div>
              <h3 className="font-semibold">Monthly Revenue</h3>
              <p className="text-sm text-gray-600">Proven monetization track record</p>
            </div>
            <div className="text-center space-y-2">
              <div className="bg-purple-100 rounded-full p-4 w-16 h-16 mx-auto flex items-center justify-center">
                <span className="text-2xl font-bold text-purple-600">6mo+</span>
              </div>
              <h3 className="font-semibold">Channel Age</h3>
              <p className="text-sm text-gray-600">Consistent content creation</p>
            </div>
          </div>

          <div className="text-center space-y-4">
            <p className="text-gray-600">
              Ready to get started? Connect your Google account to verify your YouTube channel.
            </p>
            {!session ? (
              <Button size="lg" onClick={() => window.location.href = '/api/auth/signin'}>
                Sign In with Google
              </Button>
            ) : (
              <Button size="lg" onClick={() => setCurrentStep(2)}>
                Continue Setup
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Benefits Section */}
      <div className="bg-gray-50 rounded-lg p-8">
        <h2 className="text-2xl font-bold text-center mb-6">Why Creators Choose Our Platform</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <h3 className="font-semibold flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Keep Creative Control
            </h3>
            <p className="text-gray-600">Maintain full ownership and creative freedom of your channel</p>
          </div>
          <div className="space-y-2">
            <h3 className="font-semibold flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Upfront Capital
            </h3>
            <p className="text-gray-600">Get funding now for future growth and equipment</p>
          </div>
          <div className="space-y-2">
            <h3 className="font-semibold flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Fair Revenue Split
            </h3>
            <p className="text-gray-600">Set your own terms and percentage shares</p>
          </div>
          <div className="space-y-2">
            <h3 className="font-semibold flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Transparent Reporting
            </h3>
            <p className="text-gray-600">Automated revenue tracking and investor updates</p>
          </div>
        </div>
      </div>
    </div>
  );
}