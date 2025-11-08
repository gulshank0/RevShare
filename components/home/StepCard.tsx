interface StepCardProps {
  stepNumber: number;
  title: string;
  description: string;
  bgColor?: string;
  textColor?: string;
}

export function StepCard({ 
  stepNumber, 
  title, 
  description, 
  bgColor = "bg-red-600/10", 
  textColor = "text-red-600" 
}: StepCardProps) {
  return (
    <div className="text-center space-y-4 relative z-10">
      {/* Step number circle */}
      <div className="mx-auto w-12 h-12 bg-red-600 rounded-full flex items-center justify-center mb-6">
        <span className="text-white font-bold text-lg">{stepNumber}</span>
      </div>
      
      <div className="space-y-3">
        <h3 className="text-xl font-semibold text-white">{title}</h3>
        <p className="text-gray-400 leading-relaxed">{description}</p>
      </div>
    </div>
  );
}
