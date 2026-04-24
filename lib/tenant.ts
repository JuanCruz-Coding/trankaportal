import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export type OrgRole = "admin" | "hr" | "manager" | "employee";

export type OrgContext = {
  clerkUserId: string;
  clerkOrgId: string;
  organizationId: string; // id interno en nuestra DB (no el de Clerk)
  role: OrgRole;
};

/**
 * Resuelve el contexto de tenant del request actual a partir de la sesión de Clerk.
 *
 * Reglas:
 *  - Si no hay sesión → lanza `UnauthenticatedError`.
 *  - Si hay sesión pero el user no eligió una Organization activa → lanza `NoOrgSelectedError`.
 *  - Si la Organization existe en Clerk pero no en nuestra DB → lanza `OrgNotSyncedError`
 *    (el webhook debería haberla creado; si no, investigar).
 *
 * **Esta es la ÚNICA forma en la que el resto del código debe obtener `organizationId`.**
 * Todas las queries Prisma tenant-safe hacen `where: { organizationId: ctx.organizationId }`.
 */
export async function getOrgContext(): Promise<OrgContext> {
  const { userId, orgId, orgRole } = await auth();

  if (!userId) throw new UnauthenticatedError();
  if (!orgId) throw new NoOrgSelectedError();

  const org = await prisma.organization.findUnique({
    where: { clerkOrgId: orgId },
    select: { id: true },
  });
  if (!org) throw new OrgNotSyncedError(orgId);

  return {
    clerkUserId: userId,
    clerkOrgId: orgId,
    organizationId: org.id,
    role: normalizeRole(orgRole),
  };
}

/**
 * Variante que devuelve `null` en vez de tirar si no hay contexto. Útil cuando
 * querés render condicional (ej. "si está logueado, mostrar esto").
 */
export async function tryGetOrgContext(): Promise<OrgContext | null> {
  try {
    return await getOrgContext();
  } catch {
    return null;
  }
}

/**
 * Exige que el rol del usuario esté en la lista permitida.
 * Usar en endpoints/pages: `requireRole(ctx, ["admin", "hr"])`.
 */
export function requireRole(ctx: OrgContext, allowed: OrgRole[]): void {
  if (!allowed.includes(ctx.role)) {
    throw new ForbiddenError(`Rol '${ctx.role}' no autorizado. Requiere: ${allowed.join(", ")}`);
  }
}

// =========================================================================
// Normalización del rol
// =========================================================================
// Clerk prefija los roles de organización con "org:" (ej. "org:admin").
// Para simplificar el resto del código, devolvemos el rol "pelado".
function normalizeRole(raw: string | null | undefined): OrgRole {
  const v = (raw ?? "").replace(/^org:/, "").toLowerCase();
  if (v === "admin" || v === "hr" || v === "manager" || v === "employee") return v;
  // Rol desconocido → tratar como EMPLOYEE (principio de menor privilegio).
  return "employee";
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
