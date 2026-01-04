/*
  Warnings:

  - You are about to alter the column `creditsRemaining` on the `User` table. The data in that column could be lost. The data in that column will be cast from `Integer` to `Decimal(10,2)`.

*/
-- AlterTable
ALTER TABLE "User" ALTER COLUMN "creditsRemaining" SET DEFAULT 15.0,
ALTER COLUMN "creditsRemaining" SET DATA TYPE DECIMAL(10,2);
