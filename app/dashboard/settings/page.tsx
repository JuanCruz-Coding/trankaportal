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
                <ul className="mt-3 space-y-1 text-xs">
                  {p.features.map((pf) => (
                    <li key={pf.featureId} className="flex items-center gap-1.5">
                      <Check className="h-3 w-3 text-primary" />
                      {pf.feature.name}
                    </li>
                  ))}
                </ul>
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
