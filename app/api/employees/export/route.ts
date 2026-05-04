import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ForbiddenError, getOrgContext } from "@/lib/tenant";
import { hasFeature } from "@/lib/features";
import { CONTRACT_TYPE_LABEL } from "@/lib/validations/employee";

/**
 * Export CSV del padrón de empleados.
 *
 * GET /api/employees/export?status=active|inactive|all
 *
 * Reglas:
 *  - Solo admin/hr (manager nunca exporta padrón).
 *  - Gateado por feature `employees.csv-export` (Business).
 *  - Default `status=active`.
 *  - Asumimos que el plan que tiene csv-export tiene también compensation y
 *    org-chart (así está hoy: las 3 viven solo en Business). Si cambiase la
 *    matriz, habría que filtrar columnas según features.
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

  if (!["admin", "hr"].includes(ctx.role)) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const enabled = await hasFeature(ctx.organizationId, "employees.csv-export");
  if (!enabled) {
    return new NextResponse(
      "El export del padrón no está disponible en tu plan.",
      { status: 403 }
    );
  }

  const status = req.nextUrl.searchParams.get("status") ?? "active";
  const where = {
    organizationId: ctx.organizationId,
    ...(status === "active" ? { isActive: true } : {}),
    ...(status === "inactive" ? { isActive: false } : {}),
  };

  const employees = await prisma.employee.findMany({
    where,
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    select: {
      firstName: true,
      lastName: true,
      email: true,
      dni: true,
      phone: true,
      birthDate: true,
      hireDate: true,
      contractType: true,
      salary: true,
      isActive: true,
      role: true,
      department: { select: { name: true } },
      position: { select: { title: true } },
      manager: { select: { firstName: true, lastName: true } },
    },
  });

  const header = [
    "Apellido",
    "Nombre",
    "Email",
    "DNI",
    "Teléfono",
    "Fecha de nacimiento",
    "Fecha de ingreso",
    "Departamento",
    "Puesto",
    "Manager",
    "Tipo de contrato",
    "Salario",
    "Rol",
    "Estado",
  ];

  const rows = employees.map((e) =>
    [
      e.lastName,
      e.firstName,
      e.email,
      e.dni ?? "",
      e.phone ?? "",
      formatDate(e.birthDate),
      formatDate(e.hireDate),
      e.department?.name ?? "",
      e.position?.title ?? "",
      e.manager ? `${e.manager.firstName} ${e.manager.lastName}` : "",
      e.contractType ? CONTRACT_TYPE_LABEL[e.contractType] : "",
      e.salary ? Number(e.salary).toFixed(2) : "",
      e.role,
      e.isActive ? "Activo" : "Inactivo",
    ].map(csvCell)
  );

  const csvLines = [header.map(csvCell).join(","), ...rows.map((r) => r.join(","))];

  // BOM UTF-8 para que Excel lea los acentos bien.
  const body = "﻿" + csvLines.join("\r\n") + "\r\n";
  const today = new Date().toISOString().slice(0, 10);
  const filename = `empleados-${today}.csv`;

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}

function formatDate(d: Date | null | undefined): string {
  if (!d) return "";
  // ISO YYYY-MM-DD: amigable para Excel y orden lexicográfico.
  return new Date(d).toISOString().slice(0, 10);
}

function csvCell(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
