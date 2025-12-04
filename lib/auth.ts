import { type NextAuthOptions, type Session, type User } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import type { AdapterUser } from "next-auth/adapters";

// Type augmentation for NextAuth session and user
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role?: string | null;
      kycStatus?: string | null;
    };
  }
  
  interface User {
    id: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
    role?: string | null;
    kycStatus?: string | null;
  }
}

// Helper function to safely log only in development
const devLog = (message: string, ...args: unknown[]) => {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Auth] ${message}`, ...args);
  }
};

// Helper function to determine KYC status based on submitted data
const determineKycStatus = (kycData: unknown, dbKycStatus: string | null): string => {
  const data = kycData as Record<string, unknown> | null;
  const hasSubmittedKyc = data && 
    typeof data === 'object' && 
    data.firstName && 
    data.lastName && 
    data.submittedAt;
  
  if (hasSubmittedKyc && dbKycStatus) {
    return dbKycStatus;
  }
  return 'NOT_SUBMITTED';
};

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
          // Basic OAuth scopes - additional scopes (like YouTube) should be requested
          // separately when specific features require them
          scope: "openid email profile"
        }
      }
    }),
  ],
  callbacks: {
    async session({ session, user }: { session: Session; user: User | AdapterUser }) {
      if (session?.user && user) {
        session.user.id = user.id;
        
        // Fetch the latest user data from database to ensure session is always current
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: user.id },
            select: { 
              id: true,
              role: true, 
              kycStatus: true, 
              kycData: true,
              name: true, 
              email: true, 
              image: true 
            }
          });
          
          if (dbUser) {
            session.user.role = dbUser.role;
            session.user.kycStatus = determineKycStatus(dbUser.kycData, dbUser.kycStatus);
            session.user.name = dbUser.name;
            session.user.email = dbUser.email;
            session.user.image = dbUser.image;
          }
        } catch (error) {
          // Log error but don't fail the session - use default values from OAuth provider
          devLog('Error fetching user data in session callback:', error);
        }
      }
      return session;
    },
    
    async signIn({ user, account }: { user: User | AdapterUser; account: any; profile?: any }) {
      // Email is required for authentication
      if (!user.email) {
        devLog('Sign in rejected: No email provided');
        return false;
      }

      try {
        // Handle OAuth provider sign-in
        if (account?.provider) {
          devLog(`OAuth sign in via ${account.provider} for: ${user.email}`);
          
          const existingUser = await prisma.user.findUnique({
            where: { email: user.email }
          });

          if (existingUser) {
            // Update existing user's profile with latest OAuth data
            // Preserve existing values if OAuth doesn't provide new ones
            await prisma.user.update({
              where: { email: user.email },
              data: {
                name: user.name || existingUser.name,
                image: user.image || existingUser.image,
                emailVerified: existingUser.emailVerified || new Date(),
              },
            });
            devLog(`Updated existing user: ${user.email}`);
          }
          // For new users, PrismaAdapter handles creation
          // The createUser event will set default values
        }
        
        return true;
      } catch (error) {
        devLog('Error in signIn callback:', error);
        // Return error page URL for user-friendly error display
        return `/auth/error?error=SignInCallbackError`;
      }
    },
  },
  events: {
    async createUser({ user }) {
      devLog(`New user created: ${user.email}`);
      // Set default values for newly created users
      // Users start as INVESTOR with no KYC submission
      // They can later upgrade to CREATOR by registering a channel
      try {
        // Also create a wallet for the new user
        await prisma.$transaction(async (tx) => {
          await tx.user.update({
            where: { id: user.id },
            data: {
              role: 'INVESTOR',
              kycStatus: 'PENDING',
              emailVerified: new Date(),
            },
          });
          
          // Create wallet for the user
          await tx.wallet.upsert({
            where: { userId: user.id },
            create: {
              userId: user.id,
              balance: 0,
              pendingBalance: 0,
              lockedBalance: 0,
              currency: 'USD',
            },
            update: {}, // No update needed if exists
          });
        });
        
        devLog(`User defaults and wallet set for: ${user.email}`);
      } catch (error) {
        devLog('Error setting default user values:', error);
        // Don't throw - allow sign in to proceed, defaults can be set later
      }
    },
    async signIn({ user, account, isNewUser }) {
      devLog(`Sign in event: ${user.email} via ${account?.provider}${isNewUser ? ' (new user)' : ''}`);
    },
    async session({ session }) {
      devLog(`Session refreshed: ${session?.user?.email}`);
    },
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  session: {
    strategy: "database" as const,
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60, // 24 hours
  },
  // Only enable debug logging in development
  debug: process.env.NODE_ENV === 'development',
  secret: process.env.NEXTAUTH_SECRET,
};

// Export helper for checking if user has specific role
export const hasRole = (session: Session | null, role: string): boolean => {
  return session?.user?.role === role;
};

// Export helper for checking if user has completed KYC
export const hasCompletedKyc = (session: Session | null): boolean => {
  return session?.user?.kycStatus === 'VERIFIED';
};

// Export helper for checking if user is admin
export const isAdmin = (session: Session | null): boolean => {
  return hasRole(session, 'ADMIN');
};
