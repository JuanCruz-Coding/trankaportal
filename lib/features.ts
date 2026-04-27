import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";

export type FeatureKey = "employees" | "self-service" | "time-off" | "attendance";

export const FEATURE_KEYS: FeatureKey[] = [
  "employees",
  "self-service",
  "time-off",
  "attendance",
];

/**
 * Tag para invalidar la caché de features de una org. Usar:
 *   revalidateTag(orgFeaturesCacheTag(orgId))
 * desde server actions que cambian el plan o subscription status.
 */
export const orgFeaturesCacheTag = (orgId: string) => `org:${orgId}:features`;

/**
 * Lista de feature keys activas de una org. Cacheada cross-request por
 * `unstable_cache` con tag por orgId. TTL 5 minutos como red de seguridad
 * por si nos olvidamos de revalidar manualmente.
 *
 * El plan de una org cambia raramente (manual via settings o webhook MP),
 * por eso conviene cachear y no consultar en cada request.
 */
const getOrgFeaturesCached = (orgId: string) =>
  unstable_cache(
    async (id: string) => {
      const sub = await prisma.subscription.findUnique({
        where: { organizationId: id },
        select: {
          status: true,
          plan: {
            select: {
              features: { select: { feature: { select: { key: true } } } },
            },
          },
        },
      });
      if (!sub || (sub.status !== "ACTIVE" && sub.status !== "TRIAL")) {
        return [] as FeatureKey[];
      }
      return sub.plan.features.map((pf) => pf.feature.key as FeatureKey);
    },
    ["org-features", orgId],
    { tags: [orgFeaturesCacheTag(orgId)], revalidate: 300 }
  )(orgId);

export async function getOrgFeatures(organizationId: string): Promise<Set<FeatureKey>> {
  const keys = await getOrgFeaturesCached(organizationId);
  return new Set(keys);
}

/**
 * Versión single-feature de la consulta. Usa la misma caché (delega a
 * `getOrgFeatures`) para no tener 2 fuentes de verdad.
 */
export async function hasFeature(
  organizationId: string,
  featureKey: FeatureKey
): Promise<boolean> {
  const features = await getOrgFeatures(organizationId);
  return features.has(featureKey);
}
