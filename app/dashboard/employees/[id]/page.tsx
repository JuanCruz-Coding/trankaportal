import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Pencil } from "lucide-react";
import { FeatureGate } from "@/components/feature-gate";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import {
  ForbiddenError,
  getCurrentEmployeeId,
  getOrgContext,
  requireRole,
} from "@/lib/tenant";
import { CONTRACT_TYPE_LABEL } from "@/lib/validations/employee";
import { EmployeeActiveToggle } from "../components/employee-active-toggle";
import { DocumentsSection } from "../components/documents-section";
import { EmployeeRoleChanger } from "../components/employee-role-changer";

export default async function EmployeeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const ctx = await getOrgContext();

  try {
    requireRole(ctx, ["admin", "hr", "manager"]);
  } catch (err) {
    if (err instanceof ForbiddenError) redirect("/dashboard");
    throw err;
  }

  const { id } = await params;

  const employee = await prisma.employee.findFirst({
    where: { id, organizationId: ctx.organizationId },
    include: {
      department: { select: { name: true } },
      position: { select: { title: true } },
      manager: { select: { id: true, firstName: true, lastName: true } },
      subordinates: {
        where: { isActive: true },
        orderBy: [{ firstName: "asc" }],
        select: { id: true, firstName: true, lastName: true, email: true },
      },
      documents: {
        orderBy: { uploadedAt: "desc" },
        select: {
          id: true,
          name: true,
          type: true,
          mimeType: true,
          sizeBytes: true,
          uploadedAt: true,
        },
      },
    },
  });

  if (!employee) notFound();

  // Manager solo puede ver su propia ficha + subordinados directos.
  if (ctx.role === "manager") {
    const myEmpId = await getCurrentEmployeeId();
    const canSee = myEmpId === employee.id || employee.managerId === myEmpId;
    if (!canSee) redirect("/dashboard/employees");
  }

  // Salary hidden para role employee que no sea su propia ficha.
  const canSeeSalary =
    ctx.role !== "employee" || ctx.clerkUserId === employee.clerkUserId;

  // Solo admin/hr pueden editar y desactivar. Manager es read-only.
  const canEdit = ctx.role === "admin" || ctx.role === "hr";
  const canChangeRole = ctx.role === "admin";

  return (
    <FeatureGate feature="employees">
      <div className="space-y-6">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/employees"
              className={buttonVariants({ variant: "ghost", size: "icon-sm" })}
              aria-label="Volver al listado"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-semibold tracking-tight">
                  {employee.firstName} {employee.lastName}
                </h1>
                <Badge variant={employee.isActive ? "default" : "secondary"}>
                  {employee.isActive ? "Activo" : "Inactivo"}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">{employee.email}</p>
            </div>
          </div>
          {canEdit ? (
            <div className="flex items-center gap-2">
              <EmployeeActiveToggle id={employee.id} isActive={employee.isActive} />
              <Link
                href={`/dashboard/employees/${employee.id}/edit`}
                className={buttonVariants({ size: "sm" })}
              >
                <Pencil className="h-4 w-4" />
                Editar
              </Link>
            </div>
          ) : null}
        </header>

        <div className="grid gap-6 md:grid-cols-2">
          <DataCard title="Datos personales">
            <DataRow label="DNI" value={employee.dni} />
            <DataRow label="Teléfono" value={employee.phone} />
            <DataRow label="Fecha de nacimiento" value={formatDate(employee.birthDate)} />
            <DataRow label="Dirección" value={employee.address} />
          </DataCard>

          <DataCard title="Datos laborales">
            <DataRow label="Puesto" value={employee.position?.title} />
            <DataRow label="Departamento" value={employee.department?.name} />
            <DataRow
              label="Manager"
              value={
                employee.manager
                  ? `${employee.manager.firstName} ${employee.manager.lastName}`
                  : null
              }
            />
            <DataRow label="Fecha de ingreso" value={formatDate(employee.hireDate)} />
            <DataRow
              label="Tipo de contrato"
              value={
                employee.contractType ? CONTRACT_TYPE_LABEL[employee.contractType] : null
              }
            />
            {canSeeSalary ? (
              <DataRow
                label="Salario"
                value={
                  employee.salary
                    ? `$ ${Number(employee.salary).toLocaleString("es-AR")}`
                    : null
                }
              />
            ) : null}
          </DataCard>

          {canChangeRole ? (
            <DataCard title="Rol y permisos">
              <EmployeeRoleChanger
                employeeId={employee.id}
                currentRole={employee.role}
              />
            </DataCard>
          ) : null}

          {employee.subordinates.length > 0 ? (
            <DataCard title={`Equipo (${employee.subordinates.length})`} wide>
              <ul className="divide-y text-sm">
                {employee.subordinates.map((s) => (
                  <li key={s.id} className="flex items-center justify-between py-2">
                    <Link
                      href={`/dashboard/employees/${s.id}`}
                      className="hover:underline"
                    >
                      {s.firstName} {s.lastName}
                    </Link>
                    <span className="text-muted-foreground">{s.email}</span>
                  </li>
                ))}
              </ul>
            </DataCard>
          ) : null}

          <DocumentsSection
            employeeId={employee.id}
            documents={employee.documents}
            canManage={canEdit}
          />
        </div>
      </div>
    </FeatureGate>
  );
}

function DataCard({
  title,
  wide,
  children,
}: {
  title: string;
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`rounded-lg border bg-card p-5 text-card-foreground shadow-sm ${
        wide ? "md:col-span-2" : ""
      }`}
    >
      <h3 className="mb-4 text-base font-semibold">{title}</h3>
      <dl className="space-y-2">{children}</dl>
    </div>
  );
}

function DataRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="grid grid-cols-[140px,1fr] gap-3 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd>{value || <span className="text-muted-foreground">—</span>}</dd>
    </div>
  );
}

function formatDate(d: Date | null | undefined): string | null {
  if (!d) return null;
  return new Date(d).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}
