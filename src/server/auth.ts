/**
 * Auth.js v5 (NextAuth) configuration for the blog platform.
 * Uses credentials provider with bcrypt password validation.
 */
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/server/db/prisma";
import bcrypt from "bcrypt";
import { CaptchaVerificationService } from "@/features/captcha/server/verification.service";
import type { UserRole } from "@/features/auth/types";

// Direct captcha verification — no self-fetch HTTP call
const captchaService = new CaptchaVerificationService(prisma as any);

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

        // Check CaptchaSettings — respect the global kill-switch & per-form toggle
        let captchaRequired = true;
        try {
          const captchaSettings = await prisma.captchaSettings.findFirst();
          if (captchaSettings) {
            if (!captchaSettings.captchaEnabled || !captchaSettings.requireCaptchaForLogin) {
              captchaRequired = false;
            }
          }
        } catch {
          // If we can't read settings, default to requiring captcha
        }

        // Verify CAPTCHA — direct service call (no self-fetch HTTP)
        if (captchaRequired) {
          try {
            const captchaResult = await captchaService.verify({
              token: captchaToken || "",
              clientIp: "127.0.0.1", // IP not available in authorize(); middleware handles rate-limiting
              captchaType: captchaType as any,
              captchaId,
            });
            if (!captchaResult.success) return null;
          } catch {
            // If captcha service is unavailable, deny login
            return null;
          }
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
