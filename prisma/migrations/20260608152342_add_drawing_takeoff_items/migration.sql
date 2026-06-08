-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "DrawingActivityType" ADD VALUE 'takeoff_item_created';
ALTER TYPE "DrawingActivityType" ADD VALUE 'takeoff_item_updated';
ALTER TYPE "DrawingActivityType" ADD VALUE 'takeoff_item_deleted';

-- CreateTable
CREATE TABLE "DrawingTakeoffItem" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "drawingId" TEXT NOT NULL,
    "reference" TEXT,
    "description" TEXT NOT NULL,
    "quantity" DECIMAL(12,3) NOT NULL,
    "unit" TEXT,
    "length" DECIMAL(12,3),
    "width" DECIMAL(12,3),
    "height" DECIMAL(12,3),
    "notes" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DrawingTakeoffItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DrawingTakeoffItem_companyId_jobId_drawingId_idx" ON "DrawingTakeoffItem"("companyId", "jobId", "drawingId");

-- CreateIndex
CREATE INDEX "DrawingTakeoffItem_drawingId_idx" ON "DrawingTakeoffItem"("drawingId");

-- AddForeignKey
ALTER TABLE "DrawingTakeoffItem" ADD CONSTRAINT "DrawingTakeoffItem_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DrawingTakeoffItem" ADD CONSTRAINT "DrawingTakeoffItem_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DrawingTakeoffItem" ADD CONSTRAINT "DrawingTakeoffItem_drawingId_fkey" FOREIGN KEY ("drawingId") REFERENCES "Drawing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DrawingTakeoffItem" ADD CONSTRAINT "DrawingTakeoffItem_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
