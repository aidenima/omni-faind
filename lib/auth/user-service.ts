import type { SubscriptionPlan } from "@prisma/client";
import { TRIAL_CREDITS, getTrialEndDate } from "@/lib/billing/plans";
import { prisma } from "@/lib/prisma";

const normalizeEmail = (email: string) => email.trim().toLowerCase();

export const findUserByEmail = (email: string) => {
  return prisma.user.findUnique({
    where: {
      email: normalizeEmail(email),
    },
  });
};

const buildTrialState = () => ({
  creditsRemaining: TRIAL_CREDITS,
  trialEndsAt: getTrialEndDate(),
});

type CreateCredentialsUserInput = {
  email: string;
  name?: string;
  passwordHash: string;
  subscriptionPlan: SubscriptionPlan;
};

export const createCredentialsUser = ({
  email,
  name,
  passwordHash,
  subscriptionPlan,
}: CreateCredentialsUserInput) => {
  const { creditsRemaining, trialEndsAt } = buildTrialState();
  return prisma.user.create({
    data: {
      email: normalizeEmail(email),
      name,
      passwordHash,
      authProvider: "credentials",
      subscriptionPlan,
      creditsRemaining,
      trialEndsAt,
    },
  });
};

type UpsertOAuthUserInput = {
  email: string;
  name?: string | null;
  image?: string | null;
  provider?: string;
  subscriptionPlan?: SubscriptionPlan | null;
};

export const upsertOAuthUser = async ({
  email,
  name,
  image,
  provider = "google",
  subscriptionPlan = null,
}: UpsertOAuthUserInput) => {
  const normalizedEmail = normalizeEmail(email);
  const existing = await findUserByEmail(normalizedEmail);

  if (existing) {
    const needsUpdate =
      (name && name !== existing.name) ||
      (image && image !== existing.image) ||
      provider !== existing.authProvider;

    if (needsUpdate) {
      return prisma.user.update({
        where: { id: existing.id },
        data: {
          name: name ?? existing.name,
          image: image ?? existing.image,
          authProvider: provider,
        },
      });
    }

    return existing;
  }

  const { creditsRemaining, trialEndsAt } = buildTrialState();

  return prisma.user.create({
    data: {
      email: normalizedEmail,
      name: name ?? undefined,
      image: image ?? undefined,
      authProvider: provider,
      subscriptionPlan: subscriptionPlan ?? "STARTER",
      creditsRemaining,
      trialEndsAt,
    },
  });
};
