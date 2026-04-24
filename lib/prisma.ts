import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// Singleton: en dev, Next.js hace hot-reload y recrearía el cliente en cada edit,
// abriendo conexiones hasta agotar el pool de Postgres. Lo guardamos en globalThis
// para reusar la misma instancia entre reloads.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createPrismaClient() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL no está definida. Revisá tu .env.local");
  }
  const adapter = new PrismaPg(process.env.DATABASE_URL);
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
