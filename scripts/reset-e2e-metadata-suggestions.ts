/**
 * Restablece el plano E2E con metadatos pendientes y nombre HL-1289-01.
 */
import { PrismaClient } from "@prisma/client";

import { resetE2eMetadataSuggestionDrawing } from "./seed-e2e";

const prisma = new PrismaClient();

async function main() {
  await resetE2eMetadataSuggestionDrawing(prisma);
}

main()
  .catch((error) => {
    console.error("Error al resetear metadatos sugeridos E2E:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
