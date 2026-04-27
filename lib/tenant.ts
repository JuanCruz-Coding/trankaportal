import { cache } from "react";
import { auth } from "@clerk/nextjs/server";
import { EmployeeRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  ensureEmployeeSynced,
  ensureOrganizationSynced,
} from "@/lib/org-sync";

export type OrgRole = "admin" | "hr" | "manager" | "employee";

export type OrgContext = {
  clerkUserId: string;
  clerkOrgId: string;
  organizationId: string;
  role: OrgRole;
  /** Employee.id del usuario en la DB. Siempre seteado tras lazy-sync. */
  employeeId: string;
};

/**
 * Resuelve el contexto de tenant del request actual.
 *
 * - Auth viene de Clerk (userId, orgId).
 * - Authorization (role) viene de **nuestra DB** (Employee.role).
 *   Clerk solo se usa como semilla en la primera creación del Employee:
 *   si en Clerk el user es `admin`, en DB arranca como ADMIN; sino EMPLOYEE.
 *   Después un ADMIN puede cambiarlo desde la app y la DB es la verdad.
 *
 * Cacheado por request.
 */
export const getOrgContext = cache(async (): Promise<OrgContext> => {
  const { userId, orgId, orgRole } = await auth();

  if (!userId) throw new UnauthenticatedError();
  if (!orgId) throw new NoOrgSelectedError();

  const org = await ensureOrganizationSynced(orgId);
  const emp = await ensureEmployeeSynced(userId, org.id, {
    defaultClerkRole: orgRole,
  });

  return {
    clerkUserId: userId,
    clerkOrgId: orgId,
    organizationId: org.id,
    role: dbRoleToOrgRole(emp.role),
    employeeId: emp.id,
  };
});

export async function tryGetOrgContext(): Promise<OrgContext | null> {
  try {
    return await getOrgContext();
  } catch {
    return null;
  }
}

/**
 * Devuelve el Employee.id del usuario logueado.
 *
 * Mantenida por compatibilidad con código pre-refactor. Internamente lo lee de
 * `getOrgContext().employeeId` (no hace una query extra — está cacheado).
 */
export const getCurrentEmployeeId = cache(async (): Promise<string | null> => {
  try {
    const ctx = await getOrgContext();
    return ctx.employeeId;
  } catch {
    return null;
  }
});

export function requireRole(ctx: OrgContext, allowed: OrgRole[]): void {
  if (!allowed.includes(ctx.role)) {
    throw new ForbiddenError(`Rol '${ctx.role}' no autorizado. Requiere: ${allowed.join(", ")}`);
  }
}

// =========================================================================
// Mapeo enum DB ↔ tipo TS
// =========================================================================

function dbRoleToOrgRole(role: EmployeeRole): OrgRole {
  switch (role) {
    case "ADMIN":
      return "admin";
    case "HR":
      return "hr";
    case "MANAGER":
      return "manager";
    case "EMPLOYEE":
    default:
      return "employee";
  }
}

export function orgRoleToDbRole(role: OrgRole): EmployeeRole {
  switch (role) {
    case "admin":
      return "ADMIN";
    case "hr":
      return "HR";
    case "manager":
      return "MANAGER";
    case "employee":
    default:
      return "EMPLOYEE";
  }
}

// =========================================================================
// Errores tipados
// =========================================================================

export class UnauthenticatedError extends Error {
  constructor() {
    super("No hay sesión activa.");
    this.name = "UnauthenticatedError";
  }
}

export class NoOrgSelectedError extends Error {
  constructor() {
    super("El usuario no seleccionó una organización.");
    this.name = "NoOrgSelectedError";
  }
}

/**
 * @deprecated Con lazy-sync activo, este error ya no debería ocurrir en práctica.
 * Mantenido por compatibilidad de tipo en pages que lo importan.
 */
export class OrgNotSyncedError extends Error {
  constructor(clerkOrgId: string) {
    super(`La organización ${clerkOrgId} existe en Clerk pero no en la DB.`);
    this.name = "OrgNotSyncedError";
  }
}

export class ForbiddenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ForbiddenError";
  }
}
