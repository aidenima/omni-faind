export const SUBSCRIPTION_PLAN_IDS = ["STARTER", "PRO", "AGENCY"] as const;

export type SubscriptionPlanId = (typeof SUBSCRIPTION_PLAN_IDS)[number];

export type SubscriptionPlanConfig = {
  id: SubscriptionPlanId;
  label: string;
  monthlyPrice: number;
  monthlyCredits: number;
  description: string;
  contactLimit: number;
  projectLimit: number;
};

const createPlanConfig = (
  id: SubscriptionPlanId,
  label: string,
  monthlyPrice: number,
  monthlyCredits: number,
  description: string,
  contactLimit: number,
  projectLimit: number
): SubscriptionPlanConfig => ({
  id,
  label,
  monthlyPrice,
  monthlyCredits,
  description,
  contactLimit,
  projectLimit,
});

export const SUBSCRIPTION_PLANS: Record<
  SubscriptionPlanId,
  SubscriptionPlanConfig
> = {
  STARTER: createPlanConfig(
    "STARTER",
    "Starter",
    27,
    100,
    "Perfect for solo sourcers who need focused AI-assisted searches.",
    50,
    2
  ),
  PRO: createPlanConfig(
    "PRO",
    "Pro",
    98,
    400,
    "Grow your pipeline with more credits and priority automation.",
    90,
    5
  ),
  AGENCY: createPlanConfig(
    "AGENCY",
    "Agency",
    789,
    5000,
    "Designed for agencies needing enterprise throughput and care.",
    150,
    20
  ),
};

export const SUBSCRIPTION_PLAN_LIST = SUBSCRIPTION_PLAN_IDS.map(
  (planId) => SUBSCRIPTION_PLANS[planId]
);

export const DEFAULT_SUBSCRIPTION_PLAN: SubscriptionPlanId = "STARTER";

export const TRIAL_CREDITS = 15;
export const TRIAL_DURATION_DAYS = 7;

export const normalizeSubscriptionPlan = (
  value: unknown
): SubscriptionPlanId | null => {
  if (typeof value !== "string") {
    return null;
  }
  const upper = value.trim().toUpperCase();
  if (
    SUBSCRIPTION_PLAN_IDS.includes(upper as SubscriptionPlanId)
  ) {
    return upper as SubscriptionPlanId;
  }
  return null;
};

export const getTrialEndDate = (startDate = new Date()) => {
  const millisecondsPerDay = 24 * 60 * 60 * 1000;
  return new Date(
    startDate.getTime() + TRIAL_DURATION_DAYS * millisecondsPerDay
  );
};

export const getPlanLabel = (plan: SubscriptionPlanId) =>
  SUBSCRIPTION_PLANS[plan]?.label ?? plan;

export const getPlanContactLimit = (plan: SubscriptionPlanId) =>
  SUBSCRIPTION_PLANS[plan]?.contactLimit ?? 50;

export const getPlanProjectLimit = (plan: SubscriptionPlanId) =>
  SUBSCRIPTION_PLANS[plan]?.projectLimit ?? 2;

export const getPlanScreeningLimit = (plan: SubscriptionPlanId) => {
  if (plan === "AGENCY") return 50;
  if (plan === "PRO") return 20;
  return 10;
};
