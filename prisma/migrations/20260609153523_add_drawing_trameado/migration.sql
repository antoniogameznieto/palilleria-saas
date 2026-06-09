-- CreateTable
CREATE TABLE "DrawingTrameadoSheet" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "drawingId" TEXT NOT NULL,
    "lineIdentifier" TEXT NOT NULL,
    "lineClass" TEXT,
    "notes" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DrawingTrameadoSheet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DrawingTrameadoSegment" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "drawingId" TEXT NOT NULL,
    "sheetId" TEXT NOT NULL,
    "segmentNumber" TEXT NOT NULL,
    "segmentLabel" TEXT,
    "diameter" TEXT NOT NULL,
    "schedule" TEXT NOT NULL,
    "palilloLength" DECIMAL(12,3) NOT NULL,
    "lengthUnit" "LengthUnit" NOT NULL DEFAULT 'mm',
    "heatNumber" TEXT,
    "sourcePage" INTEGER,
    "sourceMark" TEXT,
    "notes" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DrawingTrameadoSegment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DrawingTrameadoSheet_companyId_jobId_drawingId_idx" ON "DrawingTrameadoSheet"("companyId", "jobId", "drawingId");

-- CreateIndex
CREATE INDEX "DrawingTrameadoSheet_drawingId_idx" ON "DrawingTrameadoSheet"("drawingId");

-- CreateIndex
CREATE INDEX "DrawingTrameadoSheet_reviewedById_idx" ON "DrawingTrameadoSheet"("reviewedById");

-- CreateIndex
CREATE INDEX "DrawingTrameadoSegment_companyId_jobId_drawingId_idx" ON "DrawingTrameadoSegment"("companyId", "jobId", "drawingId");

-- CreateIndex
CREATE INDEX "DrawingTrameadoSegment_sheetId_sortOrder_idx" ON "DrawingTrameadoSegment"("sheetId", "sortOrder");

-- CreateIndex
CREATE INDEX "DrawingTrameadoSegment_drawingId_idx" ON "DrawingTrameadoSegment"("drawingId");

-- AddForeignKey
ALTER TABLE "DrawingTrameadoSheet" ADD CONSTRAINT "DrawingTrameadoSheet_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DrawingTrameadoSheet" ADD CONSTRAINT "DrawingTrameadoSheet_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DrawingTrameadoSheet" ADD CONSTRAINT "DrawingTrameadoSheet_drawingId_fkey" FOREIGN KEY ("drawingId") REFERENCES "Drawing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DrawingTrameadoSheet" ADD CONSTRAINT "DrawingTrameadoSheet_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DrawingTrameadoSegment" ADD CONSTRAINT "DrawingTrameadoSegment_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DrawingTrameadoSegment" ADD CONSTRAINT "DrawingTrameadoSegment_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DrawingTrameadoSegment" ADD CONSTRAINT "DrawingTrameadoSegment_drawingId_fkey" FOREIGN KEY ("drawingId") REFERENCES "Drawing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DrawingTrameadoSegment" ADD CONSTRAINT "DrawingTrameadoSegment_sheetId_fkey" FOREIGN KEY ("sheetId") REFERENCES "DrawingTrameadoSheet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
