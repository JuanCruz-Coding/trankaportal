import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import { FeatureGate } from "@/components/feature-gate";
import { buttonVariants } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { prisma } from "@/lib/prisma";
import {
  ForbiddenError,
  getCurrentEmployeeId,
  getOrgContext,
  requireRole,
} from "@/lib/tenant";

type Props = { searchParams: Promise<{ m?: string }> };

export default async function TeamReportPage({ searchParams }: Props) {
  const ctx = await getOrgContext();

  try {
    requireRole(ctx, ["admin", "hr", "manager"]);
  } catch (err) {
    if (err instanceof ForbiddenError) redirect("/dashboard/attendance");
    throw err;
  }

  const params = await searchParams;
  const now = new Date();
  const active = parseMonthParam(params.m) ?? {
    year: now.getFullYear(),
    month: now.getMonth(),
  };
  const monthStart = new Date(Date.UTC(active.year, active.month, 1));
  const monthEnd = new Date(Date.UTC(active.year, active.month + 1, 0));

  // Scope de empleados: manager = solo sus subordinados + él mismo.
  let scopeFilter = {};
  if (ctx.role === "manager") {
    const myId = await getCurrentEmployeeId();
    if (myId) {
      const subs = await prisma.employee.findMany({
        where: { organizationId: ctx.organizationId, managerId: myId },
        select: { id: true },
      });
      scopeFilter = { id: { in: [myId, ...subs.map((s) => s.id)] } };
    } else {
      scopeFilter = { id: { in: [] as string[] } };
    }
  }

  const employees = await prisma.employee.findMany({
    where: { organizationId: ctx.organizationId, ...scopeFilter },
    orderBy: [{ firstName: "asc" }],
    select: {
      id: true,
      firstName: true,
      lastName: true,
      attendanceRecords: {
        where: {
          date: { gte: monthStart, lte: monthEnd },
          totalMinutes: { not: null },
        },
        select: { totalMinutes: true, date: true },
      },
    },
  });

  const rows = employees
    .map((e) => {
      const days = e.attendanceRecords.length;
      const totalMin = e.attendanceRecords.reduce(
        (s, r) => s + (r.totalMinutes ?? 0),
        0
      );
      return {
        id: e.id,
        name: `${e.firstName} ${e.lastName}`,
        days,
        totalMin,
        avgMin: days > 0 ? Math.round(totalMin / days) : 0,
      };
    })
    .sort((a, b) => b.totalMin - a.totalMin);

  const prevUrl = `/dashboard/attendance/team?m=${monthKey(active.year, active.month - 1)}`;
  const nextUrl = `/dashboard/attendance/team?m=${monthKey(active.year, active.month + 1)}`;

  return (
    <FeatureGate feature="attendance.team-view">
      <div className="space-y-6">
        <header className="flex flex-wrap items-center gap-3">
          <Link
            href="/dashboard/attendance"
            className={buttonVariants({ variant: "ghost", size: "icon-sm" })}
            aria-label="Volver"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl font-semibold tracking-tight capitalize">
              Reporte — {formatMonth(monthStart)}
            </h1>
            <p className="text-sm text-muted-foreground">
              Horas trabajadas y días por empleado.{" "}
              {ctx.role === "manager" ? "Solo tu equipo." : ""}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={prevUrl}
              className={buttonVariants({ variant: "outline", size: "icon-sm" })}
              aria-label="Mes anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </Link>
            <Link
              href={nextUrl}
              className={buttonVariants({ variant: "outline", size: "icon-sm" })}
              aria-label="Mes siguiente"
            >
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </header>

        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Empleado</TableHead>
                <TableHead>Días</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Promedio</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="py-10 text-center text-sm text-muted-foreground"
                  >
                    Sin registros en este mes.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <Link
                        href={`/dashboard/employees/${r.id}`}
                        className="font-medium hover:underline"
                      >
                        {r.name}
                      </Link>
                    </TableCell>
                    <TableCell>{r.days}</TableCell>
                    <TableCell>{formatMinutes(r.totalMin)}</TableCell>
                    <TableCell>
                      {r.avgMin > 0 ? formatMinutes(r.avgMin) : "—"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </FeatureGate>
  );
}

function parseMonthParam(m?: string): { year: number; month: number } | null {
  if (!m) return null;
  const match = m.match(/^(\d{4})-(\d{2})$/);
  if (!match) return null;
  const y = Number(match[1]);
  const mo = Number(match[2]) - 1;
  if (isNaN(y) || isNaN(mo) || mo < 0 || mo > 11) return null;
  return { year: y, month: mo };
}

function monthKey(year: number, month: number): string {
  const d = new Date(year, month, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function formatMonth(d: Date): string {
  return d.toLocaleDateString("es-AR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

function formatMinutes(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}
