import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import type { Session, User } from "next-auth";
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
}

export const authOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      authorization: {
        params: {
          scope: "openid email profile https://www.googleapis.com/auth/youtube.readonly"
        }
      }
    }),
  ],
  callbacks: {
    async session({ session, user }: { session: Session; user: User | AdapterUser }) {
      if (session?.user) {
        session.user.id = user.id;
        // Fetch the latest user data from database
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: user.id },
            select: { role: true, kycStatus: true, name: true, email: true }
          });
          
          if (dbUser) {
            session.user.role = dbUser.role;
            session.user.kycStatus = dbUser.kycStatus;
            session.user.name = dbUser.name;
            session.user.email = dbUser.email;
          }
        } catch (error) {
          console.error("Error fetching user data in session callback:", error);
        }
      }
      return session;
    },
    async signIn({ user, account, profile }) {
      try {
        // The PrismaAdapter will handle user creation automatically
        // This callback is just for additional processing
        if (account?.provider === "google" && user.id) {
          // Update or create account with OAuth tokens
          await prisma.account.upsert({
            where: {
              provider_providerAccountId: {
                provider: account.provider,
                providerAccountId: account.providerAccountId,
              },
            },
            update: {
              access_token: account.access_token,
              refresh_token: account.refresh_token,
              expires_at: account.expires_at,
              token_type: account.token_type,
              scope: account.scope,
              id_token: account.id_token,
            },
            create: {
              userId: user.id,
              type: account.type,
              provider: account.provider,
              providerAccountId: account.providerAccountId,
              access_token: account.access_token,
              refresh_token: account.refresh_token,
              expires_at: account.expires_at,
              token_type: account.token_type,
              scope: account.scope,
              id_token: account.id_token,
            },
          });
        }
        return true;
      } catch (error) {
        console.error("Error in signIn callback:", error);
        return false;
      }
    },
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  session: {
    strategy: "database" as const,
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  debug: process.env.NODE_ENV === 'development',
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };