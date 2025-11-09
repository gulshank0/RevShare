import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Play, TrendingUp, Users, DollarSign } from "lucide-react";

export function HeroSection() {
  return (
    <section className="relative bg-zinc-950 py-20 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center space-y-8">
          <div className="space-y-4">
            <h1 className="text-4xl md:text-7xl font-bold text-white leading-tight">
              Invest in YouTube <span className="text-red-600">Creators</span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
              Join the creator economy revolution. Buy revenue shares in successful YouTube channels 
              and earn returns as they grow their audience and monetization.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link href="/marketplace">
              <Button className="youtube-button text-xl px-8 py-3 h-auto">
                Browse Opportunities with Searches
              </Button>
            </Link>
            <Link href="/creator/onboard">
              <Button className="youtube-button-outline text-xl px-8 py-3 h-auto bg-zinc-600 hover:bg-zinc-500">
                List Your YouTube Channel
              </Button>
            </Link>
          </div>

          {/* Stats Section - YouTube Style */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16 max-w-4xl mx-auto">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 bg-red-600/10 rounded-full flex items-center justify-center mx-auto">
                <TrendingUp className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-2xl font-bold text-white">$1M+</h3>
              <p className="text-gray-400">Total Investment Volume</p>
            </div>
            <div className="text-center space-y-2">
              <div className="w-12 h-12 bg-red-600/10 rounded-full flex items-center justify-center mx-auto">
                <Users className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-2xl font-bold text-white">50+</h3>
              <p className="text-gray-400">Active Creators</p>
            </div>
            <div className="text-center space-y-2">
              <div className="w-12 h-12 bg-red-600/10 rounded-full flex items-center justify-center mx-auto">
                <DollarSign className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-2xl font-bold text-white">15%</h3>
              <p className="text-gray-400">Average Annual Return</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
