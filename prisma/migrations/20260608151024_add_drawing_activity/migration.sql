-- CreateEnum
CREATE TYPE "DrawingActivityType" AS ENUM ('drawing_uploaded', 'metadata_updated', 'status_updated', 'detection_started', 'detection_completed', 'metadata_confirmed');

-- CreateTable
CREATE TABLE "DrawingActivity" (
    "id" TEXT NOT NULL,
    "drawingId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "actorUserId" TEXT,
    "type" "DrawingActivityType" NOT NULL,
    "message" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DrawingActivity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DrawingActivity_companyId_jobId_drawingId_idx" ON "DrawingActivity"("companyId", "jobId", "drawingId");

-- CreateIndex
CREATE INDEX "DrawingActivity_drawingId_createdAt_idx" ON "DrawingActivity"("drawingId", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "DrawingActivity" ADD CONSTRAINT "DrawingActivity_drawingId_fkey" FOREIGN KEY ("drawingId") REFERENCES "Drawing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DrawingActivity" ADD CONSTRAINT "DrawingActivity_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
