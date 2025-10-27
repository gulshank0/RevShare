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
  bgColor = "bg-blue-100", 
  textColor = "text-blue-600" 
}: StepCardProps) {
  return (
    <div className="text-center space-y-4 group hover:scale-105 transition-transform duration-300">
      {/* Dark animated step number */}
      <div className="relative mx-auto w-16 h-16">
        <div className="absolute inset-0 bg-gray-800/20 backdrop-blur-sm rounded-full animate-pulse-glow"></div>
        <div className={`relative ${bgColor} rounded-full p-4 w-16 h-16 flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow duration-300 bg-opacity-80 backdrop-blur-sm`}>
          <span className={`text-2xl font-bold ${textColor} group-hover:scale-110 transition-transform duration-300`}>{stepNumber}</span>
        </div>
      </div>
      
      <h3 className="text-xl font-semibold text-white drop-shadow-md group-hover:text-gray-200 transition-colors duration-300">{title}</h3>
      <p className="text-gray-300 group-hover:text-gray-400 transition-colors duration-300">{description}</p>
      
      {/* Dark floating indicator dot */}
      <div className="w-2 h-2 bg-gray-600/40 rounded-full mx-auto group-hover:animate-pulse"></div>
    </div>
  );
}
