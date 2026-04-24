/**
 * Seed de datos demo: poblá la primera organización con empleados, departamentos,
 * puestos, solicitudes de ausencia y registros de asistencia, todos realistas.
 *
 * Uso:
 *   npx tsx scripts/demo-seed.ts
 *
 * Idempotente: empleados creados con email "*@demo.local" se borran al re-correr,
 * así que se puede ejecutar múltiples veces sin acumular basura.
 */

import "dotenv/config";
import { config as loadDotenv } from "dotenv";
loadDotenv({ path: ".env.local", override: true });

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg(process.env.DIRECT_URL ?? process.env.DATABASE_URL!);
const prisma = new PrismaClient({ adapter });

const DEMO_TAG = "@demo.local";

// =========================================================================
// Datos demo
// =========================================================================

const DEPARTMENTS = ["Desarrollo", "Ventas", "Marketing", "Operaciones", "Recursos Humanos"];

const POSITIONS = [
  "CEO",
  "Lead Developer",
  "Desarrollador Senior",
  "Desarrollador Junior",
  "Diseñador UX",
  "Vendedor",
  "Gerente de Ventas",
  "Analista de Marketing",
  "Contadora",
];

type Emp = {
  firstName: string;
  lastName: string;
  dept: string;
  position: string;
  contract: "FULL_TIME" | "PART_TIME" | "CONTRACTOR" | "INTERN";
  salary: number;
  manager: string | null; // "FirstName LastName" o null
  hireYear: number;
};

const EMPLOYEES: Emp[] = [
  // Top: CEO
  { firstName: "Roberto", lastName: "Fernández", dept: "Operaciones", position: "CEO", contract: "FULL_TIME", salary: 3500000, manager: null, hireYear: 2018 },

  // Managers (reportan al CEO)
  { firstName: "Carla", lastName: "Giménez", dept: "Desarrollo", position: "Lead Developer", contract: "FULL_TIME", salary: 2200000, manager: "Roberto Fernández", hireYear: 2019 },
  { firstName: "Diego", lastName: "Sosa", dept: "Ventas", position: "Gerente de Ventas", contract: "FULL_TIME", salary: 2100000, manager: "Roberto Fernández", hireYear: 2020 },
  { firstName: "Mariana", lastName: "Castro", dept: "Recursos Humanos", position: "Contadora", contract: "FULL_TIME", salary: 1800000, manager: "Roberto Fernández", hireYear: 2020 },

  // Equipo de desarrollo (reportan a Carla)
  { firstName: "Lucas", lastName: "Méndez", dept: "Desarrollo", position: "Desarrollador Senior", contract: "FULL_TIME", salary: 1700000, manager: "Carla Giménez", hireYear: 2021 },
  { firstName: "Sofía", lastName: "Pereyra", dept: "Desarrollo", position: "Desarrollador Senior", contract: "FULL_TIME", salary: 1700000, manager: "Carla Giménez", hireYear: 2022 },
  { firstName: "Tomás", lastName: "Aguirre", dept: "Desarrollo", position: "Desarrollador Junior", contract: "FULL_TIME", salary: 950000, manager: "Carla Giménez", hireYear: 2024 },
  { firstName: "Valentina", lastName: "López", dept: "Marketing", position: "Diseñador UX", contract: "PART_TIME", salary: 700000, manager: "Carla Giménez", hireYear: 2023 },

  // Equipo de ventas (reportan a Diego)
  { firstName: "Martín", lastName: "Romero", dept: "Ventas", position: "Vendedor", contract: "FULL_TIME", salary: 900000, manager: "Diego Sosa", hireYear: 2022 },
  { firstName: "Florencia", lastName: "Ruiz", dept: "Ventas", position: "Vendedor", contract: "FULL_TIME", salary: 900000, manager: "Diego Sosa", hireYear: 2023 },
  { firstName: "Sebastián", lastName: "Torres", dept: "Marketing", position: "Analista de Marketing", contract: "FULL_TIME", salary: 1100000, manager: "Diego Sosa", hireYear: 2022 },

  // Standalone (reporta a Roberto)
  { firstName: "Camila", lastName: "Sánchez", dept: "Recursos Humanos", position: "Contadora", contract: "CONTRACTOR", salary: 1400000, manager: "Roberto Fernández", hireYear: 2024 },
];

// =========================================================================
// Main
// =========================================================================

function emailFor(e: { firstName: string; lastName: string }): string {
  const slug = (s: string) =>
    s
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z]/g, "");
  return `${slug(e.firstName)}.${slug(e.lastName)}${DEMO_TAG}`;
}

function randomDateThisYear(): Date {
  const start = new Date(new Date().getFullYear(), 0, 1).getTime();
  const now = Date.now();
  return new Date(start + Math.random() * (now - start));
}

function isWeekend(d: Date): boolean {
  const dow = d.getDay();
  return dow === 0 || dow === 6;
}

function dateUTC(y: number, m: number, d: number): Date {
  return new Date(Date.UTC(y, m, d));
}

async function main() {
  const orgs = await prisma.organization.findMany({
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true },
  });

  if (orgs.length === 0) {
    console.error("❌ No hay organizaciones. Registrate primero en la app y creá una.");
    process.exit(1);
  }

  const org = orgs[0];
  console.log(`📦 Seeding demo en org: ${org.name} (${org.id})`);

  // Limpiar empleados demo previos (cascada borra docs/balances/requests/attendance).
  const deleted = await prisma.employee.deleteMany({
    where: { organizationId: org.id, email: { endsWith: DEMO_TAG } },
  });
  if (deleted.count > 0) console.log(`  🧹 Borrados ${deleted.count} empleados demo previos`);

  // Departments + Positions (upsert, no se duplican).
  const depMap = new Map<string, string>();
  for (const name of DEPARTMENTS) {
    const r = await prisma.department.upsert({
      where: { organizationId_name: { organizationId: org.id, name } },
      update: {},
      create: { organizationId: org.id, name },
      select: { id: true },
    });
    depMap.set(name, r.id);
  }
  console.log(`  ✓ ${DEPARTMENTS.length} departamentos`);

  const posMap = new Map<string, string>();
  for (const title of POSITIONS) {
    const r = await prisma.position.upsert({
      where: { organizationId_title: { organizationId: org.id, title } },
      update: {},
      create: { organizationId: org.id, title },
      select: { id: true },
    });
    posMap.set(title, r.id);
  }
  console.log(`  ✓ ${POSITIONS.length} puestos`);

  // Empleados — pass 1: crear sin managerId.
  const empIdByName = new Map<string, string>();
  for (const e of EMPLOYEES) {
    const r = await prisma.employee.create({
      data: {
        organizationId: org.id,
        firstName: e.firstName,
        lastName: e.lastName,
        email: emailFor(e),
        positionId: posMap.get(e.position) ?? null,
        departmentId: depMap.get(e.dept) ?? null,
        contractType: e.contract,
        salary: e.salary,
        hireDate: dateUTC(e.hireYear, 0, 15 + Math.floor(Math.random() * 14)),
        phone: `+54911${Math.floor(10000000 + Math.random() * 90000000)}`,
      },
      select: { id: true },
    });
    empIdByName.set(`${e.firstName} ${e.lastName}`, r.id);
  }

  // Pass 2: setear managerId.
  let managersAssigned = 0;
  for (const e of EMPLOYEES) {
    if (!e.manager) continue;
    const myId = empIdByName.get(`${e.firstName} ${e.lastName}`);
    const managerId = empIdByName.get(e.manager);
    if (myId && managerId) {
      await prisma.employee.update({ where: { id: myId }, data: { managerId } });
      managersAssigned++;
    }
  }
  console.log(`  ✓ ${EMPLOYEES.length} empleados (${managersAssigned} con manager asignado)`);

  // TimeOff requests — necesitamos los TimeOffType de la org (los crea el webhook).
  const types = await prisma.timeOffType.findMany({
    where: { organizationId: org.id },
    select: { id: true, key: true, affectsBalance: true },
  });
  const vacationType = types.find((t) => t.key === "vacation");
  const sickType = types.find((t) => t.key === "sick");

  if (vacationType && sickType) {
    const requestsToCreate = [
      // Aprobada en el pasado (Sofía, vacation 5 días)
      { name: "Sofía Pereyra", typeId: vacationType.id, days: 5, startOffset: -45, status: "APPROVED" as const, reason: "Vacaciones de invierno" },
      // Aprobada futura (Lucas, vacation 7 días)
      { name: "Lucas Méndez", typeId: vacationType.id, days: 7, startOffset: 30, status: "APPROVED" as const, reason: null },
      // Pendiente (Tomás)
      { name: "Tomás Aguirre", typeId: vacationType.id, days: 3, startOffset: 14, status: "PENDING" as const, reason: "Casamiento de un primo" },
      // Pendiente (Florencia)
      { name: "Florencia Ruiz", typeId: vacationType.id, days: 5, startOffset: 60, status: "PENDING" as const, reason: null },
      // Rechazada (Martín)
      { name: "Martín Romero", typeId: vacationType.id, days: 10, startOffset: 7, status: "REJECTED" as const, reason: "Demasiados días tan pronto", note: "Cierre de mes" },
      // Sick aprobada (Valentina)
      { name: "Valentina López", typeId: sickType.id, days: 2, startOffset: -10, status: "APPROVED" as const, reason: "Gripe" },
    ];

    let createdRequests = 0;
    for (const r of requestsToCreate) {
      const empId = empIdByName.get(r.name);
      if (!empId) continue;

      const start = new Date();
      start.setDate(start.getDate() + r.startOffset);
      const end = new Date(start);
      // r.days es nominal — usamos days-1 hábiles si lo aplicáramos, pero para
      // la demo metemos r.days días corridos (cercano a hábiles si excluyo findes).
      end.setDate(end.getDate() + (r.days - 1));

      await prisma.timeOffRequest.create({
        data: {
          organizationId: org.id,
          employeeId: empId,
          typeId: r.typeId,
          startDate: start,
          endDate: end,
          totalDays: r.days,
          reason: r.reason,
          status: r.status,
          ...(r.status === "APPROVED" || r.status === "REJECTED"
            ? {
                reviewedAt: new Date(),
                reviewedByEmployeeId: empIdByName.get("Roberto Fernández") ?? null,
                reviewNote: "note" in r ? (r as { note?: string }).note ?? null : null,
              }
            : {}),
        },
      });

      // Si es vacaciones aprobada, descontar saldo (lazy-create).
      if (r.status === "APPROVED" && r.typeId === vacationType.id) {
        const year = start.getFullYear();
        await prisma.timeOffBalance.upsert({
          where: { employeeId_year: { employeeId: empId, year } },
          update: { usedDays: { increment: r.days } },
          create: { organizationId: org.id, employeeId: empId, year, totalDays: 14, usedDays: r.days },
        });
      }
      createdRequests++;
    }
    console.log(`  ✓ ${createdRequests} solicitudes de ausencia`);
  }

  // Attendance: últimos 5 días hábiles, todos los empleados.
  let attendanceCreated = 0;
  const today = new Date();
  const last5BusinessDays: Date[] = [];
  const cur = new Date(today);
  cur.setDate(cur.getDate() - 1); // empezamos ayer
  while (last5BusinessDays.length < 5) {
    if (!isWeekend(cur)) {
      last5BusinessDays.push(new Date(cur));
    }
    cur.setDate(cur.getDate() - 1);
  }

  for (const e of EMPLOYEES) {
    const empId = empIdByName.get(`${e.firstName} ${e.lastName}`);
    if (!empId) continue;
    for (const day of last5BusinessDays) {
      // 80% asistió ese día (algunos días faltan, simula realidad).
      if (Math.random() < 0.2) continue;

      // Check-in entre 8:30 y 9:30 random
      const checkIn = new Date(day);
      checkIn.setUTCHours(8, 30 + Math.floor(Math.random() * 60), 0, 0);
      // Check-out 8-9hs después
      const totalMinutes = 8 * 60 + Math.floor(Math.random() * 90);
      const checkOut = new Date(checkIn.getTime() + totalMinutes * 60000);

      const dateOnly = dateUTC(day.getFullYear(), day.getMonth(), day.getDate());
      try {
        await prisma.attendanceRecord.create({
          data: {
            organizationId: org.id,
            employeeId: empId,
            date: dateOnly,
            checkIn,
            checkOut,
            totalMinutes,
          },
        });
        attendanceCreated++;
      } catch {
        // ignore unique constraint si ya existía
      }
    }
  }
  console.log(`  ✓ ${attendanceCreated} registros de asistencia`);

  console.log("✅ Seed demo completado.");
}

main()
  .catch((e) => {
    console.error("❌ Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
