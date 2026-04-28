"use server";

import { revalidatePath } from "next/cache";
import { EmployeeRole } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getOrgContext, requireRole } from "@/lib/tenant";
import {
  employeeCreateSchema,
  employeeUpdateSchema,
  type EmployeeCreateInput,
  type EmployeeUpdateInput,
} from "@/lib/validations/employee";

export async function createEmployee(input: EmployeeCreateInput) {
  const ctx = await getOrgContext();
  requireRole(ctx, ["admin", "hr"]);

  const data = employeeCreateSchema.parse(input);

  // Validar unicidad de email dentro de la org (el schema también lo enforces via
  // @@unique([organizationId, email]) pero damos un error legible antes del DB error).
  const clash = await prisma.employee.findFirst({
    where: { organizationId: ctx.organizationId, email: data.email },
    select: { id: true },
  });
  if (clash) {
    throw new Error(`Ya hay un empleado con email ${data.email} en esta organización.`);
  }

  const employee = await prisma.employee.create({
    data: {
      organizationId: ctx.organizationId,
      ...data,
    },
  });

  revalidatePath("/dashboard/employees");
  return employee;
}

export async function updateEmployee(id: string, input: EmployeeUpdateInput) {
  const ctx = await getOrgContext();
  requireRole(ctx, ["admin", "hr"]);

  const data = employeeUpdateSchema.parse(input);

  // Verificamos que el empleado pertenece a esta org antes de actualizar.
  // Sin esto, un user de Org A podría editar empleados de Org B si adivina un id.
  const existing = await prisma.employee.findFirst({
    where: { id, organizationId: ctx.organizationId },
    select: { id: true },
  });
  if (!existing) throw new Error("Empleado no encontrado.");

  await prisma.employee.update({ where: { id }, data });

  revalidatePath("/dashboard/employees");
  revalidatePath(`/dashboard/employees/${id}`);
}

export async function setEmployeeActive(id: string, isActive: boolean) {
  const ctx = await getOrgContext();
  requireRole(ctx, ["admin", "hr"]);

  const existing = await prisma.employee.findFirst({
    where: { id, organizationId: ctx.organizationId },
    select: { id: true },
  });
  if (!existing) throw new Error("Empleado no encontrado.");

  await prisma.employee.update({ where: { id }, data: { isActive } });

  revalidatePath("/dashboard/employees");
  revalidatePath(`/dashboard/employees/${id}`);
}

// =========================================================================
// Cambio de rol — solo ADMIN puede promover/degradar empleados.
// =========================================================================

const roleSchema = z.nativeEnum(EmployeeRole);

export async function setEmployeeRole(id: string, role: string) {
  const ctx = await getOrgContext();
  requireRole(ctx, ["admin"]);

  const newRole = roleSchema.parse(role);

  const existing = await prisma.employee.findFirst({
    where: { id, organizationId: ctx.organizationId },
    select: { id: true, role: true, clerkUserId: true },
  });
  if (!existing) throw new Error("Empleado no encontrado.");

  // Salvaguarda: no permitir que el último ADMIN se auto-degrade y la org
  // quede sin admins.
  if (existing.role === "ADMIN" && newRole !== "ADMIN") {
    const adminCount = await prisma.employee.count({
      where: { organizationId: ctx.organizationId, role: "ADMIN", isActive: true },
    });
    if (adminCount <= 1) {
      throw new Error(
        "No podés degradar al último administrador. Primero promové a otra persona."
      );
    }
  }

  await prisma.employee.update({ where: { id }, data: { role: newRole } });

  revalidatePath("/dashboard/employees");
  revalidatePath(`/dashboard/employees/${id}`);
}

// =========================================================================
// Department + Position — creación inline desde el form de empleado
// =========================================================================

export async function createDepartment(name: string): Promise<{ id: string; name: string }> {
  const ctx = await getOrgContext();
  requireRole(ctx, ["admin", "hr"]);

  const cleaned = name.trim();
  if (cleaned.length === 0) throw new Error("El nombre no puede estar vacío.");
  if (cleaned.length > 80) throw new Error("Máximo 80 caracteres.");

  const existing = await prisma.department.findUnique({
    where: { organizationId_name: { organizationId: ctx.organizationId, name: cleaned } },
    select: { id: true, name: true },
  });
  if (existing) return existing;

  const dep = await prisma.department.create({
    data: { organizationId: ctx.organizationId, name: cleaned },
    select: { id: true, name: true },
  });
  revalidatePath("/dashboard/employees");
  return dep;
}

export async function createPosition(title: string): Promise<{ id: string; title: string }> {
  const ctx = await getOrgContext();
  requireRole(ctx, ["admin", "hr"]);

  const cleaned = title.trim();
  if (cleaned.length === 0) throw new Error("El nombre no puede estar vacío.");
  if (cleaned.length > 80) throw new Error("Máximo 80 caracteres.");

  const existing = await prisma.position.findUnique({
    where: { organizationId_title: { organizationId: ctx.organizationId, title: cleaned } },
    select: { id: true, title: true },
  });
  if (existing) return existing;

  const pos = await prisma.position.create({
    data: { organizationId: ctx.organizationId, title: cleaned },
    select: { id: true, title: true },
  });
  revalidatePath("/dashboard/employees");
  return pos;
}

// =========================================================================
// Department + Position — gestión completa desde /dashboard/settings
// =========================================================================

export async function updateDepartment(id: string, name: string): Promise<void> {
  const ctx = await getOrgContext();
  requireRole(ctx, ["admin", "hr"]);

  const cleaned = name.trim();
  if (cleaned.length === 0) throw new Error("El nombre no puede estar vacío.");
  if (cleaned.length > 80) throw new Error("Máximo 80 caracteres.");

  const existing = await prisma.department.findFirst({
    where: { id, organizationId: ctx.organizationId },
    select: { id: true },
  });
  if (!existing) throw new Error("Departamento no encontrado.");

  // Si ya existe otro departamento con ese nombre en la misma org → conflicto.
  const clash = await prisma.department.findUnique({
    where: { organizationId_name: { organizationId: ctx.organizationId, name: cleaned } },
    select: { id: true },
  });
  if (clash && clash.id !== id) {
    throw new Error(`Ya existe un departamento llamado "${cleaned}".`);
  }

  await prisma.department.update({ where: { id }, data: { name: cleaned } });
  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard/employees");
}

export async function deleteDepartment(id: string): Promise<void> {
  const ctx = await getOrgContext();
  requireRole(ctx, ["admin", "hr"]);

  const dep = await prisma.department.findFirst({
    where: { id, organizationId: ctx.organizationId },
    select: { id: true, name: true, _count: { select: { employees: true } } },
  });
  if (!dep) throw new Error("Departamento no encontrado.");

  // Bloquear si hay empleados asignados — el usuario debe reasignarlos primero
  // (de lo contrario quedarían "huérfanos" con departmentId apuntando a nada).
  if (dep._count.employees > 0) {
    throw new Error(
      `No podés eliminar "${dep.name}" porque tiene ${dep._count.employees} empleado(s) asignado(s). Reasignalos primero.`
    );
  }

  await prisma.department.delete({ where: { id } });
  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard/employees");
}

export async function updatePosition(id: string, title: string): Promise<void> {
  const ctx = await getOrgContext();
  requireRole(ctx, ["admin", "hr"]);

  const cleaned = title.trim();
  if (cleaned.length === 0) throw new Error("El nombre no puede estar vacío.");
  if (cleaned.length > 80) throw new Error("Máximo 80 caracteres.");

  const existing = await prisma.position.findFirst({
    where: { id, organizationId: ctx.organizationId },
    select: { id: true },
  });
  if (!existing) throw new Error("Puesto no encontrado.");

  const clash = await prisma.position.findUnique({
    where: { organizationId_title: { organizationId: ctx.organizationId, title: cleaned } },
    select: { id: true },
  });
  if (clash && clash.id !== id) {
    throw new Error(`Ya existe un puesto llamado "${cleaned}".`);
  }

  await prisma.position.update({ where: { id }, data: { title: cleaned } });
  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard/employees");
}

export async function deletePosition(id: string): Promise<void> {
  const ctx = await getOrgContext();
  requireRole(ctx, ["admin", "hr"]);

  const pos = await prisma.position.findFirst({
    where: { id, organizationId: ctx.organizationId },
    select: { id: true, title: true, _count: { select: { employees: true } } },
  });
  if (!pos) throw new Error("Puesto no encontrado.");

  if (pos._count.employees > 0) {
    throw new Error(
      `No podés eliminar "${pos.title}" porque tiene ${pos._count.employees} empleado(s) asignado(s). Reasignalos primero.`
    );
  }

  await prisma.position.delete({ where: { id } });
  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard/employees");
}
