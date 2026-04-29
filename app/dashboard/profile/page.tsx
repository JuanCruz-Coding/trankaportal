import { FeatureGate } from "@/components/feature-gate";
import { Badge } from "@/components/ui/badge";
import { prisma } from "@/lib/prisma";
import { getCurrentEmployeeId, getOrgContext } from "@/lib/tenant";
import { hasFeature } from "@/lib/features";
import { CONTRACT_TYPE_LABEL } from "@/lib/validations/employee";
import { DocumentsSection } from "../employees/components/documents-section";
import { ProfileEditDialog } from "./components/profile-edit-dialog";

export default async function ProfilePage() {
  const ctx = await getOrgContext();
  const myEmpId = await getCurrentEmployeeId();
  const canViewOwnDocs = await hasFeature(ctx.organizationId, "self-service.documents");

  // Edge case: user autenticado en Clerk pero sin Employee row sincronizado.
  // Puede pasar si el webhook falló o si está en ese milisegundo después de
  // aceptar invitación y antes de que se procese.
  if (!myEmpId) {
    return (
      <FeatureGate feature="self-service">
        <NoProfileYet />
      </FeatureGate>
    );
  }

  const employee = await prisma.employee.findUnique({
    where: { id: myEmpId },
    include: {
      department: { select: { name: true } },
      position: { select: { title: true } },
      manager: { select: { firstName: true, lastName: true } },
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

  if (!employee) {
    return (
      <FeatureGate feature="self-service">
        <NoProfileYet />
      </FeatureGate>
    );
  }

  const formDefaults = {
    firstName: employee.firstName,
    lastName: employee.lastName,
    phone: employee.phone ?? "",
    birthDate: employee.birthDate
      ? new Date(employee.birthDate).toISOString().slice(0, 10)
      : "",
    address: employee.address ?? "",
  };

  return (
    <FeatureGate feature="self-service">
      <div className="space-y-6">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight">
                {employee.firstName} {employee.lastName}
              </h1>
              <Badge variant={employee.isActive ? "default" : "secondary"}>
                {employee.isActive ? "Activo" : "Inactivo"}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {employee.email} · {ctx.role.toUpperCase()}
            </p>
          </div>
          <ProfileEditDialog defaultValues={formDefaults} />
        </header>

        <div className="grid gap-6 md:grid-cols-2">
          <DataCard title="Datos personales (editables)">
            <DataRow label="Teléfono" value={employee.phone} />
            <DataRow label="Fecha de nacimiento" value={formatDate(employee.birthDate)} />
            <DataRow label="Dirección" value={employee.address} />
            <p className="mt-3 border-t pt-3 text-xs text-muted-foreground">
              Tocá "Editar mis datos" arriba para modificar. Email y DNI no se
              pueden cambiar desde acá.
            </p>
          </DataCard>

          <DataCard title="Datos laborales (solo lectura)">
            <DataRow label="DNI" value={employee.dni} />
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
            <DataRow
              label="Salario"
              value={
                employee.salary
                  ? `$ ${Number(employee.salary).toLocaleString("es-AR")}`
                  : null
              }
            />
            <p className="mt-3 border-t pt-3 text-xs text-muted-foreground">
              Si alguno de estos datos está desactualizado, contactá a RRHH.
            </p>
          </DataCard>

          {canViewOwnDocs ? (
            <DocumentsSection
              employeeId={employee.id}
              documents={employee.documents}
              canManage={false}
            />
          ) : null}
        </div>
      </div>
    </FeatureGate>
  );
}

function DataCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border bg-card p-5 text-card-foreground shadow-sm">
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

function NoProfileYet() {
  return (
    <div className="mx-auto max-w-lg space-y-3 rounded-lg border bg-card p-10 text-center text-card-foreground shadow-sm">
      <h2 className="text-lg font-semibold">Tu ficha todavía no está lista</h2>
      <p className="text-sm text-muted-foreground">
        No encontramos tu ficha de empleado. Puede tardar unos segundos después
        de aceptar la invitación. Si persiste, contactá a RRHH para verificar
        que te hayan dado de alta.
      </p>
    </div>
  );
}
