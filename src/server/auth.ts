/**
 * Auth.js v5 (NextAuth) configuration for the blog platform.
 * Uses credentials provider with bcrypt password validation.
 */
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/server/db/prisma";
import bcrypt from "bcrypt";
import type { UserRole } from "@/features/auth/types";

declare module "next-auth" {
  interface User {
    role: UserRole;
    username: string;
  }
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      image?: string | null;
      role: UserRole;
      username: string;
    };
  }
}

declare module "next-auth" {
  interface JWT {
    id: string;
    role: UserRole;
    username: string;
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma) as any,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        captchaToken: { label: "Captcha", type: "text" },
        captchaType: { label: "CaptchaType", type: "text" },
        captchaId: { label: "CaptchaId", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const email = (credentials.email as string).toLowerCase().trim();
        const password = credentials.password as string;
        const captchaToken = credentials.captchaToken as string | undefined;
        const captchaType = credentials.captchaType as string | undefined;
        const captchaId = credentials.captchaId as string | undefined;

        // Verify CAPTCHA — reject if token is missing or invalid
        try {
          const captchaRes = await fetch(
            `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/api/captcha/verify`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                captchaToken: captchaToken || "",
                captchaType: captchaType || undefined,
                captchaId: captchaId || undefined,
              }),
            },
          );
          const captchaData = await captchaRes.json();
          if (!captchaData.success) return null;
        } catch {
          // If captcha service is unavailable, deny login
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email },
        });

        if (!user) {
          return null;
        }

        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!passwordMatch) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.displayName || user.username,
          role: user.role as UserRole,
          username: user.username,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.role = (user as any).role;
        token.username = (user as any).username;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.role = token.role as UserRole;
        session.user.username = token.username as string;
      }
      return session;
    },
    async authorized({ auth, request }) {
      const isAdmin = request.nextUrl.pathname.startsWith("/admin");
      if (isAdmin) {
        if (!auth?.user) return false;
        const role = (auth.user as any).role;
        return role === "ADMINISTRATOR" || role === "SUPER_ADMIN";
      }
      return true;
    },
  },
});
