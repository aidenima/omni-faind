/*
  Warnings:

  - You are about to drop the column `appliesTo` on the `Coupon` table. All the data in the column will be lost.
  - You are about to drop the column `assignedUserId` on the `Coupon` table. All the data in the column will be lost.
  - You are about to drop the column `expiresAt` on the `Coupon` table. All the data in the column will be lost.
  - You are about to drop the column `isActive` on the `Coupon` table. All the data in the column will be lost.
  - You are about to drop the column `maxRedemptions` on the `Coupon` table. All the data in the column will be lost.
  - You are about to drop the column `redeemedCount` on the `Coupon` table. All the data in the column will be lost.
  - You are about to drop the column `startsAt` on the `Coupon` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `Coupon` table. All the data in the column will be lost.
  - You are about to drop the `CouponRedemption` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `userId` to the `Coupon` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "CouponRedemption" DROP CONSTRAINT "CouponRedemption_couponId_fkey";

-- DropForeignKey
ALTER TABLE "CouponRedemption" DROP CONSTRAINT "CouponRedemption_userId_fkey";

-- AlterTable
ALTER TABLE "Coupon" DROP COLUMN "appliesTo",
DROP COLUMN "assignedUserId",
DROP COLUMN "expiresAt",
DROP COLUMN "isActive",
DROP COLUMN "maxRedemptions",
DROP COLUMN "redeemedCount",
DROP COLUMN "startsAt",
DROP COLUMN "updatedAt",
ADD COLUMN     "userId" TEXT NOT NULL;

-- DropTable
DROP TABLE "CouponRedemption";
