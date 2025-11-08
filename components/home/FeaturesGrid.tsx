import { TrendingUp, Shield, Users, DollarSign } from "lucide-react";
import { FeatureCard } from "./FeatureCard";

export function FeaturesGrid() {
  const features = [
    {
      icon: TrendingUp,
      title: "Revenue Sharing",
      description: "Earn monthly returns based on actual YouTube revenue performance",
      iconColor: "text-red-600"
    },
    {
      icon: Shield,
      title: "Secure & Compliant",
      description: "Full KYC/AML compliance with transparent revenue verification",
      iconColor: "text-red-600"
    },
    {
      icon: Users,
      title: "Creator Network",
      description: "Access vetted creators with proven track records and growth potential",
      iconColor: "text-red-600"
    },
    {
      icon: DollarSign,
      title: "Flexible Investment",
      description: "Start with as little as $100 and build a diversified creator portfolio",
      iconColor: "text-red-600"
    }
  ];

  return (
    <section className="bg-zinc-950 py-16 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Why Choose CreatorTube?
          </h2>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            The most trusted platform for creator investments with transparent returns and secure transactions
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <FeatureCard key={index} {...feature} />
          ))}
        </div>
      </div>
    </section>
  );
}
