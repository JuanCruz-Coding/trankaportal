import Link from "next/link";
import { Users } from "lucide-react";
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
import { getCurrentEmployeeId, getOrgContext } from "@/lib/tenant";
import { CheckButton } from "./components/check-button";

export default async function AttendancePage() {
  const ctx = await getOrgContext();
  const myId = await getCurrentEmployeeId();

  const org = await prisma.organization.findUnique({
    where: { id: ctx.organizationId },
    select: { timezone: true },
  });
  const tz = org?.timezone ?? "America/Argentina/Buenos_Aires";

  // Hoy en la TZ de la org → misma lógica que actions.ts.
  const todayParts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const y = todayParts.find((p) => p.type === "year")!.value;
  const m = todayParts.find((p) => p.type === "month")!.value;
  const d = todayParts.find((p) => p.type === "day")!.value;
  const todayDate = new Date(`${y}-${m}-${d}T00:00:00.000Z`);

  const todayRecord = myId
    ? await prisma.attendanceRecord.findUnique({
        where: { employeeId_date: { employeeId: myId, date: todayDate } },
      })
    : null;

  const status: "not-started" | "working" | "finished" = !todayRecord
    ? "not-started"
    : todayRecord.checkOut
    ? "finished"
    : "working";

  // Últimos 30 días.
  const recent = myId
    ? await prisma.attendanceRecord.findMany({
        where: { employeeId: myId, organizationId: ctx.organizationId },
        orderBy: { date: "desc" },
        take: 30,
      })
    : [];

  const canSeeTeamReport =
    ctx.role === "admin" || ctx.role === "hr" || ctx.role === "manager";

  const totalMinutesThisMonth = recent
    .filter((r) => {
      const rd = new Date(r.date);
      return (
        rd.getUTCFullYear() === Number(y) &&
        rd.getUTCMonth() + 1 === Number(m)
      );
    })
    .reduce((sum, r) => sum + (r.totalMinutes ?? 0), 0);

  return (
    <FeatureGate feature="attendance">
      <div className="space-y-8">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Asistencia</h1>
            <p className="text-sm text-muted-foreground">
              Registrá tu entrada y salida del día. Horario en{" "}
              <span className="font-medium">{tz}</span>.
            </p>
          </div>
          {canSeeTeamReport ? (
            <Link
              href="/dashboard/attendance/team"
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              <Users className="h-4 w-4" />
              Reporte de equipo
            </Link>
          ) : null}
        </header>

        <div className="grid gap-4 md:grid-cols-[1fr,auto] md:items-center">
          <div className="rounded-lg border bg-card p-6 text-card-foreground shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Estado de hoy
            </p>
            <p className="mt-2 text-2xl font-semibold">
              {statusLabel(status, todayRecord)}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {statusDetail(status, todayRecord, tz)}
            </p>
          </div>
          <div className="md:p-4">
            {myId ? (
              <CheckButton status={status} />
            ) : (
              <p className="text-center text-sm text-muted-foreground">
                Sin ficha de empleado.
              </p>
            )}
          </div>
        </div>

        <StatCards
          totalMinutesThisMonth={totalMinutesThisMonth}
          daysWorkedThisMonth={
            recent.filter((r) => {
              const rd = new Date(r.date);
              return (
                rd.getUTCFullYear() === Number(y) &&
                rd.getUTCMonth() + 1 === Number(m) &&
                r.totalMinutes !== null
              );
            }).length
          }
          monthLabel={new Intl.DateTimeFormat("es-AR", {
            month: "long",
            year: "numeric",
          }).format(todayDate)}
        />

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Últimos registros</h2>
          {recent.length === 0 ? (
            <p className="rounded-md border bg-card p-6 text-center text-sm text-muted-foreground">
              Todavía no tenés jornadas registradas.
            </p>
          ) : (
            <div className="rounded-lg border bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Entrada</TableHead>
                    <TableHead>Salida</TableHead>
                    <TableHead>Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recent.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>{formatDate(r.date)}</TableCell>
                      <TableCell>{formatTime(r.checkIn, tz)}</TableCell>
                      <TableCell>
                        {r.checkOut ? (
                          formatTime(r.checkOut, tz)
                        ) : (
                          <span className="text-muted-foreground">En curso</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {r.totalMinutes !== null
                          ? formatMinutes(r.totalMinutes)
                          : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </section>
      </div>
    </FeatureGate>
  );
}

function StatCards({
  totalMinutesThisMonth,
  daysWorkedThisMonth,
  monthLabel,
}: {
  totalMinutesThisMonth: number;
  daysWorkedThisMonth: number;
  monthLabel: string;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card
        label={`Horas ${monthLabel}`}
        value={formatMinutes(totalMinutesThisMonth)}
      />
      <Card label="Días trabajados" value={daysWorkedThisMonth.toString()} />
      <Card
        label="Promedio diario"
        value={
          daysWorkedThisMonth > 0
            ? formatMinutes(Math.round(totalMinutesThisMonth / daysWorkedThisMonth))
            : "—"
        }
      />
    </div>
  );
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-card p-5 text-card-foreground shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold capitalize">{value}</p>
    </div>
  );
}

function statusLabel(
  status: "not-started" | "working" | "finished",
  record: { checkIn: Date } | null
): string {
  if (status === "not-started") return "Sin iniciar";
  if (status === "working") return "En curso";
  return "Cerrada";
}

function statusDetail(
  status: "not-started" | "working" | "finished",
  record: { checkIn: Date; totalMinutes: number | null } | null,
  tz: string
): string {
  if (status === "not-started") return "Todavía no registraste entrada hoy.";
  if (status === "working" && record) {
    return `Iniciaste a las ${formatTime(record.checkIn, tz)}.`;
  }
  if (status === "finished" && record) {
    return `Total trabajado: ${formatMinutes(record.totalMinutes ?? 0)}.`;
  }
  return "";
}

function formatDate(d: Date): string {
  return new Date(d).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
}

function formatTime(d: Date, tz: string): string {
  return new Date(d).toLocaleTimeString("es-AR", {
    timeZone: tz,
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatMinutes(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}
