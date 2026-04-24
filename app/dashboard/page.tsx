import { getOrgContext } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";

export default async function DashboardHome() {
  const ctx = await getOrgContext();

  // Una query rápida para mostrar algo real: nombre de la org + plan.
  const org = await prisma.organization.findUnique({
    where: { id: ctx.organizationId },
    select: {
      name: true,
      subscription: { select: { plan: { select: { key: true, name: true } } } },
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Bienvenido a {org?.name ?? "tu organización"}.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card title="Plan actual" value={org?.subscription?.plan.name ?? "—"} />
        <Card title="Tu rol" value={ctx.role.toUpperCase()} />
        <Card title="Empleados" value="—" hint="Próximamente en Fase 3" />
      </div>
    </div>
  );
}

function Card({ title, value, hint }: { title: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg border bg-card p-5 text-card-foreground shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {title}
      </p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
