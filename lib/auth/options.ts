import type { NextAuthConfig } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { findUserByEmail, upsertOAuthUser } from "@/lib/auth/user-service";
import { cookies, headers } from "next/headers";
import {
  DEFAULT_SUBSCRIPTION_PLAN,
  normalizeSubscriptionPlan,
} from "@/lib/billing/plans";

declare const EdgeRuntime: string | undefined;

const googleClientId = process.env.GOOGLE_CLIENT_ID ?? "";
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET ?? "";

const authProviders: NextAuthConfig["providers"] = [];

if (googleClientId && googleClientSecret) {
  authProviders.push(
    GoogleProvider({
      clientId: googleClientId,
      clientSecret: googleClientSecret,
    })
  );
} else {
  console.warn(
    "Google OAuth credentials are missing. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to enable Google login."
  );
}

export const authOptions: NextAuthConfig = {
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    ...authProviders,
    CredentialsProvider({
      name: "Email & Password",
      credentials: {
        email: { label: "Email", type: "text", placeholder: "you@example.com" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email =
          typeof credentials?.email === "string" ? credentials.email : "";
        const password =
          typeof credentials?.password === "string" ? credentials.password : "";

        if (!email || !password) {
          return null;
        }

        const user = await findUserByEmail(email);
        if (!user || !user.passwordHash) {
          return null;
        }

        const isValidPassword = await compare(password, user.passwordHash);

        if (!isValidPassword) {
          return null;
        }

        return {
          id: user.id,
          name: user.name ?? undefined,
          email: user.email,
          image: user.image ?? undefined,
          subscriptionPlan: user.subscriptionPlan,
          creditsRemaining: Number(user.creditsRemaining),
          trialEndsAt: user.trialEndsAt
            ? user.trialEndsAt.toISOString()
            : null,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      const isEdge =
        typeof EdgeRuntime !== "undefined" ||
        (typeof process !== "undefined" &&
          process.env.NEXT_RUNTIME === "edge");

      // In Edge (middleware) avoid Prisma and session mutations; just pass through token
      if (isEdge) {
        return token;
      }

      let dbUser = null;

      if (user?.email) {
        dbUser = await findUserByEmail(user.email);
      } else if (token.email) {
        dbUser = await findUserByEmail(token.email);
      }

      if (dbUser) {
        token.id = dbUser.id;
        token.name = dbUser.name ?? user?.name ?? token.name;
        token.email = dbUser.email;
        if (dbUser.image) {
          token.picture = dbUser.image;
        }
        token.subscriptionPlan = dbUser.subscriptionPlan;
        token.creditsRemaining = Number(dbUser.creditsRemaining);
        token.trialEndsAt = dbUser.trialEndsAt
          ? dbUser.trialEndsAt.toISOString()
          : null;
        token.deviceSessionToken =
          typeof token.deviceSessionToken === "string"
            ? token.deviceSessionToken
            : undefined;
      } else {
        if (user?.id) {
          token.id = user.id;
        }
        if (user?.name) {
          token.name = user.name;
        }
        if (user?.email) {
          token.email = user.email;
        }
        if (!token.subscriptionPlan) {
          token.subscriptionPlan = DEFAULT_SUBSCRIPTION_PLAN;
        }
        if (typeof token.creditsRemaining !== "number") {
          token.creditsRemaining = 0;
        }
        if (typeof token.trialEndsAt !== "string") {
          token.trialEndsAt = null;
        }
      }

      // Create a device-scoped session token when missing (only on Node runtime)
      const hasDeviceToken =
        typeof token.deviceSessionToken === "string" &&
        token.deviceSessionToken.length > 0;

      if (!isEdge && !hasDeviceToken && dbUser?.id) {
        const { createUserSession } = await import(
          "@/lib/auth/session-service"
        );
        const cookieStore = await cookies();
        let deviceId =
          cookieStore.get("omnifaind_device_id")?.value ?? undefined;
        if (!deviceId) {
          deviceId =
            typeof crypto !== "undefined" && "randomUUID" in crypto
              ? crypto.randomUUID()
              : Math.random().toString(36).slice(2, 12);
          cookieStore.set("omnifaind_device_id", deviceId, {
            httpOnly: true,
            sameSite: "lax",
            secure: process.env.NODE_ENV === "production",
            path: "/",
            maxAge: 60 * 60 * 24 * 365, // persist for a year so device name sticks across restarts
          });
        }

        let requestHeaders: Headers | null = null;
        try {
          requestHeaders = await headers();
        } catch {
          requestHeaders = null;
        }

        const forwardedFor =
          requestHeaders?.get("x-forwarded-for") ?? undefined;
        const userAgent = requestHeaders?.get("user-agent") ?? undefined;
        const ipAddress =
          forwardedFor?.split(",")[0]?.trim() ??
          requestHeaders?.get("x-real-ip") ??
          undefined;

        try {
          const { token: deviceSessionToken } = await createUserSession(
            dbUser.id,
            { deviceId, userAgent, ipAddress }
          );

          token.deviceSessionToken = deviceSessionToken;
          token.id = dbUser.id;
        } catch (error) {
          console.error("[auth] Failed to create user session", error);
        }
      }

      return token;
    },
    async session({ session, token }) {
      const isEdge =
        typeof EdgeRuntime !== "undefined" ||
        (typeof process !== "undefined" &&
          process.env.NEXT_RUNTIME === "edge");

      if (!isEdge && token.deviceSessionToken && token.id) {
        try {
          const { validateSessionToken } = await import(
            "@/lib/auth/session-service"
          );
          const isValid = await validateSessionToken(
            token.deviceSessionToken as string,
            token.id as string
          );

          if (!isValid) {
            return {
              ...session,
              user: undefined,
              deviceSessionToken: undefined,
            };
          }
        } catch (error) {
          console.error("[auth] Failed to validate user session", error);
          return {
            ...session,
            user: undefined,
            deviceSessionToken: undefined,
          };
        }
      }

      if (session.user) {
        session.user.id = token.id as string;
        session.user.name = token.name ?? session.user.name ?? undefined;
        session.user.email = token.email ?? session.user.email ?? "";
        const normalizedPlan =
          normalizeSubscriptionPlan(token.subscriptionPlan) ??
          DEFAULT_SUBSCRIPTION_PLAN;
        session.user.subscriptionPlan = normalizedPlan;
        session.user.creditsRemaining =
          typeof token.creditsRemaining === "number"
            ? token.creditsRemaining
            : 0;
        session.user.trialEndsAt =
          typeof token.trialEndsAt === "string" ? token.trialEndsAt : null;
        session.deviceSessionToken =
          typeof token.deviceSessionToken === "string"
            ? token.deviceSessionToken
            : undefined;
      }
      return session;
    },
    async signIn({ user, account }) {
      const cookieStore = await cookies();

      if (account?.provider === "google" && user.email) {
        const intent =
          cookieStore.get("omnifaind_oauth_intent")?.value ?? "signin";
        const normalizedIntent =
          intent === "signup" || intent === "signin" ? intent : "signin";

        const existingUser = await findUserByEmail(user.email);

        if (!existingUser && normalizedIntent !== "signup") {
          return "/signup?error=google-signup-required";
        }

        const planCookie =
          cookieStore.get("omnifaind_selected_plan")?.value ?? null;
        if (planCookie) {
          cookieStore.delete("omnifaind_selected_plan");
        }
        const normalizedPlan =
          normalizeSubscriptionPlan(planCookie) ?? DEFAULT_SUBSCRIPTION_PLAN;

        // Allow signup (and keep profile info fresh for logins)
        const userRecord = await upsertOAuthUser({
          email: user.email,
          name: user.name,
          image: user.image,
          provider: "google",
          subscriptionPlan: normalizedPlan,
        });

        // Enforce device limit before proceeding
        const { isDeviceAllowed } = await import(
          "@/lib/auth/session-service"
        );
        const deviceId =
          cookieStore.get("omnifaind_device_id")?.value ?? undefined;
        const allowed = await isDeviceAllowed(userRecord.id, deviceId);
        if (!allowed) {
          return "/login?error=device-limit";
        }
      } else if (account?.provider === "credentials" && user?.id) {
        const { isDeviceAllowed } = await import(
          "@/lib/auth/session-service"
        );
        const deviceId =
          cookieStore.get("omnifaind_device_id")?.value ?? undefined;
        const allowed = await isDeviceAllowed(user.id as string, deviceId);
        if (!allowed) {
          return "/login?error=device-limit";
        }
      }
      return true;
    },
  },
  events: {
    async signOut({ token }) {
      const isEdge =
        typeof EdgeRuntime !== "undefined" ||
        (typeof process !== "undefined" &&
          process.env.NEXT_RUNTIME === "edge");
      if (!isEdge && token?.deviceSessionToken) {
        try {
          const { revokeSessionByToken } = await import(
            "@/lib/auth/session-service"
          );
          await revokeSessionByToken(token.deviceSessionToken as string);
        } catch (error) {
          console.error("[auth] Failed to revoke user session", error);
        }
      }
    },
  },
};
