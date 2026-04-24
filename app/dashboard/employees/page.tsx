import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, Search } from "lucide-react";
import { FeatureGate } from "@/components/feature-gate";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { prisma } from "@/lib/prisma";
import { ForbiddenError, getOrgContext, requireRole } from "@/lib/tenant";
import { CONTRACT_TYPE_LABEL } from "@/lib/validations/employee";

type PageProps = {
  searchParams: Promise<{ q?: string; status?: "active" | "inactive" | "all" }>;
};

export default async function EmployeesPage({ searchParams }: PageProps) {
  const ctx = await getOrgContext();

  try {
    requireRole(ctx, ["admin", "hr", "manager"]);
  } catch (err) {
    if (err instanceof ForbiddenError) redirect("/dashboard");
    throw err;
  }

  const params = await searchParams;
  const q = (params.q ?? "").trim();
  const status = params.status ?? "active";

  return (
    <FeatureGate feature="employees">
      <EmployeesContent orgId={ctx.organizationId} q={q} status={status} />
    </FeatureGate>
  );
}

async function EmployeesContent({
  orgId,
  q,
  status,
}: {
  orgId: string;
  q: string;
  status: "active" | "inactive" | "all";
}) {
  const where = {
    organizationId: orgId,
    ...(status === "active" ? { isActive: true } : {}),
    ...(status === "inactive" ? { isActive: false } : {}),
    ...(q
      ? {
          OR: [
            { firstName: { contains: q, mode: "insensitive" as const } },
            { lastName: { contains: q, mode: "insensitive" as const } },
            { email: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [employees, totalActive] = await Promise.all([
    prisma.employee.findMany({
      where,
      orderBy: [{ isActive: "desc" }, { firstName: "asc" }],
      include: {
        department: { select: { name: true } },
        position: { select: { title: true } },
      },
    }),
    prisma.employee.count({ where: { organizationId: orgId, isActive: true } }),
  ]);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Empleados</h1>
          <p className="text-sm text-muted-foreground">
            {totalActive} activo{totalActive === 1 ? "" : "s"} en la organización.
          </p>
        </div>
        <Link
          href="/dashboard/employees/new"
          className={buttonVariants({ size: "sm" })}
        >
          <Plus className="h-4 w-4" />
          Nuevo empleado
        </Link>
      </header>

      <form
        action="/dashboard/employees"
        method="GET"
        className="flex flex-wrap items-center gap-2"
      >
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            name="q"
            defaultValue={q}
            placeholder="Buscar por nombre o email..."
            className="pl-9"
          />
        </div>
        <Select name="status" defaultValue={status}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Activos</SelectItem>
            <SelectItem value="inactive">Inactivos</SelectItem>
            <SelectItem value="all">Todos</SelectItem>
          </SelectContent>
        </Select>
        <button
          type="submit"
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          Filtrar
        </button>
      </form>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Puesto</TableHead>
              <TableHead>Departamento</TableHead>
              <TableHead>Contrato</TableHead>
              <TableHead>Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {employees.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="py-10 text-center text-sm text-muted-foreground"
                >
                  {q || status !== "active"
                    ? "Sin resultados para los filtros aplicados."
                    : "Todavía no hay empleados. Creá el primero con el botón de arriba."}
                </TableCell>
              </TableRow>
            ) : (
              employees.map((e) => (
                <TableRow key={e.id} className="cursor-pointer">
                  <TableCell>
                    <Link
                      href={`/dashboard/employees/${e.id}`}
                      className="font-medium hover:underline"
                    >
                      {e.firstName} {e.lastName}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{e.email}</TableCell>
                  <TableCell>{e.position?.title ?? "—"}</TableCell>
                  <TableCell>{e.department?.name ?? "—"}</TableCell>
                  <TableCell>
                    {e.contractType ? CONTRACT_TYPE_LABEL[e.contractType] : "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={e.isActive ? "default" : "secondary"}>
                      {e.isActive ? "Activo" : "Inactivo"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
