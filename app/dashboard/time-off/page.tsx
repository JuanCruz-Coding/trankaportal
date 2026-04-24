import Link from "next/link";
import { Calendar } from "lucide-react";
import { FeatureGate } from "@/components/feature-gate";
import { buttonVariants } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { getCurrentEmployeeId, getOrgContext } from "@/lib/tenant";
import { RequestDialog } from "./components/request-dialog";
import {
  MyRequestsTable,
  ReviewTable,
  type RequestRow,
} from "./components/request-tables";
import { getMyCurrentBalance } from "./actions";

export default async function TimeOffPage() {
  const ctx = await getOrgContext();
  const myEmpId = await getCurrentEmployeeId();

  const types = await prisma.timeOffType.findMany({
    where: { organizationId: ctx.organizationId },
    orderBy: { name: "asc" },
    select: { id: true, name: true, affectsBalance: true },
  });

  // Mis solicitudes (PENDING y APPROVED + últimas del histórico).
  const myRequests = myEmpId
    ? await prisma.timeOffRequest.findMany({
        where: { employeeId: myEmpId, organizationId: ctx.organizationId },
        orderBy: [{ createdAt: "desc" }],
        take: 50,
        include: {
          type: { select: { name: true } },
          employee: { select: { firstName: true, lastName: true } },
        },
      })
    : [];

  // Pendings para revisar (solo si puede aprobar).
  const canReview =
    ctx.role === "admin" || ctx.role === "hr" || ctx.role === "manager";

  let toReview: typeof myRequests = [];
  if (canReview) {
    const whereBase = {
      organizationId: ctx.organizationId,
      status: "PENDING" as const,
    };
    // Manager: solo subordinados directos.
    const where =
      ctx.role === "manager" && myEmpId
        ? { ...whereBase, employee: { managerId: myEmpId } }
        : whereBase;

    toReview = await prisma.timeOffRequest.findMany({
      where,
      orderBy: [{ createdAt: "asc" }],
      include: {
        type: { select: { name: true } },
        employee: { select: { firstName: true, lastName: true } },
      },
    });
  }

  const balance = await getMyCurrentBalance();

  const toRow = (r: (typeof myRequests)[number]): RequestRow => ({
    id: r.id,
    typeName: r.type.name,
    startDate: r.startDate,
    endDate: r.endDate,
    totalDays: r.totalDays,
    status: r.status,
    reason: r.reason,
    reviewNote: r.reviewNote,
    employeeName: `${r.employee.firstName} ${r.employee.lastName}`,
  });

  return (
    <FeatureGate feature="time-off">
      <div className="space-y-8">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Ausencias</h1>
            <p className="text-sm text-muted-foreground">
              Solicitá vacaciones, licencias o días personales. Las solicitudes
              pasan por aprobación.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard/time-off/calendar"
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              <Calendar className="h-4 w-4" />
              Calendario
            </Link>
            {types.length > 0 && myEmpId ? <RequestDialog types={types} /> : null}
          </div>
        </header>

        {balance ? (
          <div className="grid gap-4 md:grid-cols-3">
            <BalanceCard
              label={`Saldo ${balance.year}`}
              value={`${balance.remainingDays} días`}
              hint={`Usados ${balance.usedDays} de ${balance.totalDays}`}
            />
            <BalanceCard
              label="Pendientes"
              value={myRequests.filter((r) => r.status === "PENDING").length.toString()}
              hint="Esperando aprobación"
            />
            <BalanceCard
              label="Aprobadas este año"
              value={myRequests
                .filter(
                  (r) =>
                    r.status === "APPROVED" &&
                    new Date(r.startDate).getFullYear() === balance.year
                )
                .length.toString()}
              hint="Solicitudes"
            />
          </div>
        ) : null}

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Mis solicitudes</h2>
          <MyRequestsTable rows={myRequests.map(toRow)} />
        </section>

        {canReview ? (
          <section className="space-y-3">
            <h2 className="text-lg font-semibold">
              Por aprobar{" "}
              <span className="text-muted-foreground">({toReview.length})</span>
            </h2>
            <ReviewTable rows={toReview.map(toRow)} />
          </section>
        ) : null}
      </div>
    </FeatureGate>
  );
}

function BalanceCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-lg border bg-card p-5 text-card-foreground shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}
