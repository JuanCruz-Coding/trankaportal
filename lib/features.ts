import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";

export type FeatureKey =
  // Empleados
  | "employees"
  | "employees.documents"
  | "employees.compensation"
  | "employees.org-chart"
  | "employees.org-chart-visual"
  | "employees.csv-export"
  | "employees.custom-fields"
  | "employees.audit-log"
  // Portal del empleado
  | "self-service"
  | "self-service.documents"
  | "self-service.payroll-signature"
  // Time-off
  | "time-off"
  | "time-off.calendar"
  | "time-off.multi-approval"
  | "time-off.carry-over"
  | "time-off.holidays"
  // Attendance
  | "attendance"
  | "attendance.team-view"
  | "attendance.shifts"
  | "attendance.geo"
  | "attendance.ip-whitelist"
  | "attendance.overtime-approval"
  | "attendance.export"
  // Comunicación
  | "email-notifications"
  | "announcements"
  // Recibos
  | "payroll"
  // Reportes
  | "reports.basic"
  | "reports.advanced"
  // Procesos
  | "onboarding"
  | "performance-reviews"
  // Integraciones
  | "integrations";

/**
 * Feature keys "raíz" — las que gatean el módulo completo (página principal del
 * módulo). Útil para el sidebar/nav que sólo necesita saber si mostrar el link.
 */
export const ROOT_FEATURE_KEYS = [
  "employees",
  "self-service",
  "time-off",
  "attendance",
] as const satisfies readonly FeatureKey[];

export type RootFeatureKey = (typeof ROOT_FEATURE_KEYS)[number];

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
