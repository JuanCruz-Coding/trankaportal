import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getCurrentEmployeeId,
  getOrgContext,
  ForbiddenError,
} from "@/lib/tenant";
import { hasFeature } from "@/lib/features";

/**
 * Export CSV del reporte mensual de asistencia.
 *
 * GET /api/attendance/export?m=YYYY-MM
 *
 * Reglas:
 *  - Requiere rol admin/hr/manager (mismo que /dashboard/attendance/team).
 *  - Manager solo exporta su equipo.
 *  - Gateado por feature `attendance.export` (Business).
 *  - BOM UTF-8 al inicio para que Excel detecte el encoding correctamente.
 */
export async function GET(req: NextRequest) {
  let ctx;
  try {
    ctx = await getOrgContext();
  } catch (err) {
    if (err instanceof ForbiddenError) {
      return new NextResponse("Forbidden", { status: 403 });
    }
    throw err;
  }

  if (!["admin", "hr", "manager"].includes(ctx.role)) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const enabled = await hasFeature(ctx.organizationId, "attendance.export");
  if (!enabled) {
    return new NextResponse(
      "El export Excel no está disponible en tu plan.",
      { status: 403 }
    );
  }

  const m = req.nextUrl.searchParams.get("m");
  const parsed = parseMonthParam(m);
  if (!parsed) {
    return new NextResponse("Mes inválido. Formato esperado: YYYY-MM.", {
      status: 400,
    });
  }
  const monthStart = new Date(Date.UTC(parsed.year, parsed.month, 1));
  const monthEnd = new Date(Date.UTC(parsed.year, parsed.month + 1, 0));

  // Mismo scope que la página /team.
  let scopeFilter: { id?: { in: string[] } } = {};
  if (ctx.role === "manager") {
    const myId = await getCurrentEmployeeId();
    if (myId) {
      const subs = await prisma.employee.findMany({
        where: { organizationId: ctx.organizationId, managerId: myId },
        select: { id: true },
      });
      scopeFilter = { id: { in: [myId, ...subs.map((s) => s.id)] } };
    } else {
      scopeFilter = { id: { in: [] } };
    }
  }

  const employees = await prisma.employee.findMany({
    where: { organizationId: ctx.organizationId, ...scopeFilter },
    orderBy: [{ firstName: "asc" }],
    select: {
      firstName: true,
      lastName: true,
      email: true,
      attendanceRecords: {
        where: {
          date: { gte: monthStart, lte: monthEnd },
          totalMinutes: { not: null },
        },
        select: { totalMinutes: true },
      },
    },
  });

  const rows = employees.map((e) => {
    const days = e.attendanceRecords.length;
    const totalMin = e.attendanceRecords.reduce(
      (s, r) => s + (r.totalMinutes ?? 0),
      0
    );
    const avgMin = days > 0 ? Math.round(totalMin / days) : 0;
    return {
      name: `${e.firstName} ${e.lastName}`,
      email: e.email,
      days,
      totalHours: minutesToHoursDecimal(totalMin),
      avgHours: minutesToHoursDecimal(avgMin),
    };
  });

  const header = [
    "Empleado",
    "Email",
    "Días trabajados",
    "Total (horas)",
    "Promedio (horas/día)",
  ];

  const csvLines = [
    header.join(","),
    ...rows.map((r) =>
      [r.name, r.email, r.days.toString(), r.totalHours, r.avgHours]
        .map(csvCell)
        .join(",")
    ),
  ];

  // BOM (﻿) — sin esto Excel asume Windows-1252 y mete acentos rotos.
  const body = "﻿" + csvLines.join("\r\n") + "\r\n";
  const filename = `asistencia-${monthKey(parsed.year, parsed.month)}.csv`;

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}

function parseMonthParam(m: string | null): { year: number; month: number } | null {
  if (!m) return null;
  const match = m.match(/^(\d{4})-(\d{2})$/);
  if (!match) return null;
  const y = Number(match[1]);
  const mo = Number(match[2]) - 1;
  if (isNaN(y) || isNaN(mo) || mo < 0 || mo > 11) return null;
  return { year: y, month: mo };
}

function monthKey(year: number, month: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}`;
}

function minutesToHoursDecimal(min: number): string {
  // Excel-friendly: punto decimal, dos decimales. Ej. 480 → "8.00".
  return (min / 60).toFixed(2);
}

function csvCell(value: string): string {
  // Si contiene coma, comillas o salto de línea, encerrar entre comillas y
  // duplicar las comillas internas (RFC 4180).
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
