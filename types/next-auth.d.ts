import NextAuth, { DefaultSession } from "next-auth";
import { JWT } from "next-auth/jwt";
import type { SubscriptionPlanId } from "@/lib/billing/plans";

declare module "next-auth" {
  interface Session {
    user?: DefaultSession["user"] & {
      id: string;
      subscriptionPlan: SubscriptionPlanId;
      creditsRemaining: number;
      trialEndsAt: string | null;
    };
    deviceSessionToken?: string;
  }

  interface User {
    id: string;
    subscriptionPlan: SubscriptionPlanId;
    creditsRemaining: number;
    trialEndsAt: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    subscriptionPlan?: SubscriptionPlanId;
    creditsRemaining?: number;
    trialEndsAt?: string | null;
    deviceSessionToken?: string;
  }
}
