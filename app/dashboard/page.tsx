import Link from "next/link";
import { currentUser } from "@clerk/nextjs/server";
import {
  Users,
  Clock,
  CalendarOff,
  Inbox,
  ChevronRight,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Reveal } from "@/components/reveal";
import { prisma } from "@/lib/prisma";
import { getCurrentEmployeeId, getOrgContext } from "@/lib/tenant";
import { getMyCurrentBalance } from "./time-off/actions";
import { STATUS_LABEL, STATUS_VARIANT } from "@/lib/validations/time-off";

export default async function DashboardHome() {
  const ctx = await getOrgContext();
  const myId = await getCurrentEmployeeId();
  const canManage = ctx.role === "admin" || ctx.role === "hr" || ctx.role === "manager";

  // tz viene del ctx; nombre de org también. La única cosa que sigue
  // necesitando una query separada es el plan (vía subscription).
  const tz = ctx.organizationTimezone;

  // Pre-computar fecha de hoy una vez (la usa todayRecord query).
  const todayParts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const todayY = todayParts.find((p) => p.type === "year")!.value;
  const todayM = todayParts.find((p) => p.type === "month")!.value;
  const todayD = todayParts.find((p) => p.type === "day")!.value;
  const todayDate = new Date(`${todayY}-${todayM}-${todayD}T00:00:00.000Z`);

  // TODO en paralelo: user de Clerk + 6 queries.
  const [user, plan, activeEmployees, pendingForReview, myUpcoming, todayRecord, balance] =
    await Promise.all([
      currentUser(),
      prisma.subscription.findUnique({
        where: { organizationId: ctx.organizationId },
        select: { plan: { select: { name: true } } },
      }),
      // Empleados activos
      prisma.employee.count({
        where: { organizationId: ctx.organizationId, isActive: true },
      }),
      // Solicitudes pendientes para revisar (filtradas por scope si es manager)
      canManage
        ? prisma.timeOffRequest.count({
            where: {
              organizationId: ctx.organizationId,
              status: "PENDING",
              ...(ctx.role === "manager" && myId
                ? { employee: { managerId: myId } }
                : {}),
            },
          })
        : Promise.resolve(0),
      // Mis próximas ausencias aprobadas
      myId
        ? prisma.timeOffRequest.findMany({
            where: {
              employeeId: myId,
              status: { in: ["PENDING", "APPROVED"] },
              endDate: { gte: new Date() },
            },
            orderBy: { startDate: "asc" },
            take: 3,
            include: { type: { select: { name: true } } },
          })
        : Promise.resolve([] as never[]),
      // Mi attendance de hoy
      myId
        ? prisma.attendanceRecord.findUnique({
            where: {
              employeeId_date: { employeeId: myId, date: todayDate },
            },
            select: { checkIn: true, checkOut: true },
          })
        : Promise.resolve(null),
      // Mi saldo de vacaciones
      getMyCurrentBalance(),
    ]);

  const greeting = computeGreeting(tz);
  const firstName = user?.firstName ?? "";

  return (
    <div className="space-y-8">
      <Reveal>
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
          {greeting}
          {firstName ? <span className="text-primary">, {firstName}</span> : ""}.
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {ctx.organizationName} · Plan{" "}
          <span className="font-medium text-foreground">
            {plan?.plan.name ?? "—"}
          </span>{" "}
          · Rol{" "}
          <span className="font-medium text-foreground">
            {ctx.role.toUpperCase()}
          </span>
        </p>
      </Reveal>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Users}
          label="Empleados activos"
          value={activeEmployees.toString()}
          href="/dashboard/employees"
        />
        <StatCard
          icon={CalendarOff}
          label="Mi saldo de vacaciones"
          value={balance ? `${balance.remainingDays} días` : "—"}
          hint={balance ? `Año ${balance.year}` : undefined}
          href="/dashboard/time-off"
        />
        <StatCard
          icon={Clock}
          label="Asistencia hoy"
          value={
            !todayRecord
              ? "Sin iniciar"
              : todayRecord.checkOut
              ? "Cerrada"
              : "En curso"
          }
          hint={
            todayRecord?.checkIn
              ? `Entrada ${formatTime(todayRecord.checkIn, tz)}`
              : undefined
          }
          href="/dashboard/attendance"
        />
        {canManage ? (
          <StatCard
            icon={Inbox}
            label="Solicitudes por aprobar"
            value={pendingForReview.toString()}
            hint={ctx.role === "manager" ? "De tu equipo" : "Toda la org"}
            href="/dashboard/time-off"
            highlight={pendingForReview > 0}
          />
        ) : null}
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <div className="rounded-lg border bg-card p-5 text-card-foreground shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold">Mis próximas ausencias</h2>
            <Link
              href="/dashboard/time-off"
              className="text-xs text-muted-foreground hover:underline"
            >
              Ver todo
            </Link>
          </div>
          {myUpcoming.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No tenés ausencias programadas.
            </p>
          ) : (
            <ul className="divide-y">
              {myUpcoming.map((r) => (
                <li key={r.id} className="flex items-center justify-between py-2">
                  <div>
                    <p className="text-sm font-medium">{r.type.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(r.startDate)} → {formatDate(r.endDate)} (
                      {r.totalDays} días)
                    </p>
                  </div>
                  <Badge variant={STATUS_VARIANT[r.status]}>
                    {STATUS_LABEL[r.status]}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-lg border bg-card p-5 text-card-foreground shadow-sm">
          <h2 className="mb-4 text-base font-semibold">Atajos</h2>
          <div className="space-y-2">
            <Shortcut href="/dashboard/time-off" label="Solicitar ausencia" />
            <Shortcut href="/dashboard/attendance" label="Marcar asistencia" />
            <Shortcut href="/dashboard/profile" label="Editar mi perfil" />
            {canManage ? (
              <Shortcut
                href="/dashboard/employees/chart"
                label="Ver organigrama"
              />
            ) : null}
            {ctx.role === "admin" ? (
              <Shortcut href="/dashboard/settings" label="Configuración" />
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  href,
  highlight,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  hint?: string;
  href: string;
  highlight?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`group rounded-lg border bg-card p-5 text-card-foreground shadow-sm transition-colors hover:bg-accent ${
        highlight ? "ring-2 ring-primary/40" : ""
      }`}
    >
      <div className="mb-2 flex items-center justify-between">
        <Icon className="h-5 w-5 text-muted-foreground" />
        <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
      </div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </Link>
  );
}

function Shortcut({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent"
    >
      <span>{label}</span>
      <ChevronRight className="h-4 w-4 text-muted-foreground" />
    </Link>
  );
}

function formatDate(d: Date): string {
  return new Date(d).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
}

function formatTime(d: Date, tz: string | undefined): string {
  return new Date(d).toLocaleTimeString("es-AR", {
    timeZone: tz ?? "America/Argentina/Buenos_Aires",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function computeGreeting(timezone: string): string {
  // Hora local en la TZ de la org. Mañana 5-12, tarde 12-19, noche 19-5.
  const hour = Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      hour: "numeric",
      hour12: false,
    }).format(new Date())
  );
  if (hour >= 5 && hour < 12) return "Buenos días";
  if (hour >= 12 && hour < 19) return "Buenas tardes";
  return "Buenas noches";
}
