import Link from "next/link";
import { Button } from "@/components/ui/button";

interface CTASectionProps {
  title?: string;
  description?: string;
  buttonText?: string;
  buttonHref?: string;
}

export function CTASection({
  title = "Ready to Get Started?",
  description = "Join thousands of investors supporting the next generation of creators",
  buttonText = "Create Your Account",
  buttonHref = "/auth/signup"
}: CTASectionProps) {
  return (
    <section className="relative bg-gray-900/40 backdrop-blur-sm rounded-lg p-8 text-center text-white border border-gray-700/40 overflow-hidden">
      {/* Dark floating geometric shapes */}
      <div className="absolute top-4 left-8 w-12 h-12 bg-gray-700/30 rounded-lg rotate-45 animate-pulse-glow"></div>
      <div className="absolute bottom-6 right-10 w-8 h-8 bg-gray-600/40 rounded-full animate-bounce" style={{animationDelay: '1s'}}></div>
      <div className="absolute top-1/2 left-6 w-6 h-6 bg-gray-800/50 rounded-full animate-pulse" style={{animationDelay: '2s'}}></div>
      
      {/* Dark background overlay */}
      <div className="absolute inset-0 bg-black/10 rounded-lg"></div>
      
      <div className="relative z-10">
        <h2 className="text-3xl font-bold mb-4 text-white drop-shadow-lg">{title}</h2>
        <p className="text-xl mb-6 text-gray-300">{description}</p>
        <Link href={buttonHref}>
          <Button size="lg" className="bg-gray-200 text-gray-900 hover:bg-white shadow-lg hover:shadow-xl transition-all duration-300">
            {buttonText}
          </Button>
        </Link>
      </div>
    </section>
  );
}
