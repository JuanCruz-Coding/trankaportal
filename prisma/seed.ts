import "dotenv/config";
import { config as loadDotenv } from "dotenv";

// Cargar .env.local antes de importar Prisma Client (que lee DATABASE_URL).
loadDotenv({ path: ".env.local", override: true });

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// No reusamos lib/prisma.ts porque el seed corre fuera de Next y usa DIRECT_URL
// (por las dudas — si DATABASE_URL cambia de pooler, seed sigue funcionando).
const adapter = new PrismaPg(process.env.DIRECT_URL ?? process.env.DATABASE_URL!);
const prisma = new PrismaClient({ adapter });

// =========================================================================
// Catálogo global: Features + Plans + PlanFeatures.
// Las TimeOffTypes NO son globales (tienen organizationId) — se crean por org
// en el webhook `organization.created` cuando se registra una empresa.
// =========================================================================

const FEATURES = [
  { key: "employees", name: "Gestión de empleados", description: "ABM, documentos, organigrama." },
  { key: "self-service", name: "Portal del empleado", description: "Perfil propio, ausencias, documentos." },
  { key: "time-off", name: "Ausencias y vacaciones", description: "Solicitudes, aprobaciones, calendario." },
  { key: "attendance", name: "Control de asistencia", description: "Check-in/out, reportes mensuales." },
];

const PLANS = [
  {
    key: "starter",
    name: "Starter",
    maxEmployees: 25,
    features: ["employees", "self-service"],
  },
  {
    key: "pro",
    name: "Pro",
    maxEmployees: 100,
    features: ["employees", "self-service", "time-off", "attendance"],
  },
  {
    key: "business",
    name: "Business",
    maxEmployees: null, // ilimitado
    features: ["employees", "self-service", "time-off", "attendance"],
  },
];

async function main() {
  console.log("🌱 Seeding features...");
  for (const f of FEATURES) {
    await prisma.feature.upsert({
      where: { key: f.key },
      update: { name: f.name, description: f.description },
      create: f,
    });
  }
  console.log(`  ✓ ${FEATURES.length} features`);

  console.log("🌱 Seeding plans...");
  for (const p of PLANS) {
    const plan = await prisma.plan.upsert({
      where: { key: p.key },
      update: { name: p.name, maxEmployees: p.maxEmployees },
      create: { key: p.key, name: p.name, maxEmployees: p.maxEmployees },
    });

    // Sincronizar PlanFeatures: borrar existentes + crear las del seed.
    // Así si cambiás las features de un plan, se refleja sin quedar "sueltas".
    await prisma.planFeature.deleteMany({ where: { planId: plan.id } });
    const features = await prisma.feature.findMany({
      where: { key: { in: p.features } },
    });
    await prisma.planFeature.createMany({
      data: features.map((f) => ({ planId: plan.id, featureId: f.id })),
    });
    console.log(`  ✓ ${p.key} → ${p.features.join(", ")}`);
  }

  console.log("✅ Seed completado.");
}

main()
  .catch((e) => {
    console.error("❌ Error en seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
