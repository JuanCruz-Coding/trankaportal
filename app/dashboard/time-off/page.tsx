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
  const canReview =
    ctx.role === "admin" || ctx.role === "hr" || ctx.role === "manager";

  // Construir wheres antes de Promise.all
  const reviewWhere =
    ctx.role === "manager" && myEmpId
      ? {
          organizationId: ctx.organizationId,
          status: "PENDING" as const,
          employee: { managerId: myEmpId },
        }
      : {
          organizationId: ctx.organizationId,
          status: "PENDING" as const,
        };

  // 4 queries en paralelo (antes secuenciales).
  const [types, myRequests, toReview, balance] = await Promise.all([
    prisma.timeOffType.findMany({
      where: { organizationId: ctx.organizationId },
      orderBy: { name: "asc" },
      select: { id: true, name: true, affectsBalance: true },
    }),
    myEmpId
      ? prisma.timeOffRequest.findMany({
          where: { employeeId: myEmpId, organizationId: ctx.organizationId },
          orderBy: [{ createdAt: "desc" }],
          take: 50,
          select: {
            id: true,
            startDate: true,
            endDate: true,
            totalDays: true,
            status: true,
            reason: true,
            reviewNote: true,
            type: { select: { name: true } },
            employee: { select: { firstName: true, lastName: true } },
          },
        })
      : Promise.resolve([] as never[]),
    canReview
      ? prisma.timeOffRequest.findMany({
          where: reviewWhere,
          orderBy: [{ createdAt: "asc" }],
          select: {
            id: true,
            startDate: true,
            endDate: true,
            totalDays: true,
            status: true,
            reason: true,
            reviewNote: true,
            type: { select: { name: true } },
            employee: { select: { firstName: true, lastName: true } },
          },
        })
      : Promise.resolve([] as never[]),
    getMyCurrentBalance(),
  ]);

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
