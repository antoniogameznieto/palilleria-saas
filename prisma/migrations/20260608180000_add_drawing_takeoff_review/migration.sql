ALTER TYPE "DrawingActivityType" ADD VALUE 'takeoff_reviewed';
ALTER TYPE "DrawingActivityType" ADD VALUE 'takeoff_review_reset';

ALTER TABLE "Drawing" ADD COLUMN "takeoffReviewedAt" TIMESTAMP(3),
ADD COLUMN "takeoffReviewedById" TEXT;

ALTER TABLE "Drawing" ADD CONSTRAINT "Drawing_takeoffReviewedById_fkey" FOREIGN KEY ("takeoffReviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Drawing_takeoffReviewedById_idx" ON "Drawing"("takeoffReviewedById");
