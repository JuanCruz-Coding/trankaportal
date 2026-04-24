"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentEmployeeId, getOrgContext } from "@/lib/tenant";

/**
 * Devuelve el "día de hoy" en la timezone de la org, como Date a las 00:00 UTC.
 * Prisma mapea esto a la columna @db.Date de AttendanceRecord sin drift de TZ.
 *
 * Ejemplo: si la org está en America/Argentina/Buenos_Aires (UTC-3) y son las
 * 23:00 del 28/04 local, en UTC son las 02:00 del 29/04. "Hoy en la org" = 28/04.
 */
function todayDateInTz(tz: string): Date {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = fmt.formatToParts(new Date());
  const y = parts.find((p) => p.type === "year")!.value;
  const m = parts.find((p) => p.type === "month")!.value;
  const d = parts.find((p) => p.type === "day")!.value;
  return new Date(`${y}-${m}-${d}T00:00:00.000Z`);
}

async function orgTimezone(organizationId: string): Promise<string> {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { timezone: true },
  });
  return org?.timezone ?? "America/Argentina/Buenos_Aires";
}

// =========================================================================
// checkIn / checkOut — cualquier empleado sobre su propia jornada
// =========================================================================

export async function checkIn() {
  const ctx = await getOrgContext();
  const myId = await getCurrentEmployeeId();
  if (!myId) throw new Error("No se encontró tu ficha de empleado.");

  const tz = await orgTimezone(ctx.organizationId);
  const date = todayDateInTz(tz);
  const now = new Date();

  const existing = await prisma.attendanceRecord.findUnique({
    where: { employeeId_date: { employeeId: myId, date } },
    select: { id: true, checkOut: true },
  });

  if (existing) {
    if (existing.checkOut) throw new Error("Ya terminaste tu jornada de hoy.");
    throw new Error("Ya iniciaste tu jornada hoy.");
  }

  await prisma.attendanceRecord.create({
    data: {
      organizationId: ctx.organizationId,
      employeeId: myId,
      date,
      checkIn: now,
    },
  });

  revalidatePath("/dashboard/attendance");
}

export async function checkOut() {
  const ctx = await getOrgContext();
  const myId = await getCurrentEmployeeId();
  if (!myId) throw new Error("No se encontró tu ficha de empleado.");

  const tz = await orgTimezone(ctx.organizationId);
  const date = todayDateInTz(tz);
  const now = new Date();

  const record = await prisma.attendanceRecord.findUnique({
    where: { employeeId_date: { employeeId: myId, date } },
  });
  if (!record) throw new Error("Todavía no iniciaste tu jornada de hoy.");
  if (record.checkOut) throw new Error("Ya terminaste tu jornada de hoy.");

  const totalMinutes = Math.round(
    (now.getTime() - record.checkIn.getTime()) / 60000
  );

  await prisma.attendanceRecord.update({
    where: { id: record.id },
    data: { checkOut: now, totalMinutes },
  });

  revalidatePath("/dashboard/attendance");
}
