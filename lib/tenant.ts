import { cache } from "react";
import { auth } from "@clerk/nextjs/server";
import { EmployeeRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  ensureEmployeeSynced,
  ensureOrganizationSynced,
  fastFetchOrgAndEmployee,
} from "@/lib/org-sync";

export type OrgRole = "admin" | "hr" | "manager" | "employee";

export type OrgContext = {
  clerkUserId: string;
  clerkOrgId: string;
  organizationId: string;
  organizationName: string;
  organizationTimezone: string;
  role: OrgRole;
  employeeId: string;
};

/**
 * Resuelve el contexto de tenant del request actual.
 *
 * Performance:
 *  - Happy path (org+employee ya sincronizados): 1 query con join.
 *  - Fallback (primer login post-Clerk): 2 queries (ensureOrg + ensureEmp) + Clerk API.
 *  - Cacheado por request via react.cache.
 *
 * Authorization:
 *  - Auth viene de Clerk (userId, orgId). Authorization (role) viene de DB.
 */
export const getOrgContext = cache(async (): Promise<OrgContext> => {
  const { userId, orgId, orgRole } = await auth();

  if (!userId) throw new UnauthenticatedError();
  if (!orgId) throw new NoOrgSelectedError();

  // Fast path: 1 query
  const fast = await fastFetchOrgAndEmployee(userId, orgId);
  if (fast) {
    return {
      clerkUserId: userId,
      clerkOrgId: orgId,
      organizationId: fast.organizationId,
      organizationName: fast.organizationName,
      organizationTimezone: fast.organizationTimezone,
      role: dbRoleToOrgRole(fast.employeeRole),
      employeeId: fast.employeeId,
    };
  }

  // Fallback: lazy-sync. Sucede en el primer request post sign-up + create org.
  const org = await ensureOrganizationSynced(orgId);
  const emp = await ensureEmployeeSynced(userId, org.id, {
    defaultClerkRole: orgRole,
  });
  return {
    clerkUserId: userId,
    clerkOrgId: orgId,
    organizationId: org.id,
    organizationName: org.name,
    organizationTimezone: org.timezone,
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
 * Internamente usa getOrgContext (cacheado). No agrega queries.
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

/** @deprecated Con lazy-sync ya no debería ocurrir. */
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
