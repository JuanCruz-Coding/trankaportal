import "dotenv/config";
import { config as loadDotenv } from "dotenv";
import { defineConfig } from "prisma/config";

// Prisma CLI solo carga .env por defecto. Cargamos también .env.local (como hace Next.js).
loadDotenv({ path: ".env.local", override: true });

// En Prisma 7:
//   - `datasource.url` lo usa SOLO el CLI (migrate, studio, db push, introspect).
//     Usamos DIRECT_URL porque migrate necesita session mode, no pgBouncer.
//   - El PrismaClient en runtime (lib/prisma.ts) usa DATABASE_URL (pooler) vía el adapter.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: process.env.DIRECT_URL!,
  },
});
