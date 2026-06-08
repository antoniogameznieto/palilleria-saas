import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const DEMO_USER_EMAIL = "demo@palilleria.local";
const DEMO_USER_PASSWORD = "demo1234";
const DEMO_COMPANY_NAME = "Empresa Demo";
const DEMO_JOB_NAME = "Trabajo Demo";

async function main() {
  const passwordHash = await bcrypt.hash(DEMO_USER_PASSWORD, 12);

  const user = await prisma.user.upsert({
    where: { email: DEMO_USER_EMAIL },
    update: {
      name: "Usuario Demo",
      passwordHash,
    },
    create: {
      name: "Usuario Demo",
      email: DEMO_USER_EMAIL,
      passwordHash,
    },
  });

  const company = await prisma.company.upsert({
    where: { id: "seed-company-demo" },
    update: {
      name: DEMO_COMPANY_NAME,
      taxName: "Empresa Demo S.L.",
    },
    create: {
      id: "seed-company-demo",
      name: DEMO_COMPANY_NAME,
      taxName: "Empresa Demo S.L.",
    },
  });

  await prisma.companyMember.upsert({
    where: {
      companyId_userId: {
        companyId: company.id,
        userId: user.id,
      },
    },
    update: {
      role: "owner",
    },
    create: {
      companyId: company.id,
      userId: user.id,
      role: "owner",
    },
  });

  const job = await prisma.job.upsert({
    where: { id: "seed-job-demo" },
    update: {
      name: DEMO_JOB_NAME,
      clientName: "Cliente Demo",
      projectCode: "DEMO-001",
      description: "Trabajo de ejemplo para desarrollo local.",
      status: "draft",
      createdById: user.id,
    },
    create: {
      id: "seed-job-demo",
      companyId: company.id,
      name: DEMO_JOB_NAME,
      clientName: "Cliente Demo",
      projectCode: "DEMO-001",
      description: "Trabajo de ejemplo para desarrollo local.",
      status: "draft",
      createdById: user.id,
    },
  });

  await prisma.jobSettings.upsert({
    where: { jobId: job.id },
    update: {
      companyId: company.id,
    },
    create: {
      companyId: company.id,
      jobId: job.id,
    },
  });

  console.log("Seed completado:");
  console.log(`- Usuario: ${DEMO_USER_EMAIL} / ${DEMO_USER_PASSWORD}`);
  console.log(`- Empresa: ${company.name} (${company.id})`);
  console.log(`- Trabajo: ${job.name} (${job.id})`);
}

main()
  .catch((error) => {
    console.error("Error ejecutando seed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
