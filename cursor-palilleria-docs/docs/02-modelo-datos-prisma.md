# Modelo de datos Prisma

Este documento resume el modelo de datos inicial. Cursor debe convertir esto en `prisma/schema.prisma`.

## User

- id String @id @default(cuid())
- name String?
- email String @unique
- passwordHash String
- createdAt DateTime @default(now())
- updatedAt DateTime @updatedAt

Relaciones:

- companyMemberships
- createdJobs
- createdDrawings
- createdSegments
- createdAnnotations
- createdExports

## Company

- id String @id @default(cuid())
- name String
- taxName String?
- createdAt DateTime @default(now())
- updatedAt DateTime @updatedAt

Relaciones:

- members
- jobs
- drawings
- jobSettings
- pipeSegments
- annotations
- exports

## CompanyMember

- id String @id @default(cuid())
- companyId String
- userId String
- role CompanyRole
- createdAt DateTime @default(now())

Índice único:

- @@unique([companyId, userId])

## CompanyRole enum

- owner
- admin
- engineer
- viewer

## Job

- id String @id @default(cuid())
- companyId String
- name String
- clientName String?
- projectCode String?
- description String?
- status JobStatus @default(draft)
- createdById String
- createdAt DateTime @default(now())
- updatedAt DateTime @updatedAt

## JobStatus enum

- draft
- in_progress
- reviewed
- approved
- archived

## Drawing

- id String @id @default(cuid())
- companyId String
- jobId String
- fileName String
- originalFileName String
- storagePath String
- fileSize BigInt?
- mimeType String?
- status DrawingStatus @default(uploaded)
- drawingNumber String?
- lineNumber String?
- revision String?
- createdById String
- createdAt DateTime @default(now())
- updatedAt DateTime @updatedAt

## DrawingStatus enum

- uploaded
- processing
- detected
- reviewed
- approved
- error

## JobSettings

- id String @id @default(cuid())
- companyId String
- jobId String @unique
- lengthCriteria LengthCriteria @default(drawing_dimension_with_review)
- lengthUnit LengthUnit @default(mm)
- roundingMm Int? @default(1)
- maxPieceLengthMm Int?
- minPieceLengthMm Int?
- maxPieceWeightKg Decimal?
- separateByDiameter Boolean @default(true)
- separateBySchedule Boolean @default(true)
- separateByMaterial Boolean @default(true)
- separateAtFlanges Boolean @default(true)
- separateAtValves Boolean @default(true)
- separateAtFittings Boolean @default(true)
- requireReviewBeforeExport Boolean @default(true)
- notes String?
- createdAt DateTime @default(now())
- updatedAt DateTime @updatedAt

## LengthCriteria enum

- real_cut_length
- center_to_center
- face_to_face
- drawing_dimension
- drawing_dimension_with_review
- manual
- calculated_with_fitting_deductions

## LengthUnit enum

- mm
- cm
- m

## PipeSegment

Crear aunque en el paso 1 no se rellene automáticamente.

- id String @id @default(cuid())
- companyId String
- jobId String
- drawingId String
- segmentNumber String?
- spoolGroup String?
- sourceFile String?
- drawingNumber String?
- lineNumber String?
- material String?
- diameter String?
- schedule String?
- lengthValue Decimal?
- lengthUnit LengthUnit @default(mm)
- lengthOrigin LengthOrigin?
- observations String?
- status PipeSegmentStatus @default(detected)
- createdById String
- createdAt DateTime @default(now())
- updatedAt DateTime @updatedAt

## PipeSegmentStatus enum

- detected
- reviewed
- corrected
- approved

## LengthOrigin enum

- detected_from_drawing
- manually_entered
- corrected_manually
- calculated
- pending_review

## Annotation

Crear aunque en el paso 1 no se use todavía.

- id String @id @default(cuid())
- companyId String
- jobId String
- drawingId String
- pipeSegmentId String?
- type AnnotationType
- pageNumber Int @default(1)
- data Json
- createdById String
- createdAt DateTime @default(now())
- updatedAt DateTime @updatedAt

## AnnotationType enum

- line
- circle
- text
- tramo_label
- doubt_marker

## Export

Crear aunque en el paso 1 no se genere todavía.

- id String @id @default(cuid())
- companyId String
- jobId String
- type ExportType
- storagePath String?
- status ExportStatus @default(pending)
- createdById String
- createdAt DateTime @default(now())

## ExportType enum

- palilleria_excel
- palilleria_pdf
- trameado_pdf

## ExportStatus enum

- pending
- generated
- error
