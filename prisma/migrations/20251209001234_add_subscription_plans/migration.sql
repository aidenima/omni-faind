-- CreateEnum
CREATE TYPE "SubscriptionPlan" AS ENUM ('STARTER', 'PRO', 'AGENCY');

-- AlterTable
ALTER TABLE "User"
    ADD COLUMN "subscriptionPlan" "SubscriptionPlan" NOT NULL DEFAULT 'STARTER',
    ADD COLUMN "creditsRemaining" INTEGER NOT NULL DEFAULT 15,
    ADD COLUMN "trialEndsAt" TIMESTAMP(3);
