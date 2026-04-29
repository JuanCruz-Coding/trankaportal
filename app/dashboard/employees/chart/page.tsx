import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, UserCircle2 } from "lucide-react";
import { FeatureGate } from "@/components/feature-gate";
import { buttonVariants } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import {
  ForbiddenError,
  getCurrentEmployeeId,
  getOrgContext,
  requireRole,
} from "@/lib/tenant";

type Node = {
  id: string;
  firstName: string;
  lastName: string;
  positionTitle: string | null;
  departmentName: string | null;
  children: Node[];
};

export default async function OrgChartPage() {
  const ctx = await getOrgContext();

  try {
    requireRole(ctx, ["admin", "hr", "manager"]);
  } catch (err) {
    if (err instanceof ForbiddenError) redirect("/dashboard");
    throw err;
  }

  const employees = await prisma.employee.findMany({
    where: { organizationId: ctx.organizationId, isActive: true },
    orderBy: [{ firstName: "asc" }],
    select: {
      id: true,
      firstName: true,
      lastName: true,
      managerId: true,
      position: { select: { title: true } },
      department: { select: { name: true } },
    },
  });

  // Construir el árbol: raíz = empleados sin manager (o su manager no está activo).
  const idSet = new Set(employees.map((e) => e.id));
  const byManager = new Map<string | null, typeof employees>();
  for (const e of employees) {
    const key = e.managerId && idSet.has(e.managerId) ? e.managerId : null;
    if (!byManager.has(key)) byManager.set(key, []);
    byManager.get(key)!.push(e);
  }

  const buildNode = (e: (typeof employees)[number]): Node => ({
    id: e.id,
    firstName: e.firstName,
    lastName: e.lastName,
    positionTitle: e.position?.title ?? null,
    departmentName: e.department?.name ?? null,
    children: (byManager.get(e.id) ?? []).map(buildNode),
  });

  let roots: Node[];
  if (ctx.role === "manager") {
    // Manager ve su subárbol: su nodo + los subordinados recursivamente.
    const myId = await getCurrentEmployeeId();
    const me = employees.find((e) => e.id === myId);
    roots = me ? [buildNode(me)] : [];
  } else {
    roots = (byManager.get(null) ?? []).map(buildNode);
  }

  return (
    <FeatureGate feature="employees.org-chart-visual">
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
            <h1 className="text-2xl font-semibold tracking-tight">Organigrama</h1>
            <p className="text-sm text-muted-foreground">
              Jerarquía manager → subordinados. {employees.length} empleado
              {employees.length === 1 ? "" : "s"} activo
              {employees.length === 1 ? "" : "s"}.
            </p>
          </div>
        </header>

        {roots.length === 0 ? (
          <div className="rounded-lg border bg-card p-10 text-center text-sm text-muted-foreground">
            Todavía no hay empleados para mostrar.
          </div>
        ) : (
          <div className="space-y-4">
            {roots.map((node) => (
              <TreeNode key={node.id} node={node} depth={0} />
            ))}
          </div>
        )}
      </div>
    </FeatureGate>
  );
}

function TreeNode({ node, depth }: { node: Node; depth: number }) {
  return (
    <div>
      <NodeCard node={node} depth={depth} />
      {node.children.length > 0 ? (
        <div className="ml-6 mt-2 space-y-2 border-l-2 border-border pl-6">
          {node.children.map((child) => (
            <TreeNode key={child.id} node={child} depth={depth + 1} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function NodeCard({ node, depth }: { node: Node; depth: number }) {
  return (
    <Link
      href={`/dashboard/employees/${node.id}`}
      className="flex items-center gap-3 rounded-lg border bg-card p-3 shadow-sm transition-colors hover:bg-accent"
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted">
        <UserCircle2 className="h-5 w-5 text-muted-foreground" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">
          {node.firstName} {node.lastName}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {node.positionTitle ?? "Sin puesto"}
          {node.departmentName ? ` · ${node.departmentName}` : ""}
        </p>
      </div>
      {node.children.length > 0 && depth === 0 ? (
        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
          {countDescendants(node)} a cargo
        </span>
      ) : null}
    </Link>
  );
}

function countDescendants(node: Node): number {
  let total = node.children.length;
  for (const c of node.children) total += countDescendants(c);
  return total;
}
