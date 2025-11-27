import { type NextAuthOptions, type Session, type User } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import type { AdapterUser } from "next-auth/adapters";

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
          scope: "openid email profile"
        }
      }
    }),
  ],
  callbacks: {
    async session({ session, user }: { session: Session; user: User | AdapterUser }) {
      if (session?.user && user) {
        session.user.id = user.id;
        
        // Fetch the latest user data from database
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: user.id },
            select: { 
              id: true,
              role: true, 
              kycStatus: true, 
              name: true, 
              email: true, 
              image: true 
            }
          });
          
          if (dbUser) {
            session.user.role = dbUser.role;
            session.user.kycStatus = dbUser.kycStatus;
            session.user.name = dbUser.name;
            session.user.email = dbUser.email;
            session.user.image = dbUser.image;
          }
        } catch (error) {
          console.error("Error fetching user data in session callback:", error);
        }
      }
      return session;
    },
    
    async signIn({ user, account, profile }: { user: User | AdapterUser; account: any; profile?: any }) {
      if (!user.email) {
        console.error("No email provided in sign in");
        return false;
      }

      try {
        if (account?.provider === "google") {
          console.log("Google sign in for:", user.email);
          
          // Check if user already exists
          const existingUser = await prisma.user.findUnique({
            where: { email: user.email }
          });

          if (existingUser) {
            console.log("Updating existing user:", user.email);
            // Update existing user's profile information
            await prisma.user.update({
              where: { email: user.email },
              data: {
                name: user.name || existingUser.name,
                image: user.image || existingUser.image,
                emailVerified: new Date(),
              },
            });
          } else {
            console.log("Creating new user:", user.email);
            // Let PrismaAdapter handle user creation, then update with defaults
            return true;
          }
        }
        return true;
      } catch (error) {
        console.error("Error in signIn callback:", error);
        return `/auth/error?error=SignInCallbackError`;
      }
    },
  },
  events: {
    async createUser({ user }) {
      console.log("CreateUser event fired for:", user.email);
      // This event fires when PrismaAdapter creates a new user
      try {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            role: 'INVESTOR',
            kycStatus: 'PENDING',
            emailVerified: new Date(),
          },
        });
        console.log("User defaults set successfully for:", user.email);
      } catch (error) {
        console.error("Error setting default user values in createUser event:", error);
      }
    },
    async signIn({ user, account, profile, isNewUser }) {
      console.log("SignIn event:", { user: user.email, provider: account?.provider });
    },
    async session({ session }) {
      console.log("Session event for:", session?.user?.email);
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
  debug: process.env.NODE_ENV === 'development',
  secret: process.env.NEXTAUTH_SECRET,
};
