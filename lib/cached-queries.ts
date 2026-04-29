import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";

/**
 * Helpers de lectura cacheados con `unstable_cache`. Para queries cuyo
 * resultado cambia poco y se consulta muchas veces (ej. dashboard home).
 *
 * Cada helper expone su tag para que las server actions que mutan ese dato
 * llamen `revalidateTag(...)` y rompan el cache al instante.
 */

// =========================================================================
// Plan name de la subscription de la org.
// Cambia: solo cuando se hace upgrade/downgrade desde settings o webhook MP.
// =========================================================================

export const orgPlanCacheTag = (orgId: string) => `org:${orgId}:plan`;

const getOrgPlanCached = (orgId: string) =>
  unstable_cache(
    async (id: string) => {
      const sub = await prisma.subscription.findUnique({
        where: { organizationId: id },
        select: { plan: { select: { name: true, key: true } } },
      });
      return sub?.plan ?? null;
    },
    ["org-plan", orgId],
    { tags: [orgPlanCacheTag(orgId)], revalidate: 300 }
  )(orgId);

export async function getOrgPlan(
  organizationId: string
): Promise<{ name: string; key: string } | null> {
  return getOrgPlanCached(organizationId);
}

// =========================================================================
// Active employee count.
// Cambia: cuando se crea un empleado o se activa/desactiva uno.
// =========================================================================

export const orgActiveEmployeeCountCacheTag = (orgId: string) =>
  `org:${orgId}:employees:count`;

const getOrgActiveEmployeeCountCached = (orgId: string) =>
  unstable_cache(
    async (id: string) => {
      return prisma.employee.count({
        where: { organizationId: id, isActive: true },
      });
    },
    ["org-active-employee-count", orgId],
    { tags: [orgActiveEmployeeCountCacheTag(orgId)], revalidate: 300 }
  )(orgId);

export async function getOrgActiveEmployeeCount(
  organizationId: string
): Promise<number> {
  return getOrgActiveEmployeeCountCached(organizationId);
}
