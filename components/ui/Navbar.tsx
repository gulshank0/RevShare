'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSession, signIn, signOut } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Menu, X, TrendingUp } from 'lucide-react';

export default function Navbar() {
  const { data: session, status } = useSession();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 bg-white/70 backdrop-blur-md shadow-lg border-b border-white/20">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2 group">
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 shadow-lg group-hover:shadow-blue-500/50 transition-all duration-300 group-hover:scale-110">
              <TrendingUp className="h-6 w-6 text-white" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
              CreatorShare
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-2">
            <Link 
              href="/marketplace" 
              className="px-4 py-2 rounded-lg text-gray-700 hover:text-blue-600 hover:bg-white/50 transition-all duration-200 font-medium"
            >
              Marketplace
            </Link>
            <Link 
              href="/how-it-works" 
              className="px-4 py-2 rounded-lg text-gray-700 hover:text-blue-600 hover:bg-white/50 transition-all duration-200 font-medium"
            >
              How It Works
            </Link>
            {session?.user?.role === 'CREATOR' && (
              <Link 
                href="/creator/dashboard" 
                className="px-4 py-2 rounded-lg text-gray-700 hover:text-blue-600 hover:bg-white/50 transition-all duration-200 font-medium"
              >
                Creator Dashboard
              </Link>
            )}
            {session?.user?.role === 'INVESTOR' && (
              <Link 
                href="/investor/dashboard" 
                className="px-4 py-2 rounded-lg text-gray-700 hover:text-blue-600 hover:bg-white/50 transition-all duration-200 font-medium"
              >
                Portfolio
              </Link>
            )}
          </div>

          {/* Auth Section */}
          <div className="hidden md:flex items-center space-x-3">
            {status === 'loading' ? (
              <div className="animate-pulse bg-gradient-to-r from-gray-200 to-gray-300 h-10 w-24 rounded-lg"></div>
            ) : session ? (
              <div className="flex items-center space-x-3">
                <div className="px-4 py-2 rounded-lg bg-white/50 backdrop-blur-sm border border-white/30 shadow-sm">
                  <span className="text-sm font-medium text-gray-700">
                    Welcome, <span className="text-blue-600">{session.user?.name}</span>
                  </span>
                </div>
                <Button 
                  variant="outline" 
                  onClick={() => signOut()}
                  className="border-gray-300 hover:border-blue-500 hover:text-blue-600 hover:bg-white/80 transition-all duration-200 shadow-sm hover:shadow-md"
                >
                  Sign Out
                </Button>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Button 
                  variant="outline" 
                  onClick={() => signIn()}
                  className="border-gray-300 hover:border-blue-500 hover:text-blue-600 hover:bg-white/80 transition-all duration-200 shadow-sm hover:shadow-md"
                >
                  Sign In
                </Button>
                <Link href="/creator/onboard">
                  <Button className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg hover:shadow-blue-500/50 transition-all duration-300 hover:scale-105">
                    List Your Channel
                  </Button>
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden p-2 rounded-lg hover:bg-white/50 transition-all duration-200"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X className="h-6 w-6 text-gray-700" /> : <Menu className="h-6 w-6 text-gray-700" />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden py-4 space-y-2 border-t border-white/20">
            <Link
              href="/marketplace"
              className="block px-4 py-2.5 rounded-lg text-gray-700 hover:text-blue-600 hover:bg-white/50 transition-all duration-200 font-medium"
              onClick={() => setIsMenuOpen(false)}
            >
              Marketplace
            </Link>
            <Link
              href="/how-it-works"
              className="block px-4 py-2.5 rounded-lg text-gray-700 hover:text-blue-600 hover:bg-white/50 transition-all duration-200 font-medium"
              onClick={() => setIsMenuOpen(false)}
            >
              How It Works
            </Link>
            {session ? (
              <>
                {session.user?.role === 'CREATOR' && (
                  <Link
                    href="/dashboard/creator"
                    className="block px-4 py-2.5 rounded-lg text-gray-700 hover:text-blue-600 hover:bg-white/50 transition-all duration-200 font-medium"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Creator Dashboard
                  </Link>
                )}
                {session.user?.role === 'INVESTOR' && (
                  <Link
                    href="/dashboard/investor"
                    className="block px-4 py-2.5 rounded-lg text-gray-700 hover:text-blue-600 hover:bg-white/50 transition-all duration-200 font-medium"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Portfolio
                  </Link>
                )}
                <div className="px-4 py-2.5 rounded-lg bg-white/30 backdrop-blur-sm border border-white/30">
                  <span className="text-sm text-gray-600">
                    Welcome, <span className="text-blue-600 font-medium">{session.user?.name}</span>
                  </span>
                </div>
                <button
                  onClick={() => {
                    signOut();
                    setIsMenuOpen(false);
                  }}
                  className="block w-full text-left px-4 py-2.5 rounded-lg text-gray-700 hover:text-red-600 hover:bg-white/50 transition-all duration-200 font-medium"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => {
                    signIn();
                    setIsMenuOpen(false);
                  }}
                  className="block w-full text-left px-4 py-2.5 rounded-lg text-gray-700 hover:text-blue-600 hover:bg-white/50 transition-all duration-200 font-medium"
                >
                  Sign In
                </button>
                <Link
                  href="/creator/onboard"
                  className="block px-4 py-2.5 rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 text-white font-medium text-center shadow-lg hover:shadow-blue-500/50 transition-all duration-300"
                  onClick={() => setIsMenuOpen(false)}
                >
                  List Your Channel
                </Link>
              </>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}