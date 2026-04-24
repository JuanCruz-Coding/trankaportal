import { prisma } from "@/lib/prisma";

/**
 * Feature keys que maneja la app. Mantener sincronizado con los seeds de prisma/seed.ts.
 * Usar esta unión en vez de strings sueltos previene typos en checks.
 */
export type FeatureKey = "employees" | "self-service" | "time-off" | "attendance";

export const FEATURE_KEYS: FeatureKey[] = [
  "employees",
  "self-service",
  "time-off",
  "attendance",
];

/**
 * ¿La organización tiene acceso al módulo `featureKey`?
 *
 * Consulta: Organization → Subscription (ACTIVE/TRIAL) → Plan → PlanFeature → Feature.key
 * Devuelve false si no hay subscription activa o si la feature no está en el plan.
 */
export async function hasFeature(
  organizationId: string,
  featureKey: FeatureKey
): Promise<boolean> {
  const sub = await prisma.subscription.findUnique({
    where: { organizationId },
    select: {
      status: true,
      plan: {
        select: {
          features: {
            where: { feature: { key: featureKey } },
            select: { featureId: true },
          },
        },
      },
    },
  });

  if (!sub) return false;
  if (sub.status !== "ACTIVE" && sub.status !== "TRIAL") return false;
  return sub.plan.features.length > 0;
}

/**
 * Devuelve el set de features activas de la organización. Útil para el sidebar
 * (renderizar toda la nav de una sola query en vez de N `hasFeature` calls).
 */
export async function getOrgFeatures(organizationId: string): Promise<Set<FeatureKey>> {
  const sub = await prisma.subscription.findUnique({
    where: { organizationId },
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
    return new Set();
  }
  return new Set(sub.plan.features.map((pf) => pf.feature.key as FeatureKey));
}
