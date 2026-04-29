import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { FeatureGate } from "@/components/feature-gate";
import { buttonVariants } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { ForbiddenError, getOrgContext, requireRole } from "@/lib/tenant";
import { getOrgFeatures } from "@/lib/features";
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

  const [departments, positions, managers] = await Promise.all([
    prisma.department.findMany({
      where: { organizationId: ctx.organizationId },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.position.findMany({
      where: { organizationId: ctx.organizationId },
      orderBy: { title: "asc" },
      select: { id: true, title: true },
    }),
    prisma.employee.findMany({
      where: { organizationId: ctx.organizationId, isActive: true },
      orderBy: [{ firstName: "asc" }],
      select: { id: true, firstName: true, lastName: true },
    }),
  ]);

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
