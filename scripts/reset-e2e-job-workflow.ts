/**
 * Restablece el trabajo E2E a un estado estable para tests del flujo del trabajo.
 */
import { PrismaClient } from "@prisma/client";

import { resetE2eJobWorkflowData } from "./seed-e2e";

const prisma = new PrismaClient();

async function main() {
  await resetE2eJobWorkflowData(prisma);
}

main()
  .catch((error) => {
    console.error("Error al resetear flujo E2E del trabajo:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
