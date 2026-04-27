/**
 * One-time fix: setea el empleado más viejo de cada organización como ADMIN.
 * Ese es típicamente el creador de la org (quien la dio de alta en Clerk).
 *
 * Se corre una sola vez tras agregar el campo Employee.role para no dejar a
 * los admins existentes sin acceso a sus propias funciones de admin.
 *
 *   npx tsx scripts/bootstrap-roles.ts
 *
 * Idempotente: si vuelve a correr, no rompe nada (vuelve a setear ADMIN al
 * mismo empleado, sin tocar a los demás).
 */

import "dotenv/config";
import { config as loadDotenv } from "dotenv";
loadDotenv({ path: ".env.local", override: true });

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg(process.env.DIRECT_URL ?? process.env.DATABASE_URL!);
const prisma = new PrismaClient({ adapter });

async function main() {
  const orgs = await prisma.organization.findMany({
    select: { id: true, name: true },
  });

  console.log(`📦 ${orgs.length} organizaciones encontradas`);

  for (const org of orgs) {
    const oldest = await prisma.employee.findFirst({
      where: { organizationId: org.id },
      orderBy: { createdAt: "asc" },
      select: { id: true, firstName: true, lastName: true, email: true, role: true },
    });

    if (!oldest) {
      console.log(`  ⚠️  ${org.name}: sin empleados, skip`);
      continue;
    }

    if (oldest.role === "ADMIN") {
      console.log(`  ✓ ${org.name}: ${oldest.firstName} ${oldest.lastName} ya es ADMIN`);
      continue;
    }

    await prisma.employee.update({
      where: { id: oldest.id },
      data: { role: "ADMIN" },
    });
    console.log(
      `  ↑ ${org.name}: ${oldest.firstName} ${oldest.lastName} (${oldest.email}) → ADMIN`
    );
  }

  console.log("✅ Bootstrap de roles completado.");
}

main()
  .catch((e) => {
    console.error("❌ Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
