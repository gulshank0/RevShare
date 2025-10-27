import { TrendingUp, Shield, Users, DollarSign } from "lucide-react";
import { FeatureCard } from "./FeatureCard";

export function FeaturesGrid() {
  const features = [
    {
      icon: TrendingUp,
      title: "Revenue Sharing",
      description: "Earn monthly returns based on actual YouTube revenue performance",
      iconColor: "text-blue-600"
    },
    {
      icon: Shield,
      title: "Secure & Compliant",
      description: "Full KYC/AML compliance with transparent revenue verification",
      iconColor: "text-green-600"
    },
    {
      icon: Users,
      title: "Creator Network",
      description: "Access vetted creators with proven track records and growth potential",
      iconColor: "text-purple-600"
    },
    {
      icon: DollarSign,
      title: "Flexible Investment",
      description: "Start with as little as $100 and build a diversified creator portfolio",
      iconColor: "text-orange-600"
    }
  ];

  return (
    <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {features.map((feature, index) => (
        <FeatureCard key={index} {...feature} />
      ))}
    </section>
  );
}
