import Link from "next/link";
import { Button } from "@/components/ui/button";

export function HeroSection() {
  return (
    <section className="relative text-center space-y-8 py-20">
      {/* Dark background overlay */}
      <div className="absolute inset-0 bg-black/20 rounded-3xl"></div>
      
      {/* Dark floating elements */}
      <div className="absolute top-10 left-10 w-16 h-16 bg-gray-800/40 rounded-xl rotate-12 animate-pulse-glow"></div>
      <div className="absolute top-20 right-20 w-12 h-12 bg-gray-700/30 rounded-full animate-bounce" style={{animationDelay: '0.5s'}}></div>
      <div className="absolute bottom-10 left-1/3 w-8 h-8 bg-gray-600/50 rounded-lg rotate-45 animate-pulse" style={{animationDelay: '1s'}}></div>
      
      {/* Dark play button icon */}
      <div className="absolute top-1/2 right-1/4 transform -translate-y-1/2">
        <div className="w-20 h-20 bg-gray-900/20 rounded-full flex items-center justify-center animate-pulse-glow">
          <div className="w-0 h-0 border-l-8 border-l-gray-400/60 border-y-6 border-y-transparent ml-1"></div>
        </div>
      </div>
      
      <div className="relative z-10">
        <h1 className="text-5xl font-bold text-white drop-shadow-lg">
          Invest in YouTube Creators
        </h1>
        <p className="text-xl text-gray-300 max-w-3xl mx-auto drop-shadow-md">
          Join the creator economy revolution. Buy revenue shares in successful YouTube channels 
          and earn returns as they grow their audience and monetization.
        </p>
        <div className="flex gap-4 justify-center">
          <Link href="/marketplace">
            <Button size="lg" className="bg-gray-100 text-gray-900 hover:bg-white shadow-lg">Browse Opportunities</Button>
          </Link>
          <Link href="/creator/onboard">
            <Button variant="outline" size="lg" className="border-gray-400 text-gray-300 hover:bg-gray-800 hover:text-white shadow-lg">List Your Channel</Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
