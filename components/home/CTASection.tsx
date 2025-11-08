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
    <section className="bg-zinc-950 py-20 px-4">
      <div className="max-w-4xl mx-auto text-center">
        <div className="space-y-6">
          <h2 className="text-3xl md:text-4xl font-bold text-white">
            {title}
          </h2>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto leading-relaxed">
            {description}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
            <Link href={buttonHref}>
              <Button className="youtube-button text-base px-8 py-3 h-auto">
                {buttonText}
              </Button>
            </Link>
            <Link href="/marketplace">
              <Button className="youtube-button-outline bg-zinc-500 text-base px-8 py-3 h-auto cursor-pointer">
                Browse Creators
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
