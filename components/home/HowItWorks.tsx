import { StepCard } from "./StepCard";

export function HowItWorks() {
  const steps = [
    {
      stepNumber: 1,
      title: "Browse & Research",
      description: "Explore creator profiles, revenue history, and growth metrics",
      bgColor: "bg-blue-100",
      textColor: "text-blue-600"
    },
    {
      stepNumber: 2,
      title: "Invest",
      description: "Purchase revenue shares with secure payment processing",
      bgColor: "bg-green-100",
      textColor: "text-green-600"
    },
    {
      stepNumber: 3,
      title: "Earn Returns",
      description: "Receive monthly payouts based on channel performance",
      bgColor: "bg-purple-100",
      textColor: "text-purple-600"
    }
  ];

  return (
    <section className="relative space-y-8 py-16">
      {/* Dark background elements */}
      <div className="absolute inset-0 bg-gray-900/10 rounded-3xl"></div>
      <div className="absolute top-0 left-1/4 w-32 h-32 bg-gray-800/20 rounded-full blur-2xl"></div>
      <div className="absolute bottom-0 right-1/4 w-40 h-40 bg-gray-700/15 rounded-full blur-2xl"></div>
      
      {/* Connection lines between steps */}
      <div className="absolute top-1/2 left-1/4 right-1/4 h-px bg-gray-600/30 transform -translate-y-1/2 hidden md:block"></div>
      
      <div className="relative z-10">
        <h2 className="text-3xl font-bold text-center text-white drop-shadow-lg">How It Works</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {steps.map((step, index) => (
            <StepCard key={index} {...step} />
          ))}
        </div>
      </div>
    </section>
  );
}
