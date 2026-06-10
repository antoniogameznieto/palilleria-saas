-- CreateEnum
CREATE TYPE "TrameadoAnnotationType" AS ENUM ('point', 'rect');

-- CreateTable
CREATE TABLE "DrawingTrameadoAnnotation" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "drawingId" TEXT NOT NULL,
    "sheetId" TEXT NOT NULL,
    "segmentId" TEXT NOT NULL,
    "pageNumber" INTEGER NOT NULL DEFAULT 1,
    "type" "TrameadoAnnotationType" NOT NULL,
    "x" DOUBLE PRECISION NOT NULL,
    "y" DOUBLE PRECISION NOT NULL,
    "width" DOUBLE PRECISION,
    "height" DOUBLE PRECISION,
    "segmentLabel" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DrawingTrameadoAnnotation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DrawingTrameadoAnnotation_segmentId_key" ON "DrawingTrameadoAnnotation"("segmentId");

-- CreateIndex
CREATE INDEX "DrawingTrameadoAnnotation_companyId_jobId_drawingId_idx" ON "DrawingTrameadoAnnotation"("companyId", "jobId", "drawingId");

-- CreateIndex
CREATE INDEX "DrawingTrameadoAnnotation_sheetId_idx" ON "DrawingTrameadoAnnotation"("sheetId");

-- CreateIndex
CREATE INDEX "DrawingTrameadoAnnotation_drawingId_idx" ON "DrawingTrameadoAnnotation"("drawingId");

-- CreateIndex
CREATE INDEX "DrawingTrameadoAnnotation_createdById_idx" ON "DrawingTrameadoAnnotation"("createdById");

-- AddForeignKey
ALTER TABLE "DrawingTrameadoAnnotation" ADD CONSTRAINT "DrawingTrameadoAnnotation_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DrawingTrameadoAnnotation" ADD CONSTRAINT "DrawingTrameadoAnnotation_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DrawingTrameadoAnnotation" ADD CONSTRAINT "DrawingTrameadoAnnotation_drawingId_fkey" FOREIGN KEY ("drawingId") REFERENCES "Drawing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DrawingTrameadoAnnotation" ADD CONSTRAINT "DrawingTrameadoAnnotation_sheetId_fkey" FOREIGN KEY ("sheetId") REFERENCES "DrawingTrameadoSheet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DrawingTrameadoAnnotation" ADD CONSTRAINT "DrawingTrameadoAnnotation_segmentId_fkey" FOREIGN KEY ("segmentId") REFERENCES "DrawingTrameadoSegment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DrawingTrameadoAnnotation" ADD CONSTRAINT "DrawingTrameadoAnnotation_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
