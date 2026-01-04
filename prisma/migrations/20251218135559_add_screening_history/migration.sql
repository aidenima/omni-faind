-- CreateTable
CREATE TABLE "ScreeningHistory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "jobDescription" TEXT NOT NULL,
    "candidateCount" INTEGER,
    "resultCount" INTEGER,
    "results" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScreeningHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ScreeningHistory_userId_idx" ON "ScreeningHistory"("userId");

-- CreateIndex
CREATE INDEX "ScreeningHistory_projectId_idx" ON "ScreeningHistory"("projectId");

-- AddForeignKey
ALTER TABLE "ScreeningHistory" ADD CONSTRAINT "ScreeningHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScreeningHistory" ADD CONSTRAINT "ScreeningHistory_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
