import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Lock } from "lucide-react";
import { FeatureGate } from "@/components/feature-gate";
import { buttonVariants } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { ForbiddenError, getOrgContext, requireRole } from "@/lib/tenant";
import { getOrgFeatures } from "@/lib/features";
import {
  getOrgActiveEmployeeCount,
  getOrgDepartments,
  getOrgPlan,
  getOrgPositions,
} from "@/lib/cached-queries";
import { EmployeeForm } from "../components/employee-form";

export default async function NewEmployeePage() {
  const ctx = await getOrgContext();

  try {
    requireRole(ctx, ["admin", "hr"]);
  } catch (err) {
    if (err instanceof ForbiddenError) redirect("/dashboard/employees");
    throw err;
  }

  const features = await getOrgFeatures(ctx.organizationId);
  const capabilities = {
    compensation: features.has("employees.compensation"),
    orgChart: features.has("employees.org-chart"),
  };

  const [departments, positions, managers, plan, activeCount] = await Promise.all([
    getOrgDepartments(ctx.organizationId),
    getOrgPositions(ctx.organizationId),
    prisma.employee.findMany({
      where: { organizationId: ctx.organizationId, isActive: true },
      orderBy: [{ firstName: "asc" }],
      select: { id: true, firstName: true, lastName: true },
    }),
    getOrgPlan(ctx.organizationId),
    getOrgActiveEmployeeCount(ctx.organizationId),
  ]);

  // Defensa server-side: si alguien llega a esta URL pero la org está al cap,
  // mostramos un upgrade CTA en vez del form. La action también valida.
  const cap = plan?.maxEmployees ?? null;
  if (cap != null && activeCount >= cap) {
    return (
      <FeatureGate feature="employees">
        <CapReached planName={plan?.name ?? "actual"} cap={cap} />
      </FeatureGate>
    );
  }

  return (
    <FeatureGate feature="employees">
      <div className="space-y-6">
        <header className="flex items-center gap-3">
          <Link
            href="/dashboard/employees"
            className={buttonVariants({ variant: "ghost", size: "icon-sm" })}
            aria-label="Volver al listado"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Nuevo empleado</h1>
            <p className="text-sm text-muted-foreground">
              Los datos personales obligatorios son nombre, apellido y email. El
              resto lo podés completar después.
            </p>
          </div>
        </header>

        <div className="rounded-lg border bg-card p-6">
          <EmployeeForm
            mode="create"
            departments={departments.map((d) => ({ id: d.id, label: d.name }))}
            positions={positions.map((p) => ({ id: p.id, label: p.title }))}
            managers={managers.map((m) => ({
              id: m.id,
              label: `${m.firstName} ${m.lastName}`,
            }))}
            capabilities={capabilities}
          />
        </div>
      </div>
    </FeatureGate>
  );
}

function CapReached({ planName, cap }: { planName: string; cap: number }) {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center gap-4 rounded-lg border bg-card p-10 text-center text-card-foreground shadow-sm">
      <div className="rounded-full bg-muted p-3">
        <Lock className="h-6 w-6 text-muted-foreground" />
      </div>
      <div>
        <h2 className="text-lg font-semibold">Llegaste al límite de tu plan</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          El plan <strong>{planName}</strong> permite hasta <strong>{cap}</strong>{" "}
          empleados activos. Para sumar más, mejorá tu plan o desactivá empleados
          que ya no estén en la organización.
        </p>
      </div>
      <div className="flex gap-2">
        <Link
          href="/dashboard/employees"
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          Volver al listado
        </Link>
        <Link
          href="/dashboard/settings"
          className={buttonVariants({ size: "sm" })}
        >
          Ver planes
        </Link>
      </div>
    </div>
  );
}
