import { redirect } from "next/navigation";
import { Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { prisma } from "@/lib/prisma";
import { ForbiddenError, getOrgContext, requireRole } from "@/lib/tenant";
import { PlanChanger } from "./components/plan-changer";
import { OrgStructureSection } from "./components/org-structure";
import { updateOrgSettings } from "./actions";

export default async function SettingsPage() {
  const ctx = await getOrgContext();

  try {
    requireRole(ctx, ["admin"]);
  } catch (err) {
    if (err instanceof ForbiddenError) redirect("/dashboard");
    throw err;
  }

  const [org, allPlans, departments, positions] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: ctx.organizationId },
      include: {
        subscription: {
          include: {
            plan: {
              include: {
                features: { include: { feature: true } },
              },
            },
          },
        },
      },
    }),
    prisma.plan.findMany({
      where: { isActive: true },
      include: { features: { include: { feature: true } } },
      orderBy: { maxEmployees: "asc" },
    }),
    prisma.department.findMany({
      where: { organizationId: ctx.organizationId },
      select: {
        id: true,
        name: true,
        _count: { select: { employees: true } },
      },
      orderBy: { name: "asc" },
    }),
    prisma.position.findMany({
      where: { organizationId: ctx.organizationId },
      select: {
        id: true,
        title: true,
        _count: { select: { employees: true } },
      },
      orderBy: { title: "asc" },
    }),
  ]);

  const currentPlanKey = org?.subscription?.plan.key ?? "starter";
  const currentFeatures = new Set(
    org?.subscription?.plan.features.map((pf) => pf.feature.key) ?? []
  );

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Configuración</h1>
        <p className="text-sm text-muted-foreground">
          Plan, datos de la organización y preferencias.
        </p>
      </header>

      <section className="rounded-lg border bg-card p-6 text-card-foreground shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">Plan actual</h2>
            <p className="text-sm text-muted-foreground">
              Cambiar el plan habilita o bloquea módulos al instante.
            </p>
          </div>
          <Badge>{org?.subscription?.plan.name}</Badge>
        </div>

        <div className="mt-6">
          <PlanChanger currentPlanKey={currentPlanKey} />
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {allPlans.map((p) => {
            const isCurrent = p.key === currentPlanKey;
            return (
              <div
                key={p.id}
                className={`rounded-lg border p-4 ${
                  isCurrent ? "border-primary bg-primary/5" : "border-border"
                }`}
              >
                <div className="mb-2 flex items-center justify-between">
                  <p className="font-semibold">{p.name}</p>
                  {isCurrent ? <Badge variant="default">Activo</Badge> : null}
                </div>
                <p className="text-xs text-muted-foreground">
                  {p.maxEmployees ? `Hasta ${p.maxEmployees} empleados` : "Empleados ilimitados"}
                </p>
                <PlanFeatureList
                  features={p.features.map((pf) => ({
                    key: pf.feature.key,
                    name: pf.feature.name,
                  }))}
                />
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-lg border bg-card p-6 text-card-foreground shadow-sm">
        <h2 className="text-lg font-semibold">Organización</h2>
        <p className="text-sm text-muted-foreground">
          Estos valores afectan a toda la app.
        </p>

        <form action={updateOrgSettings} className="mt-6 grid gap-4 md:grid-cols-2">
          <div>
            <Label className="mb-1.5">Zona horaria</Label>
            <Input
              name="timezone"
              defaultValue={org?.timezone ?? ""}
              placeholder="America/Argentina/Buenos_Aires"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Formato IANA. Ej: <code>America/Argentina/Buenos_Aires</code>.
            </p>
          </div>
          <div>
            <Label className="mb-1.5">Días de vacaciones por año (default)</Label>
            <Input
              name="defaultAnnualTimeOffDays"
              type="number"
              min="0"
              max="60"
              defaultValue={org?.defaultAnnualTimeOffDays ?? 14}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Saldo inicial cuando se crea el balance anual de un empleado.
            </p>
          </div>
          <div className="md:col-span-2">
            <Button type="submit" size="sm">
              Guardar cambios
            </Button>
          </div>
        </form>

        <div className="mt-6 border-t pt-4 text-sm">
          <p className="text-muted-foreground">
            Para gestionar miembros, invitar usuarios y cambiar roles, usá el{" "}
            <strong>OrganizationSwitcher</strong> arriba a la derecha →{" "}
            <em>Manage organization</em>.
          </p>
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Estructura organizacional</h2>
          <p className="text-sm text-muted-foreground">
            Departamentos y puestos disponibles para asignar a empleados. Se
            pueden crear, renombrar o eliminar (si no tienen empleados asignados).
          </p>
        </div>
        <OrgStructureSection
          departments={departments.map((d) => ({
            id: d.id,
            label: d.name,
            count: d._count.employees,
          }))}
          positions={positions.map((p) => ({
            id: p.id,
            label: p.title,
            count: p._count.employees,
          }))}
        />
      </section>
    </div>
  );
}

/**
 * Agrupa las features de un plan por prefijo de key (`module.subfeature`)
 * y las renderiza como módulo + sub-features anidadas. Para keys sin punto
 * que igual pertenecen a una "categoría" mayor (payroll, announcements,
 * reports.*) las metemos en buckets explícitos.
 *
 * El orden de GROUPS define el orden de render.
 */
const GROUPS: Array<{ id: string; label: string; matches: (key: string) => boolean }> = [
  { id: "employees", label: "Empleados", matches: (k) => k === "employees" || k.startsWith("employees.") },
  { id: "self-service", label: "Portal del empleado", matches: (k) => k === "self-service" || k.startsWith("self-service.") },
  { id: "time-off", label: "Ausencias y vacaciones", matches: (k) => k === "time-off" || k.startsWith("time-off.") },
  { id: "attendance", label: "Control de asistencia", matches: (k) => k === "attendance" || k.startsWith("attendance.") },
  { id: "comms", label: "Comunicación", matches: (k) => k === "email-notifications" || k === "announcements" },
  { id: "payroll", label: "Recibos de sueldo", matches: (k) => k === "payroll" },
  { id: "reports", label: "Reportes", matches: (k) => k.startsWith("reports.") },
  { id: "processes", label: "Procesos", matches: (k) => k === "onboarding" || k === "performance-reviews" },
  { id: "integrations", label: "Integraciones", matches: (k) => k === "integrations" },
];

function PlanFeatureList({ features }: { features: Array<{ key: string; name: string }> }) {
  const grouped = GROUPS.map((g) => ({
    ...g,
    items: features.filter((f) => g.matches(f.key)),
  })).filter((g) => g.items.length > 0);

  return (
    <ul className="mt-3 space-y-2 text-xs">
      {grouped.map((g) => {
        // Si hay raíz (key sin "."), va como header con check; las sub-features
        // (key con ".") quedan indentadas. Si no hay raíz (ej. "Reportes" sin
        // un "reports" raíz, sólo "reports.basic"), mostramos el label del grupo.
        const root = g.items.find((f) => !f.key.includes("."));
        const subs = g.items.filter((f) => f.key.includes("."));
        return (
          <li key={g.id}>
            <div className="flex items-center gap-1.5 font-medium">
              <Check className="h-3 w-3 text-primary" />
              {root ? root.name : g.label}
            </div>
            {subs.length > 0 ? (
              <ul className="ml-4 mt-1 space-y-0.5 text-muted-foreground">
                {subs.map((f) => (
                  <li key={f.key}>· {f.name}</li>
                ))}
              </ul>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
