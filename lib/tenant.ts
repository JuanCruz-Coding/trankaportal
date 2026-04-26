import { cache } from "react";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import {
  ensureEmployeeSynced,
  ensureOrganizationSynced,
} from "@/lib/org-sync";

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
 *  - Si la Organization existe en Clerk pero no en nuestra DB → lazy-sync la crea
 *    on-the-fly desde Clerk API (fallback al webhook).
 *
 * **Esta es la ÚNICA forma en la que el resto del código debe obtener `organizationId`.**
 * Todas las queries Prisma tenant-safe hacen `where: { organizationId: ctx.organizationId }`.
 *
 * Cacheado por request (react.cache) — múltiples llamadas en un mismo render
 * comparten el resultado.
 */
export const getOrgContext = cache(async (): Promise<OrgContext> => {
  const { userId, orgId, orgRole } = await auth();

  if (!userId) throw new UnauthenticatedError();
  if (!orgId) throw new NoOrgSelectedError();

  // Lazy-sync: si la org no está en DB, la creamos desde Clerk API.
  // Esto cubre el race condition entre Clerk crear la org y el webhook llegar.
  const org = await ensureOrganizationSynced(orgId);

  return {
    clerkUserId: userId,
    clerkOrgId: orgId,
    organizationId: org.id,
    role: normalizeRole(orgRole),
  };
});

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
 * Devuelve el Employee.id del usuario logueado (resolviendo por clerkUserId).
 * Útil para queries "me muestra solo lo mío" — por ejemplo, un Manager
 * viendo solo sus subordinados.
 *
 * Si el Employee no existe en DB, lo lazy-syncea desde Clerk API (fallback
 * al webhook organizationMembership.created).
 *
 * Devuelve null solo si Clerk API falla o si la cuenta de Clerk no responde.
 *
 * Cacheado por request.
 */
export const getCurrentEmployeeId = cache(async (): Promise<string | null> => {
  const ctx = await getOrgContext();
  try {
    const emp = await ensureEmployeeSynced(ctx.clerkUserId, ctx.organizationId);
    return emp.id;
  } catch (err) {
    console.error("[tenant] No se pudo obtener/crear Employee:", err);
    return null;
  }
});

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
