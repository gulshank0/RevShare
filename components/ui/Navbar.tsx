'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSession, signIn, signOut } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Menu, Video, Bell, User, Search } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function Navbar() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-zinc-950 border-b border-zinc-800/50">
      <div className="flex items-center justify-between h-16 px-4 max-w-7xl mx-auto">
        {/* Left section - Menu button (mobile) and Logo */}
        <div className="flex items-center space-x-4">
          {/* Mobile menu button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden p-2 hover:bg-zinc-800/50 rounded-lg transition-colors text-white"
          >
            <Menu className="w-5 h-5" />
          </button>
          
          <Link href="/" className="flex items-center space-x-2">
            <Video className="w-8 h-8 text-red-600" />
            <span className="text-2xl font-bold tracking-tight text-white">
              Creator<span className="text-red-600">Tube</span>
            </span>
          </Link>
        </div>

        {/* Center section - Navigation Links (desktop only) */}
        <nav className="hidden md:flex items-center space-x-6">
          <Link 
            href="/marketplace" 
            className="px-4 py-2 text-lg font-medium text-gray-300 hover:bg-zinc-800/50 hover:text-white rounded-lg transition-colors"
          >
            Marketplace
          </Link>
         
          <Link 
            href="/search" 
            className="px-4 py-2 text-lg font-medium text-gray-300 hover:bg-zinc-800/50 hover:text-white rounded-lg transition-colors flex items-center space-x-2"
          >
            <span>Search Your Creator</span>
            <Search className="w-5 h-5" />
          </Link>
 <Link
            href="/channels-market"
            className="px-4 py-2 text-lg font-medium text-gray-300 hover:bg-zinc-800/50 hover:text-white rounded-lg transition-colors"
          >
            Channels Market
          </Link>
          {session?.user?.role === 'CREATOR' && (
            <Link 
              href="/dashboard/creator" 
              className="px-4 py-2 text-sm font-medium text-gray-300 hover:bg-zinc-800/50 hover:text-white rounded-lg transition-colors"
            >
              Creator Studio
            </Link>
          )}
          {session?.user?.role === 'INVESTOR' && (
            <Link 
              href="/dashboard/investor" 
              className="px-4 py-2 text-lg font-medium text-gray-300 hover:bg-zinc-800/50 hover:text-white rounded-lg transition-colors"
            >
              Portfolio
            </Link>
          )}
        </nav>

        {/* Right section - Auth Section */}
        <div className="flex items-center space-x-3">
          {(() => {
            if (status === 'loading') {
              return <div className="w-8 h-8 bg-zinc-800/50 rounded-full animate-pulse"></div>;
            }
            
            if (session) {
              return (
                <div className="flex items-center space-x-3">
                  <button className="p-2 hover:bg-zinc-800/50 rounded-full transition-colors text-gray-300 hover:text-white">
                    <Bell className="w-5 h-5" />
                  </button>
                  <div className="relative group">
                    <button className="w-9 h-9 bg-red-600 rounded-full flex items-center justify-center text-sm font-medium hover:bg-red-700 transition-colors text-white">
                      {session.user?.name?.[0]?.toUpperCase() || <User className="w-4 h-4" />}
                    </button>
                    <div className="absolute right-0 top-full mt-2 w-48 bg-zinc-900 border border-zinc-700/50 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                      <div className="p-3 border-b border-zinc-700/50">
                        <div className="text-sm font-medium truncate text-white">{session.user?.name}</div>
                        <div className="text-xs text-gray-400 truncate">{session.user?.email}</div>
                      </div>
                      <button
                        onClick={() => signOut()}
                        className="w-full px-3 py-2 text-left text-sm text-gray-300 hover:bg-zinc-800/50 hover:text-white rounded-b-lg transition-colors"
                      >
                        Sign out
                      </button>
                    </div>
                  </div>
                </div>
              );
            }
            
            return (
              <div className="flex items-center space-x-3">
                <Button 
                  variant="outline" 
                  onClick={() => router.push('/auth/signin')}
                  className="text-lg text-gray-300 h-9 border-zinc-700/50 bg-transparent hover:bg-zinc-800/50 hover:text-white cursor-pointer"
                >
                  Sign In
                </Button>
                <Link href="/creator/onboard">
                  <Button className="bg-red-600 hover:bg-red-700 text-white text-lg h-9 cursor-pointer">
                    Create Channel
                  </Button>
                </Link>
              </div>
            );
          })()}
        </div>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden bg-zinc-950 border-t border-zinc-800/50">
          <nav className="px-4 py-2 space-y-1">
            <Link
              href="/marketplace"
              className="block px-3 py-2 text-sm font-medium text-gray-300 hover:bg-zinc-800/50 hover:text-white rounded-lg transition-colors"
              onClick={() => setIsMenuOpen(false)}
            >
              Marketplace
            </Link>
            <Link
              href="/search"
              className="block px-3 py-2 text-sm font-medium text-gray-300 hover:bg-zinc-800/50 hover:text-white rounded-lg transition-colors"
              onClick={() => setIsMenuOpen(false)}
            >
              Search Your Creator
            </Link>
            {session?.user?.role === 'CREATOR' && (
              <Link
                href="/dashboard/creator"
                className="block px-3 py-2 text-sm font-medium text-gray-300 hover:bg-zinc-800/50 hover:text-white rounded-lg transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                Creator Studio
              </Link>
            )}
            {session?.user?.role === 'INVESTOR' && (
              <Link
                href="/dashboard/investor"
                className="block px-3 py-2 text-sm font-medium text-gray-300 hover:bg-zinc-800/50 hover:text-white rounded-lg transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                Portfolio
              </Link>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}