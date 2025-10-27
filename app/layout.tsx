import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/auth/AuthProvider";
import Navbar from "@/components/ui/Navbar";
import { Toaster } from "@/components/ui/toaster";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "YouTube Revenue Share Platform",
  description: "Invest in YouTube creators and share in their success",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          {/* Dark pattern background */}
          <div className="fixed inset-0 bg-dark-pattern bg-floating-elements -z-10"></div>
          
          {/* Dark floating decorative elements */}
          <div className="fixed top-20 left-1/4 w-32 h-32 bg-gray-800/30 rounded-full blur-xl animate-pulse-glow -z-10"></div>
          <div className="fixed bottom-20 right-1/3 w-40 h-40 bg-gray-700/20 rounded-full blur-xl animate-pulse-glow -z-10" style={{animationDelay: '1.5s'}}></div>
          <div className="fixed top-1/2 right-10 w-24 h-24 bg-gray-900/40 rounded-full blur-xl animate-pulse-glow -z-10" style={{animationDelay: '3s'}}></div>
          
          <div className="relative z-10 min-h-screen">
            <div className="space-y-18">
              <Navbar />
              <main className="container mx-auto px-4 py-8">
                {children}
              </main>
            </div>
            <Toaster />
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
