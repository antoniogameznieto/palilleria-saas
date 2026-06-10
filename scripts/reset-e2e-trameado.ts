/**
 * Limpia hojas de trameado del plano E2E principal (drawingPending).
 * Cascada Prisma elimina segmentos y anotaciones asociados.
 * Usado entre tests de trameado-*.spec.ts para aislar escenarios.
 */
import { PrismaClient } from "@prisma/client";

import { resetE2eTrameadoData } from "./seed-e2e";

const prisma = new PrismaClient();

async function main() {
  await resetE2eTrameadoData(prisma);
}

main()
  .catch((error) => {
    console.error("Error al resetear trameado E2E:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
