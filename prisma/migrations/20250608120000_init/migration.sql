-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "CompanyRole" AS ENUM ('owner', 'admin', 'engineer', 'viewer');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('draft', 'in_progress', 'reviewed', 'approved', 'archived');

-- CreateEnum
CREATE TYPE "DrawingStatus" AS ENUM ('uploaded', 'processing', 'detected', 'reviewed', 'approved', 'error');

-- CreateEnum
CREATE TYPE "LengthCriteria" AS ENUM ('real_cut_length', 'center_to_center', 'face_to_face', 'drawing_dimension', 'drawing_dimension_with_review', 'manual', 'calculated_with_fitting_deductions');

-- CreateEnum
CREATE TYPE "LengthUnit" AS ENUM ('mm', 'cm', 'm');

-- CreateEnum
CREATE TYPE "PipeSegmentStatus" AS ENUM ('detected', 'reviewed', 'corrected', 'approved');

-- CreateEnum
CREATE TYPE "LengthOrigin" AS ENUM ('detected_from_drawing', 'manually_entered', 'corrected_manually', 'calculated', 'pending_review');

-- CreateEnum
CREATE TYPE "AnnotationType" AS ENUM ('line', 'circle', 'text', 'tramo_label', 'doubt_marker');

-- CreateEnum
CREATE TYPE "ExportType" AS ENUM ('palilleria_excel', 'palilleria_pdf', 'trameado_pdf');

-- CreateEnum
CREATE TYPE "ExportStatus" AS ENUM ('pending', 'generated', 'error');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "taxName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanyMember" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "CompanyRole" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompanyMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Job" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "clientName" TEXT,
    "projectCode" TEXT,
    "description" TEXT,
    "status" "JobStatus" NOT NULL DEFAULT 'draft',
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Drawing" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "originalFileName" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "fileSize" BIGINT,
    "mimeType" TEXT,
    "status" "DrawingStatus" NOT NULL DEFAULT 'uploaded',
    "drawingNumber" TEXT,
    "lineNumber" TEXT,
    "revision" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Drawing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobSettings" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "lengthCriteria" "LengthCriteria" NOT NULL DEFAULT 'drawing_dimension_with_review',
    "lengthUnit" "LengthUnit" NOT NULL DEFAULT 'mm',
    "roundingMm" INTEGER DEFAULT 1,
    "maxPieceLengthMm" INTEGER,
    "minPieceLengthMm" INTEGER,
    "maxPieceWeightKg" DECIMAL(65,30),
    "separateByDiameter" BOOLEAN NOT NULL DEFAULT true,
    "separateBySchedule" BOOLEAN NOT NULL DEFAULT true,
    "separateByMaterial" BOOLEAN NOT NULL DEFAULT true,
    "separateAtFlanges" BOOLEAN NOT NULL DEFAULT true,
    "separateAtValves" BOOLEAN NOT NULL DEFAULT true,
    "separateAtFittings" BOOLEAN NOT NULL DEFAULT true,
    "requireReviewBeforeExport" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PipeSegment" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "drawingId" TEXT NOT NULL,
    "segmentNumber" TEXT,
    "spoolGroup" TEXT,
    "sourceFile" TEXT,
    "drawingNumber" TEXT,
    "lineNumber" TEXT,
    "material" TEXT,
    "diameter" TEXT,
    "schedule" TEXT,
    "lengthValue" DECIMAL(65,30),
    "lengthUnit" "LengthUnit" NOT NULL DEFAULT 'mm',
    "lengthOrigin" "LengthOrigin",
    "observations" TEXT,
    "status" "PipeSegmentStatus" NOT NULL DEFAULT 'detected',
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PipeSegment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Annotation" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "drawingId" TEXT NOT NULL,
    "pipeSegmentId" TEXT,
    "type" "AnnotationType" NOT NULL,
    "pageNumber" INTEGER NOT NULL DEFAULT 1,
    "data" JSONB NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Annotation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Export" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "type" "ExportType" NOT NULL,
    "storagePath" TEXT,
    "status" "ExportStatus" NOT NULL DEFAULT 'pending',
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Export_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "CompanyMember_userId_idx" ON "CompanyMember"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "CompanyMember_companyId_userId_key" ON "CompanyMember"("companyId", "userId");

-- CreateIndex
CREATE INDEX "Job_companyId_idx" ON "Job"("companyId");

-- CreateIndex
CREATE INDEX "Job_createdById_idx" ON "Job"("createdById");

-- CreateIndex
CREATE INDEX "Drawing_companyId_idx" ON "Drawing"("companyId");

-- CreateIndex
CREATE INDEX "Drawing_jobId_idx" ON "Drawing"("jobId");

-- CreateIndex
CREATE INDEX "Drawing_createdById_idx" ON "Drawing"("createdById");

-- CreateIndex
CREATE UNIQUE INDEX "JobSettings_jobId_key" ON "JobSettings"("jobId");

-- CreateIndex
CREATE INDEX "JobSettings_companyId_idx" ON "JobSettings"("companyId");

-- CreateIndex
CREATE INDEX "PipeSegment_companyId_idx" ON "PipeSegment"("companyId");

-- CreateIndex
CREATE INDEX "PipeSegment_jobId_idx" ON "PipeSegment"("jobId");

-- CreateIndex
CREATE INDEX "PipeSegment_drawingId_idx" ON "PipeSegment"("drawingId");

-- CreateIndex
CREATE INDEX "PipeSegment_createdById_idx" ON "PipeSegment"("createdById");

-- CreateIndex
CREATE INDEX "Annotation_companyId_idx" ON "Annotation"("companyId");

-- CreateIndex
CREATE INDEX "Annotation_jobId_idx" ON "Annotation"("jobId");

-- CreateIndex
CREATE INDEX "Annotation_drawingId_idx" ON "Annotation"("drawingId");

-- CreateIndex
CREATE INDEX "Annotation_pipeSegmentId_idx" ON "Annotation"("pipeSegmentId");

-- CreateIndex
CREATE INDEX "Annotation_createdById_idx" ON "Annotation"("createdById");

-- CreateIndex
CREATE INDEX "Export_companyId_idx" ON "Export"("companyId");

-- CreateIndex
CREATE INDEX "Export_jobId_idx" ON "Export"("jobId");

-- CreateIndex
CREATE INDEX "Export_createdById_idx" ON "Export"("createdById");

-- AddForeignKey
ALTER TABLE "CompanyMember" ADD CONSTRAINT "CompanyMember_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyMember" ADD CONSTRAINT "CompanyMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Drawing" ADD CONSTRAINT "Drawing_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Drawing" ADD CONSTRAINT "Drawing_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Drawing" ADD CONSTRAINT "Drawing_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobSettings" ADD CONSTRAINT "JobSettings_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobSettings" ADD CONSTRAINT "JobSettings_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PipeSegment" ADD CONSTRAINT "PipeSegment_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PipeSegment" ADD CONSTRAINT "PipeSegment_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PipeSegment" ADD CONSTRAINT "PipeSegment_drawingId_fkey" FOREIGN KEY ("drawingId") REFERENCES "Drawing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PipeSegment" ADD CONSTRAINT "PipeSegment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Annotation" ADD CONSTRAINT "Annotation_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Annotation" ADD CONSTRAINT "Annotation_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Annotation" ADD CONSTRAINT "Annotation_drawingId_fkey" FOREIGN KEY ("drawingId") REFERENCES "Drawing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Annotation" ADD CONSTRAINT "Annotation_pipeSegmentId_fkey" FOREIGN KEY ("pipeSegmentId") REFERENCES "PipeSegment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Annotation" ADD CONSTRAINT "Annotation_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Export" ADD CONSTRAINT "Export_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Export" ADD CONSTRAINT "Export_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Export" ADD CONSTRAINT "Export_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
