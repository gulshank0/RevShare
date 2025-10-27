import Navbar from "@/components/ui/Navbar";
import { HeroSection } from "@/components/home/HeroSection";
import { FeaturesGrid } from "@/components/home/FeaturesGrid";
import { HowItWorks } from "@/components/home/HowItWorks";
import { CTASection } from "@/components/home/CTASection";

export default function Home() {
  return (
    <div className="space-y-16">
      
      <HeroSection />
      
      <FeaturesGrid />
      
      <HowItWorks />
      
      <CTASection />
    </div>
  );
}
