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
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { prisma } from "@/lib/prisma";
import { getCurrentEmployeeId, getOrgContext, type OrgRole } from "@/lib/tenant";
import {
  getOrgActiveEmployeeCount,
  getOrgPlan,
} from "@/lib/cached-queries";
import { getMyCurrentBalance } from "../time-off/actions";
import { STATUS_LABEL, STATUS_VARIANT } from "@/lib/validations/time-off";

// =========================================================================
// Header dinámico
// =========================================================================

export async function HeaderName() {
  const user = await currentUser();
  const firstName = user?.firstName;
  if (!firstName) return null;
  return <span className="text-primary">, {firstName}</span>;
}

export async function HeaderPlan({ organizationId }: { organizationId: string }) {
  const plan = await getOrgPlan(organizationId);
  return (
    <>
      Plan{" "}
      <span className="font-medium text-foreground">{plan?.name ?? "—"}</span>
    </>
  );
}

export function HeaderPlanFallback() {
  return (
    <span className="text-muted-foreground/60">Plan …</span>
  );
}

// =========================================================================
// Stats grid — 1 Suspense, 1 Promise.all
// =========================================================================

export async function DashboardStats({ canManage }: { canManage: boolean }) {
  const ctx = await getOrgContext();
  const myId = await getCurrentEmployeeId();
  const tz = ctx.organizationTimezone;

  // Pre-computar fecha de hoy en la TZ de la org (para attendanceRecord).
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

  const [activeEmployees, pendingForReview, todayRecord, balance] =
    await Promise.all([
      getOrgActiveEmployeeCount(ctx.organizationId),
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
      myId
        ? prisma.attendanceRecord.findUnique({
            where: { employeeId_date: { employeeId: myId, date: todayDate } },
            select: { checkIn: true, checkOut: true },
          })
        : Promise.resolve(null),
      getMyCurrentBalance(),
    ]);

  return (
    <>
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
    </>
  );
}

export function StatsSkeleton({ canManage }: { canManage: boolean }) {
  const count = canManage ? 4 : 3;
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <StatCardSkeleton key={i} />
      ))}
    </>
  );
}

function StatCardSkeleton() {
  return (
    <Card className="h-full">
      <CardContent>
        <div className="mb-2 flex items-center justify-between">
          <div className="h-5 w-5 animate-pulse rounded bg-muted" />
        </div>
        <div className="h-3 w-24 animate-pulse rounded bg-muted" />
        <div className="mt-2 h-7 w-20 animate-pulse rounded bg-muted" />
      </CardContent>
    </Card>
  );
}

// =========================================================================
// Mis próximas ausencias
// =========================================================================

export async function MyUpcomingRequests() {
  const myId = await getCurrentEmployeeId();
  const myUpcoming = myId
    ? await prisma.timeOffRequest.findMany({
        where: {
          employeeId: myId,
          status: { in: ["PENDING", "APPROVED"] },
          endDate: { gte: new Date() },
        },
        orderBy: { startDate: "asc" },
        take: 3,
        include: { type: { select: { name: true } } },
      })
    : [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Mis próximas ausencias</CardTitle>
        <CardAction>
          <Link
            href="/dashboard/time-off"
            className="text-xs text-muted-foreground hover:underline"
          >
            Ver todo
          </Link>
        </CardAction>
      </CardHeader>
      <CardContent>
        {myUpcoming.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No tenés ausencias programadas.
          </p>
        ) : (
          <ul className="divide-y divide-border/60">
            {myUpcoming.map((r) => (
              <li
                key={r.id}
                className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0"
              >
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
      </CardContent>
    </Card>
  );
}

export function UpcomingSkeleton() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Mis próximas ausencias</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="space-y-1.5">
                <div className="h-4 w-32 animate-pulse rounded bg-muted" />
                <div className="h-3 w-48 animate-pulse rounded bg-muted" />
              </div>
              <div className="h-5 w-16 animate-pulse rounded-full bg-muted" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// =========================================================================
// Shortcuts (sync — solo necesita role)
// =========================================================================

export function ShortcutsCard({
  role,
  canManage,
}: {
  role: OrgRole;
  canManage: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Atajos</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          <Shortcut href="/dashboard/time-off" label="Solicitar ausencia" />
          <Shortcut href="/dashboard/attendance" label="Marcar asistencia" />
          <Shortcut href="/dashboard/profile" label="Editar mi perfil" />
          {canManage ? (
            <Shortcut
              href="/dashboard/employees/chart"
              label="Ver organigrama"
            />
          ) : null}
          {role === "admin" ? (
            <Shortcut href="/dashboard/settings" label="Configuración" />
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

// =========================================================================
// Helpers
// =========================================================================

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
    <Link href={href} className="group block">
      <Card
        className={cn(
          "h-full transition-colors hover:bg-accent",
          highlight ? "ring-2 ring-primary/40" : ""
        )}
      >
        <CardContent>
          <div className="mb-2 flex items-center justify-between">
            <Icon className="h-5 w-5 text-muted-foreground" />
            <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
          </div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </p>
          <p className="mt-1 text-2xl font-semibold">{value}</p>
          {hint ? (
            <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
          ) : null}
        </CardContent>
      </Card>
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

export function computeGreeting(timezone: string): string {
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
