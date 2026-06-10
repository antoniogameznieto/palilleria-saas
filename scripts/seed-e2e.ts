/**
 * Seed estable para tests E2E (ids fijos, datos reproducibles).
 * Ejecutar antes de `npm run test:e2e` (también vía global-setup de Playwright).
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

import { buildDrawingStoragePath } from "../lib/storage/paths";

const prisma = new PrismaClient();

export const E2E_PASSWORD = "demo1234";

export const E2E_IDS = {
  company: "seed-company-e2e",
  job: "seed-job-e2e",
  drawingPending: "seed-drawing-e2e-pending",
  drawingBom: "seed-drawing-e2e-bom",
  ownerUser: "seed-user-e2e-owner",
  engineerUser: "seed-user-e2e-engineer",
  viewerUser: "seed-user-e2e-viewer",
  otherCompany: "seed-company-demo",
  otherJob: "seed-job-demo",
} as const;

export const E2E_USERS = {
  owner: "e2e-owner@palilleria.local",
  engineer: "e2e-engineer@palilleria.local",
  viewer: "e2e-viewer@palilleria.local",
  other: "demo@palilleria.local",
} as const;

export async function resetE2eTrameadoData(client: PrismaClient = prisma) {
  await client.drawingTrameadoSheet.deleteMany({
    where: { drawingId: E2E_IDS.drawingPending },
  });
}

export async function resetE2eJobWorkflowData(client: PrismaClient = prisma) {
  await resetE2eTrameadoData(client);

  await client.drawing.deleteMany({
    where: {
      jobId: E2E_IDS.job,
      id: {
        notIn: [E2E_IDS.drawingPending, E2E_IDS.drawingBom],
      },
    },
  });

  await client.drawing.updateMany({
    where: {
      id: {
        in: [E2E_IDS.drawingPending, E2E_IDS.drawingBom],
      },
    },
    data: {
      takeoffReviewedAt: null,
      takeoffReviewedById: null,
    },
  });
}

async function upsertUser(
  id: string,
  email: string,
  name: string,
  passwordHash: string,
) {
  return prisma.user.upsert({
    where: { email },
    update: { name, passwordHash },
    create: { id, email, name, passwordHash },
  });
}

async function main() {
  const passwordHash = await bcrypt.hash(E2E_PASSWORD, 12);
  const storageRoot =
    process.env.LOCAL_STORAGE_PATH?.trim() || path.join(process.cwd(), "storage");

  const owner = await upsertUser(
    E2E_IDS.ownerUser,
    E2E_USERS.owner,
    "E2E Owner",
    passwordHash,
  );
  const engineer = await upsertUser(
    E2E_IDS.engineerUser,
    E2E_USERS.engineer,
    "E2E Engineer",
    passwordHash,
  );
  const viewer = await upsertUser(
    E2E_IDS.viewerUser,
    E2E_USERS.viewer,
    "E2E Viewer",
    passwordHash,
  );

  // Empresa y trabajo E2E
  const company = await prisma.company.upsert({
    where: { id: E2E_IDS.company },
    update: { name: "Empresa E2E", taxName: "Empresa E2E S.L." },
    create: {
      id: E2E_IDS.company,
      name: "Empresa E2E",
      taxName: "Empresa E2E S.L.",
    },
  });

  for (const [userId, role] of [
    [owner.id, "owner"],
    [engineer.id, "engineer"],
    [viewer.id, "viewer"],
  ] as const) {
    await prisma.companyMember.upsert({
      where: {
        companyId_userId: { companyId: company.id, userId },
      },
      update: { role },
      create: { companyId: company.id, userId, role },
    });
  }

  const job = await prisma.job.upsert({
    where: { id: E2E_IDS.job },
    update: {
      name: "Trabajo E2E",
      clientName: "Cliente E2E",
      projectCode: "E2E-001",
      description: "Trabajo para tests E2E.",
      status: "draft",
      createdById: owner.id,
    },
    create: {
      id: E2E_IDS.job,
      companyId: company.id,
      name: "Trabajo E2E",
      clientName: "Cliente E2E",
      projectCode: "E2E-001",
      description: "Trabajo para tests E2E.",
      status: "draft",
      createdById: owner.id,
    },
  });

  await prisma.jobSettings.upsert({
    where: { jobId: job.id },
    update: { companyId: company.id },
    create: { companyId: company.id, jobId: job.id },
  });

  const originalFileName = "e2e-dms-701-pl1-l-r01.pdf";
  const trameadoCandidatesFixturePath = path.join(
    process.cwd(),
    "tests/fixtures/e2e-trameado-candidates.pdf",
  );
  const drawingPdf = await readFile(trameadoCandidatesFixturePath);
  const storagePath = buildDrawingStoragePath(
    company.id,
    job.id,
    E2E_IDS.drawingPending,
    originalFileName,
  );
  const absolutePath = path.join(storageRoot, storagePath);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, drawingPdf);

  await prisma.drawing.upsert({
    where: { id: E2E_IDS.drawingPending },
    update: {
      companyId: company.id,
      jobId: job.id,
      fileName: originalFileName,
      originalFileName,
      storagePath,
      fileSize: BigInt(drawingPdf.length),
      mimeType: "application/pdf",
      status: "reviewed",
      drawingNumber: "E2E-701",
      lineNumber: "HL-E2E-A012AA-N-01",
      revision: "R01",
      takeoffReviewedAt: null,
      takeoffReviewedById: null,
      createdById: owner.id,
    },
    create: {
      id: E2E_IDS.drawingPending,
      companyId: company.id,
      jobId: job.id,
      fileName: originalFileName,
      originalFileName,
      storagePath,
      fileSize: BigInt(drawingPdf.length),
      mimeType: "application/pdf",
      status: "reviewed",
      drawingNumber: "E2E-701",
      lineNumber: "HL-E2E-A012AA-N-01",
      revision: "R01",
      createdById: owner.id,
    },
  });

  await resetE2eTrameadoData();

  await prisma.drawingTakeoffItem.deleteMany({
    where: { drawingId: E2E_IDS.drawingPending },
  });

  await prisma.drawingTakeoffItem.createMany({
    data: [
      {
        companyId: company.id,
        jobId: job.id,
        drawingId: E2E_IDS.drawingPending,
        reference: "E2E-A1",
        description: "Línea E2E uno",
        quantity: 2,
        unit: "ud",
        createdById: engineer.id,
      },
      {
        companyId: company.id,
        jobId: job.id,
        drawingId: E2E_IDS.drawingPending,
        reference: "E2E-A2",
        description: "Línea E2E dos",
        quantity: 3.5,
        unit: "m",
        createdById: engineer.id,
      },
      {
        companyId: company.id,
        jobId: job.id,
        drawingId: E2E_IDS.drawingPending,
        reference: "1000000001",
        description: '1 4" TUBERIA A106 Gr.B SCH 40',
        quantity: 12,
        unit: "m",
        createdById: engineer.id,
      },
      {
        companyId: company.id,
        jobId: job.id,
        drawingId: E2E_IDS.drawingPending,
        reference: "1000000002",
        description: '1 3/4" TUBERIA A106 Gr.B SCH 80',
        quantity: 4,
        unit: "m",
        createdById: engineer.id,
      },
    ],
  });

  const bomFixturePath = path.join(
    process.cwd(),
    "tests/fixtures/e2e-dms-703-bom.pdf",
  );
  const bomPdf = await readFile(bomFixturePath);
  const bomFileName = "e2e-dms-703-bom.pdf";
  const bomStoragePath = buildDrawingStoragePath(
    company.id,
    job.id,
    E2E_IDS.drawingBom,
    bomFileName,
  );
  const bomAbsolutePath = path.join(storageRoot, bomStoragePath);
  await mkdir(path.dirname(bomAbsolutePath), { recursive: true });
  await writeFile(bomAbsolutePath, bomPdf);

  await prisma.drawing.upsert({
    where: { id: E2E_IDS.drawingBom },
    update: {
      companyId: company.id,
      jobId: job.id,
      fileName: bomFileName,
      originalFileName: bomFileName,
      storagePath: bomStoragePath,
      fileSize: BigInt(bomPdf.length),
      mimeType: "application/pdf",
      status: "reviewed",
      drawingNumber: "E2E-BOM",
      lineNumber: "PL1-L",
      revision: "R03",
      takeoffReviewedAt: null,
      takeoffReviewedById: null,
      createdById: owner.id,
    },
    create: {
      id: E2E_IDS.drawingBom,
      companyId: company.id,
      jobId: job.id,
      fileName: bomFileName,
      originalFileName: bomFileName,
      storagePath: bomStoragePath,
      fileSize: BigInt(bomPdf.length),
      mimeType: "application/pdf",
      status: "reviewed",
      drawingNumber: "E2E-BOM",
      lineNumber: "PL1-L",
      revision: "R03",
      takeoffReviewedAt: null,
      takeoffReviewedById: null,
      createdById: owner.id,
    },
  });

  await prisma.drawingTakeoffItem.deleteMany({
    where: { drawingId: E2E_IDS.drawingBom },
  });

  await prisma.drawingTakeoffItem.create({
    data: {
      companyId: company.id,
      jobId: job.id,
      drawingId: E2E_IDS.drawingBom,
      reference: "1000937601",
      description:
        '1.1/2" SCH 160 TUBERIA EXT. PLANOS A.AL. A-335 P11 ESP-1300-3 T>450ºC',
      quantity: 0.2,
      unit: "m",
      createdById: engineer.id,
    },
  });

  // Empresa demo (cross-tenant): solo demo@ como owner
  const demoHash = await bcrypt.hash(E2E_PASSWORD, 12);
  const demoUser = await upsertUser(
    "seed-user-demo",
    E2E_USERS.other,
    "Usuario Demo",
    demoHash,
  );

  const otherCompany = await prisma.company.upsert({
    where: { id: E2E_IDS.otherCompany },
    update: { name: "Empresa Demo", taxName: "Empresa Demo S.L." },
    create: {
      id: E2E_IDS.otherCompany,
      name: "Empresa Demo",
      taxName: "Empresa Demo S.L.",
    },
  });

  await prisma.companyMember.upsert({
    where: {
      companyId_userId: {
        companyId: otherCompany.id,
        userId: demoUser.id,
      },
    },
    update: { role: "owner" },
    create: {
      companyId: otherCompany.id,
      userId: demoUser.id,
      role: "owner",
    },
  });

  await prisma.job.upsert({
    where: { id: E2E_IDS.otherJob },
    update: {
      name: "Trabajo Demo",
      companyId: otherCompany.id,
      createdById: demoUser.id,
    },
    create: {
      id: E2E_IDS.otherJob,
      companyId: otherCompany.id,
      name: "Trabajo Demo",
      clientName: "Cliente Demo",
      projectCode: "DEMO-001",
      description: "Trabajo de ejemplo.",
      status: "draft",
      createdById: demoUser.id,
    },
  });

  console.log("E2E seed completado:");
  console.log(`- Empresa E2E: ${company.id}`);
  console.log(`- Trabajo E2E: ${job.id}`);
  console.log(`- Plano pendiente revisión takeoff: ${E2E_IDS.drawingPending}`);
  console.log(`- Plano BOM experimental: ${E2E_IDS.drawingBom}`);
  console.log(`- Owner: ${E2E_USERS.owner}`);
  console.log(`- Engineer: ${E2E_USERS.engineer}`);
  console.log(`- Viewer: ${E2E_USERS.viewer}`);
}

if (require.main === module) {
  main()
    .catch((error) => {
      console.error("Error en seed E2E:", error);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
