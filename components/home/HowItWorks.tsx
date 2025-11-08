import { StepCard } from "./StepCard";

export function HowItWorks() {
  const steps = [
    {
      stepNumber: 1,
      title: "Browse & Research",
      description: "Explore creator profiles, revenue history, and growth metrics",
      bgColor: "bg-red-600/10",
      textColor: "text-red-600"
    },
    {
      stepNumber: 2,
      title: "Invest",
      description: "Purchase revenue shares with secure payment processing",
      bgColor: "bg-red-600/10",
      textColor: "text-red-600"
    },
    {
      stepNumber: 3,
      title: "Earn Returns",
      description: "Receive monthly payouts based on channel performance",
      bgColor: "bg-red-600/10",
      textColor: "text-red-600"
    }
  ];

  return (
    <section className="bg-zinc-900 py-16 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            How It Works
          </h2>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Start earning from YouTube creators in three simple steps
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          {/* Connection lines for desktop */}
          <div className="hidden md:block absolute top-16 left-1/6 right-1/6 h-0.5 bg-gray-700"></div>
          
          {steps.map((step, index) => (
            <StepCard key={index} {...step} />
          ))}
        </div>
      </div>
    </section>
  );
}
