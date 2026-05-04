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
        select: {
          plan: { select: { name: true, key: true, maxEmployees: true } },
        },
      });
      return sub?.plan ?? null;
    },
    ["org-plan", orgId],
    { tags: [orgPlanCacheTag(orgId)], revalidate: 300 }
  )(orgId);

export async function getOrgPlan(
  organizationId: string
): Promise<{ name: string; key: string; maxEmployees: number | null } | null> {
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

// =========================================================================
// Catálogo de planes con sus features (global, no por org).
// Cambia: solo con el seed (alta de plan o cambio de PlanFeatures).
// Usado en landing page + settings.
// =========================================================================

export const plansCatalogCacheTag = "plans:catalog";

export type PlanCatalogItem = {
  id: string;
  key: string;
  name: string;
  maxEmployees: number | null;
  features: Array<{ featureId: string; feature: { key: string; name: string } }>;
};

export const getPlansCatalog = unstable_cache(
  async (): Promise<PlanCatalogItem[]> => {
    return prisma.plan.findMany({
      where: { isActive: true },
      select: {
        id: true,
        key: true,
        name: true,
        maxEmployees: true,
        features: {
          select: {
            featureId: true,
            feature: { select: { key: true, name: true } },
          },
        },
      },
      orderBy: { maxEmployees: { sort: "asc", nulls: "last" } },
    });
  },
  ["plans-catalog"],
  { tags: [plansCatalogCacheTag], revalidate: 3600 }
);

// =========================================================================
// TimeOffType catalog por org. Usado en /time-off para armar el dialog
// de "solicitar ausencia". Cambia muy poco — solo cuando HR configura un
// tipo nuevo o el seed inicial.
// =========================================================================

export const orgTimeOffTypesCacheTag = (orgId: string) =>
  `org:${orgId}:time-off-types`;

const getOrgTimeOffTypesCached = (orgId: string) =>
  unstable_cache(
    async (id: string) => {
      return prisma.timeOffType.findMany({
        where: { organizationId: id },
        orderBy: { name: "asc" },
        select: { id: true, name: true, affectsBalance: true },
      });
    },
    ["org-time-off-types", orgId],
    { tags: [orgTimeOffTypesCacheTag(orgId)], revalidate: 600 }
  )(orgId);

export async function getOrgTimeOffTypes(
  organizationId: string
): Promise<Array<{ id: string; name: string; affectsBalance: boolean }>> {
  return getOrgTimeOffTypesCached(organizationId);
}

// =========================================================================
// Departments por org (id + name). Usado en /employees/new y .../edit
// para llenar el select. NO incluye `_count.employees` — para esa variante
// /settings hace su propia query no cacheada (el count cambia seguido).
// =========================================================================

export const orgDepartmentsCacheTag = (orgId: string) =>
  `org:${orgId}:departments`;

const getOrgDepartmentsCached = (orgId: string) =>
  unstable_cache(
    async (id: string) => {
      return prisma.department.findMany({
        where: { organizationId: id },
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      });
    },
    ["org-departments", orgId],
    { tags: [orgDepartmentsCacheTag(orgId)], revalidate: 600 }
  )(orgId);

export async function getOrgDepartments(
  organizationId: string
): Promise<Array<{ id: string; name: string }>> {
  return getOrgDepartmentsCached(organizationId);
}

// =========================================================================
// Positions por org (id + title).
// =========================================================================

export const orgPositionsCacheTag = (orgId: string) =>
  `org:${orgId}:positions`;

const getOrgPositionsCached = (orgId: string) =>
  unstable_cache(
    async (id: string) => {
      return prisma.position.findMany({
        where: { organizationId: id },
        orderBy: { title: "asc" },
        select: { id: true, title: true },
      });
    },
    ["org-positions", orgId],
    { tags: [orgPositionsCacheTag(orgId)], revalidate: 600 }
  )(orgId);

export async function getOrgPositions(
  organizationId: string
): Promise<Array<{ id: string; title: string }>> {
  return getOrgPositionsCached(organizationId);
}
