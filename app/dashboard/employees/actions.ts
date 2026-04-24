"use server";

import { revalidatePath } from "next/cache";
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
