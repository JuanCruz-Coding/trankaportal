import { Suspense } from "react";
import { Reveal } from "@/components/reveal";
import { getOrgContext } from "@/lib/tenant";
import {
  DashboardStats,
  HeaderName,
  HeaderPlan,
  HeaderPlanFallback,
  MyUpcomingRequests,
  ShortcutsCard,
  StatsSkeleton,
  UpcomingSkeleton,
  computeGreeting,
} from "./components/dashboard-sections";

/**
 * Dashboard home. Estructura:
 *  - Shell estático (greeting, org name, role, atajos): instantáneo, derivado
 *    de getOrgContext (cacheado por request).
 *  - Bloques con DB queries (firstName, plan name, stats, próximas ausencias)
 *    detrás de Suspense individuales: streaming progresivo.
 *
 * El skeleton inicial lo provee `loading.tsx` durante el navigate. Una vez que
 * Next renderiza esta página, los Suspense de adentro toman el relevo.
 */
export default async function DashboardHome() {
  const ctx = await getOrgContext();
  const canManage =
    ctx.role === "admin" || ctx.role === "hr" || ctx.role === "manager";
  const greeting = computeGreeting(ctx.organizationTimezone);

  return (
    <div className="space-y-8">
      <Reveal>
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
          {greeting}
          <Suspense fallback={null}>
            <HeaderName />
          </Suspense>
          .
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {ctx.organizationName} ·{" "}
          <Suspense fallback={<HeaderPlanFallback />}>
            <HeaderPlan organizationId={ctx.organizationId} />
          </Suspense>{" "}
          · Rol{" "}
          <span className="font-medium text-foreground">
            {ctx.role.toUpperCase()}
          </span>
        </p>
      </Reveal>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Suspense fallback={<StatsSkeleton canManage={canManage} />}>
          <DashboardStats canManage={canManage} />
        </Suspense>
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <Suspense fallback={<UpcomingSkeleton />}>
          <MyUpcomingRequests />
        </Suspense>
        <ShortcutsCard role={ctx.role} canManage={canManage} />
      </section>
    </div>
  );
}
