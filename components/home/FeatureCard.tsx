import { LucideIcon } from "lucide-react";

interface FeatureCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  iconColor?: string;
}

export function FeatureCard({ icon: Icon, title, description, iconColor = "text-red-600" }: FeatureCardProps) {
  return (
    <div className="youtube-card p-6 group cursor-pointer">
      <div className="space-y-4">
        <div className="w-12 h-12 bg-red-600/10 rounded-full flex items-center justify-center group-hover:bg-red-600/20 transition-colors duration-200">
          <Icon className={`h-6 w-6 ${iconColor}`} />
        </div>
        
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-white group-hover:text-red-400 transition-colors duration-200">
            {title}
          </h3>
          <p className="text-gray-400 text-sm leading-relaxed">
            {description}
          </p>
        </div>
      </div>
    </div>
  );
}
