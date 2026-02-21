/**
 * Auth.js v5 (NextAuth) configuration for the blog platform.
 * Uses credentials provider with bcrypt password validation.
 */
import NextAuth from "next-auth";
import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/server/db/prisma";
import bcrypt from "bcrypt";
import { captchaVerificationService } from "@/server/wiring";
import type { UserRole } from "@/features/auth/types";
import type { CaptchaProviderType } from "@/features/captcha/types";

declare module "next-auth" {
  interface User {
    role: UserRole;
    username: string;
    customCapabilities: string[];
  }
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      image?: string | null;
      role: UserRole;
      username: string;
      customCapabilities: string[];
      displayName?: string | null;
      bio?: string | null;
      website?: string | null;
    };
  }
}

declare module "next-auth" {
  interface JWT {
    id: string;
    role: UserRole;
    username: string;
    customCapabilities: string[];
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma) as NextAuthConfig["adapter"],
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
        let captchaRequired = false;
        try {
          const captchaSettings = await prisma.captchaSettings.findFirst();
          if (captchaSettings) {
            if (
              captchaSettings.captchaEnabled &&
              captchaSettings.requireCaptchaForLogin
            ) {
              captchaRequired = true;
            }
          }
        } catch {
          // If we can't read settings, default to NOT requiring captcha
        }

        // Verify CAPTCHA — direct service call (no self-fetch HTTP)
        if (captchaRequired) {
          try {
            const captchaResult = await captchaVerificationService.verify({
              token: captchaToken || "",
              clientIp: "127.0.0.1", // IP not available in authorize(); middleware handles rate-limiting
              captchaType: captchaType as CaptchaProviderType | undefined,
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
          customCapabilities: (user.customCapabilities ?? []) as string[],
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.role = user.role;
        token.username = user.username;
        token.customCapabilities = user.customCapabilities ?? [];
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.role = token.role as UserRole;
        session.user.username = token.username as string;
        session.user.customCapabilities = (token.customCapabilities ??
          []) as string[];
      }
      return session;
    },
    async authorized({ auth, request }) {
      const isAdmin = request.nextUrl.pathname.startsWith("/admin");
      if (isAdmin) {
        if (!auth?.user) return false;
        const role = auth.user.role;
        // ADM-001: Allow EDITOR role to access admin panel
        return (
          role === "EDITOR" ||
          role === "ADMINISTRATOR" ||
          role === "SUPER_ADMIN"
        );
      }
      return true;
    },
  },
});
