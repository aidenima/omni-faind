
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/app/api/projects/utils";
import type { SubscriptionPlan } from "@prisma/client";
import {
  getPlanContactLimit,
  type SubscriptionPlanId,
} from "@/lib/billing/plans";

export async function GET() {
  try {
    const userId = await requireUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const account = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        subscriptionPlan: true,
        creditsRemaining: true,
        trialEndsAt: true,
      },
    });

    if (!account) {
      return NextResponse.json({ error: "Account not found." }, { status: 404 });
    }

    const creditsRemaining = Number(account.creditsRemaining);

    return NextResponse.json({
      account: {
        id: account.id,
        subscriptionPlan: account.subscriptionPlan as SubscriptionPlan,
        creditsRemaining,
        trialEndsAt: account.trialEndsAt?.toISOString() ?? null,
        contactLimit: getPlanContactLimit(
          account.subscriptionPlan as SubscriptionPlanId
        ),
      },
    });
  } catch (error) {
    console.error("Failed to load account info", error);
    return NextResponse.json(
      { error: "Unable to load account details." },
      { status: 500 }
    );
  }
}
