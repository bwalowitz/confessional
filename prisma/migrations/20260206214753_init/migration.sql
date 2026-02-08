-- CreateTable
CREATE TABLE "VideoPost" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "videoUrl" TEXT NOT NULL,
    "durationSeconds" INTEGER NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "reportedCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "VideoPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Report" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "videoPostId" TEXT NOT NULL,
    "ipHash" TEXT NOT NULL,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VideoPost_createdAt_id_idx" ON "VideoPost"("createdAt", "id");

-- CreateIndex
CREATE INDEX "Report_videoPostId_idx" ON "Report"("videoPostId");

-- CreateIndex
CREATE INDEX "Report_ipHash_idx" ON "Report"("ipHash");

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_videoPostId_fkey" FOREIGN KEY ("videoPostId") REFERENCES "VideoPost"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
