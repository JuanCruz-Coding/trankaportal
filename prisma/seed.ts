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
//
// Las features son sub-granulares (`module.subfeature`). Las "base" del módulo
// (`employees`, `self-service`, `time-off`, `attendance`) representan el módulo
// completo y son las que las páginas raíz gatean. Las sub-features gatean
// secciones internas o vistas específicas.
//
// Cuando una feature aún no está implementada en código (ej. `attendance.geo`),
// se sigue sembrando para dejar la matriz comercial completa. El gateo aparece
// recién cuando se implemente.
// =========================================================================

type PlanKey = "starter" | "pro" | "business";

const FEATURES: Array<{
  key: string;
  name: string;
  description: string;
  plans: PlanKey[];
}> = [
  // ── Empleados ──────────────────────────────────────────────────────────
  {
    key: "employees",
    name: "Gestión de empleados",
    description: "ABM, departamentos y puestos.",
    plans: ["starter", "pro", "business"],
  },
  {
    key: "employees.documents",
    name: "Documentos por empleado",
    description: "Subida y descarga de documentos en la ficha del empleado.",
    plans: ["pro", "business"],
  },
  {
    key: "employees.compensation",
    name: "Compensación y contrato",
    description: "Salario y tipo de contrato en la ficha laboral.",
    plans: ["pro", "business"],
  },
  {
    key: "employees.org-chart",
    name: "Organigrama (manager)",
    description: "Asignación de manager y relaciones de reporte.",
    plans: ["pro", "business"],
  },
  {
    key: "employees.org-chart-visual",
    name: "Organigrama visual",
    description: "Vista gráfica del organigrama con jerarquía expandible.",
    plans: ["business"],
  },
  {
    key: "employees.csv-export",
    name: "Export / import masivo",
    description: "Export CSV del padrón e import masivo de altas.",
    plans: ["business"],
  },
  {
    key: "employees.custom-fields",
    name: "Campos personalizados",
    description: "Definir campos extra en la ficha del empleado.",
    plans: ["business"],
  },
  {
    key: "employees.audit-log",
    name: "Historial de cambios",
    description: "Audit log de modificaciones por empleado.",
    plans: ["business"],
  },

  // ── Portal del empleado (self-service) ─────────────────────────────────
  // Nota: las acciones del empleado (pedir vacaciones, ver asistencia propia)
  // se gatean implícitamente con el módulo correspondiente (`time-off`,
  // `attendance`). No hace falta una sub-feature dedicada salvo que querramos
  // un plan donde el módulo esté pero los empleados no puedan auto-servirse.
  {
    key: "self-service",
    name: "Portal del empleado",
    description: "Perfil propio, edición de datos personales.",
    plans: ["starter", "pro", "business"],
  },
  {
    key: "self-service.documents",
    name: "Documentos propios",
    description: "El empleado descarga sus documentos desde el portal.",
    plans: ["pro", "business"],
  },
  {
    key: "self-service.payroll-signature",
    name: "Firma digital de recibos",
    description: "Aceptación digital de recibos de sueldo.",
    plans: ["business"],
  },

  // ── Time-off ───────────────────────────────────────────────────────────
  {
    key: "time-off",
    name: "Ausencias y vacaciones",
    description: "Solicitudes, aprobación de 1 nivel y balances anuales.",
    plans: ["pro", "business"],
  },
  {
    key: "time-off.calendar",
    name: "Calendario de equipo",
    description: "Vista mensual de quién está ausente.",
    plans: ["pro", "business"],
  },
  {
    key: "time-off.multi-approval",
    name: "Aprobación multi-nivel",
    description: "Cadenas de aprobación por departamento o monto.",
    plans: ["business"],
  },
  {
    key: "time-off.carry-over",
    name: "Carry-over de días",
    description: "Acumulación de días no usados al año siguiente.",
    plans: ["business"],
  },
  {
    key: "time-off.holidays",
    name: "Feriados configurables",
    description: "Calendario de feriados por sede o región.",
    plans: ["business"],
  },

  // ── Attendance ─────────────────────────────────────────────────────────
  {
    key: "attendance",
    name: "Control de asistencia",
    description: "Check-in/out manual y reportes mensuales por empleado.",
    plans: ["pro", "business"],
  },
  {
    key: "attendance.team-view",
    name: "Vista de equipo",
    description: "Tablero de asistencia del equipo en tiempo real.",
    plans: ["pro", "business"],
  },
  {
    key: "attendance.shifts",
    name: "Turnos y horarios",
    description: "Horarios configurables por empleado o turno.",
    plans: ["business"],
  },
  {
    key: "attendance.geo",
    name: "Geolocalización",
    description: "Validar ubicación al fichar.",
    plans: ["business"],
  },
  {
    key: "attendance.ip-whitelist",
    name: "Restricción por IP",
    description: "Solo permitir fichaje desde redes autorizadas.",
    plans: ["business"],
  },
  {
    key: "attendance.overtime-approval",
    name: "Aprobación de horas extras",
    description: "Workflow de revisión y aprobación de horas extras.",
    plans: ["business"],
  },
  {
    key: "attendance.export",
    name: "Export Excel",
    description: "Exportar reportes de asistencia a Excel.",
    plans: ["business"],
  },

  // ── Comunicación / notificaciones ──────────────────────────────────────
  {
    key: "email-notifications",
    name: "Notificaciones por email",
    description: "Disparar emails ante eventos del sistema.",
    plans: ["pro", "business"],
  },
  {
    key: "announcements",
    name: "Anuncios internos",
    description: "Comunicados internos visibles en el dashboard.",
    plans: ["pro", "business"],
  },

  // ── Recibos de sueldo ──────────────────────────────────────────────────
  {
    key: "payroll",
    name: "Recibos de sueldo",
    description: "Subida masiva de recibos y portal del empleado.",
    plans: ["pro", "business"],
  },

  // ── Reportes ───────────────────────────────────────────────────────────
  {
    key: "reports.basic",
    name: "Reportes básicos",
    description: "Headcount, ausentismo simple, asistencia mensual.",
    plans: ["pro", "business"],
  },
  {
    key: "reports.advanced",
    name: "Analytics avanzado",
    description: "Rotación, costo laboral, dashboards configurables.",
    plans: ["business"],
  },

  // ── Procesos ───────────────────────────────────────────────────────────
  {
    key: "onboarding",
    name: "Onboarding / Offboarding",
    description: "Checklists de tareas para alta y baja de empleados.",
    plans: ["business"],
  },
  {
    key: "performance-reviews",
    name: "Evaluaciones de desempeño",
    description: "Ciclos de evaluación, 1:1s, objetivos.",
    plans: ["business"],
  },

  // ── Integraciones ──────────────────────────────────────────────────────
  {
    key: "integrations",
    name: "Integraciones",
    description: "API pública, webhooks y exports externos.",
    plans: ["business"],
  },
];

const PLANS: Array<{ key: PlanKey; name: string; maxEmployees: number | null }> = [
  { key: "starter", name: "Starter", maxEmployees: 25 },
  { key: "pro", name: "Pro", maxEmployees: 150 },
  { key: "business", name: "Business", maxEmployees: null },
];

async function main() {
  // Limpiar features obsoletas: las que existen en DB pero ya no están en
  // el array FEATURES. Cascade borra sus PlanFeatures asociadas.
  // El array FEATURES es la fuente de verdad — si una key se quita acá,
  // se va de la DB en el próximo seed.
  const validKeys = FEATURES.map((f) => f.key);
  const removed = await prisma.feature.deleteMany({
    where: { key: { notIn: validKeys } },
  });
  if (removed.count > 0) {
    console.log(`🧹 Removidas ${removed.count} feature(s) obsoleta(s).`);
  }

  console.log("🌱 Seeding features...");
  for (const f of FEATURES) {
    await prisma.feature.upsert({
      where: { key: f.key },
      update: { name: f.name, description: f.description },
      create: { key: f.key, name: f.name, description: f.description },
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
    const planFeatureKeys = FEATURES.filter((f) => f.plans.includes(p.key)).map((f) => f.key);
    const features = await prisma.feature.findMany({
      where: { key: { in: planFeatureKeys } },
    });
    await prisma.planFeature.createMany({
      data: features.map((f) => ({ planId: plan.id, featureId: f.id })),
    });
    console.log(`  ✓ ${p.key} → ${features.length} features`);
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
