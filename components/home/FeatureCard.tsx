import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface FeatureCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  iconColor?: string;
}

export function FeatureCard({ icon: Icon, title, description, iconColor = "text-blue-600" }: FeatureCardProps) {
  return (
    <Card className="relative overflow-hidden group hover:scale-105 transition-all duration-300 bg-gray-900/30 backdrop-blur-sm border-gray-700/40 hover:bg-gray-800/40">
      {/* Dark background effect */}
      <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
      
      {/* Dark floating icon background */}
      <div className="absolute top-4 right-4 w-8 h-8 bg-gray-700/20 rounded-full group-hover:scale-150 transition-transform duration-500"></div>
      
      <CardHeader className="relative z-10">
        <div className="flex items-center justify-between">
          <Icon className={`h-10 w-10 ${iconColor} group-hover:scale-110 transition-transform duration-300`} />
          <div className="w-2 h-2 bg-gray-500/40 rounded-full group-hover:animate-pulse"></div>
        </div>
        <CardTitle className="text-white group-hover:text-gray-200 transition-colors duration-300">{title}</CardTitle>
      </CardHeader>
      <CardContent className="relative z-10">
        <CardDescription className="text-gray-300 group-hover:text-gray-400 transition-colors duration-300">{description}</CardDescription>
      </CardContent>
    </Card>
  );
}
