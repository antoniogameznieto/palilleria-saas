import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  return new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });
}

function isPrismaClientCompatible(client: PrismaClient): boolean {
  return (
    typeof client.drawingTrameadoSheet?.findMany === "function" &&
    typeof client.drawingTrameadoSegment?.findMany === "function"
  );
}

function resolvePrismaClient(): PrismaClient {
  const cached = globalForPrisma.prisma;

  if (cached && isPrismaClientCompatible(cached)) {
    return cached;
  }

  if (cached) {
    void cached.$disconnect().catch(() => undefined);
  }

  const client = createPrismaClient();

  if (!isPrismaClientCompatible(client)) {
    throw new Error(
      "Prisma Client no incluye modelos de trameado. Ejecuta `npm run db:generate` y reinicia el servidor de desarrollo.",
    );
  }

  globalForPrisma.prisma = client;
  return client;
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, property, receiver) {
    const client = resolvePrismaClient();
    const value = Reflect.get(client, property, receiver);

    if (typeof value === "function") {
      return value.bind(client);
    }

    return value;
  },
});
