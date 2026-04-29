import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { FeatureGate } from "@/components/feature-gate";
import { buttonVariants } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { ForbiddenError, getOrgContext, requireRole } from "@/lib/tenant";
import { getOrgFeatures } from "@/lib/features";
import { getOrgDepartments, getOrgPositions } from "@/lib/cached-queries";
import { createInputToForm } from "@/lib/validations/employee";
import { EmployeeForm } from "../../components/employee-form";

export default async function EmployeeEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const ctx = await getOrgContext();

  try {
    requireRole(ctx, ["admin", "hr"]);
  } catch (err) {
    if (err instanceof ForbiddenError) redirect("/dashboard/employees");
    throw err;
  }

  const { id } = await params;

  const features = await getOrgFeatures(ctx.organizationId);
  const capabilities = {
    compensation: features.has("employees.compensation"),
    orgChart: features.has("employees.org-chart"),
  };

  const [employee, departments, positions, managers] = await Promise.all([
    prisma.employee.findFirst({
      where: { id, organizationId: ctx.organizationId },
    }),
    getOrgDepartments(ctx.organizationId),
    getOrgPositions(ctx.organizationId),
    prisma.employee.findMany({
      where: {
        organizationId: ctx.organizationId,
        isActive: true,
        NOT: { id }, // no puede ser su propio manager
      },
      orderBy: [{ firstName: "asc" }],
      select: { id: true, firstName: true, lastName: true },
    }),
  ]);

  if (!employee) notFound();

  return (
    <FeatureGate feature="employees">
      <div className="space-y-6">
        <header className="flex items-center gap-3">
          <Link
            href={`/dashboard/employees/${id}`}
            className={buttonVariants({ variant: "ghost", size: "icon-sm" })}
            aria-label="Volver al detalle"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Editar empleado
            </h1>
            <p className="text-sm text-muted-foreground">
              {employee.firstName} {employee.lastName}
            </p>
          </div>
        </header>

        <div className="rounded-lg border bg-card p-6">
          <EmployeeForm
            mode="edit"
            employeeId={employee.id}
            defaultValues={createInputToForm({
              ...employee,
              salary: employee.salary ? Number(employee.salary) : null,
            })}
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
