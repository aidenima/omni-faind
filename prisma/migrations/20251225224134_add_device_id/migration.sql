-- AlterTable
ALTER TABLE "UserSession" ADD COLUMN     "deviceId" TEXT;

-- CreateIndex
CREATE INDEX "UserSession_userId_deviceId_idx" ON "UserSession"("userId", "deviceId");
