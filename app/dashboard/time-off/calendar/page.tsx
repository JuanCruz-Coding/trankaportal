import Link from "next/link";
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import { FeatureGate } from "@/components/feature-gate";
import { buttonVariants } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { getCurrentEmployeeId, getOrgContext } from "@/lib/tenant";

type Props = { searchParams: Promise<{ m?: string }> };

export default async function TimeOffCalendarPage({ searchParams }: Props) {
  const ctx = await getOrgContext();
  const params = await searchParams;

  // Mes activo: query param `m=YYYY-MM`, default al mes actual.
  const now = new Date();
  const activeMonth = parseMonthParam(params.m) ?? {
    year: now.getFullYear(),
    month: now.getMonth(),
  };
  const monthStart = new Date(activeMonth.year, activeMonth.month, 1);
  const monthEnd = new Date(activeMonth.year, activeMonth.month + 1, 0);

  // Manager ve solo su equipo.
  let managerScopeIds: string[] | null = null;
  if (ctx.role === "manager") {
    const myEmpId = await getCurrentEmployeeId();
    if (myEmpId) {
      const subs = await prisma.employee.findMany({
        where: { organizationId: ctx.organizationId, managerId: myEmpId },
        select: { id: true },
      });
      managerScopeIds = [myEmpId, ...subs.map((s) => s.id)];
    } else {
      managerScopeIds = [];
    }
  }

  // Requests APROBADAS que se solapan con el mes activo.
  const requests = await prisma.timeOffRequest.findMany({
    where: {
      organizationId: ctx.organizationId,
      status: "APPROVED",
      startDate: { lte: monthEnd },
      endDate: { gte: monthStart },
      ...(managerScopeIds !== null ? { employeeId: { in: managerScopeIds } } : {}),
    },
    include: {
      employee: { select: { firstName: true, lastName: true } },
      type: { select: { name: true, colorHex: true } },
    },
  });

  // Prev / Next mes.
  const prevUrl = `/dashboard/time-off/calendar?m=${monthKey(
    activeMonth.year,
    activeMonth.month - 1
  )}`;
  const nextUrl = `/dashboard/time-off/calendar?m=${monthKey(
    activeMonth.year,
    activeMonth.month + 1
  )}`;

  return (
    <FeatureGate feature="time-off.calendar">
      <div className="space-y-6">
        <header className="flex flex-wrap items-center gap-3">
          <Link
            href="/dashboard/time-off"
            className={buttonVariants({ variant: "ghost", size: "icon-sm" })}
            aria-label="Volver"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl font-semibold tracking-tight capitalize">
              {formatMonth(monthStart)}
            </h1>
            <p className="text-sm text-muted-foreground">
              Quién está ausente en el mes.{" "}
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

        <MonthGrid
          year={activeMonth.year}
          month={activeMonth.month}
          requests={requests.map((r) => ({
            start: r.startDate,
            end: r.endDate,
            label: `${r.employee.firstName} ${r.employee.lastName}`,
            type: r.type.name,
            color: r.type.colorHex,
          }))}
        />
      </div>
    </FeatureGate>
  );
}

type Event = {
  start: Date;
  end: Date;
  label: string;
  type: string;
  color: string | null;
};

function MonthGrid({
  year,
  month,
  requests,
}: {
  year: number;
  month: number;
  requests: Event[];
}) {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const daysInMonth = last.getDate();

  // Alineación: queremos que la semana empiece lunes (day 1).
  // getDay(): 0=Dom, 1=Lun, ..., 6=Sáb. Convertir a 0=Lun ... 6=Dom.
  const firstDow = (first.getDay() + 6) % 7;

  // Celdas vacías al inicio + días del mes.
  const cells: (number | null)[] = [
    ...Array(firstDow).fill(null),
    ...Array(daysInMonth)
      .fill(0)
      .map((_, i) => i + 1),
  ];
  // Completar hasta múltiplo de 7.
  while (cells.length % 7 !== 0) cells.push(null);

  const today = new Date();
  const isTodayCell = (d: number) =>
    today.getFullYear() === year &&
    today.getMonth() === month &&
    today.getDate() === d;

  return (
    <div className="overflow-hidden rounded-lg border bg-card">
      <div className="grid grid-cols-7 border-b bg-muted/50 text-[10px] font-medium uppercase tracking-wide md:text-xs">
        {/* Mobile: 1 letra. Desktop: 3 letras */}
        {[
          { full: "Lun", short: "L" },
          { full: "Mar", short: "M" },
          { full: "Mié", short: "M" },
          { full: "Jue", short: "J" },
          { full: "Vie", short: "V" },
          { full: "Sáb", short: "S" },
          { full: "Dom", short: "D" },
        ].map((d, i) => (
          <div
            key={i}
            className="p-1.5 text-center text-muted-foreground md:p-2"
          >
            <span className="md:hidden">{d.short}</span>
            <span className="hidden md:inline">{d.full}</span>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((day, i) => {
          if (day === null) {
            return (
              <div
                key={i}
                className="min-h-16 border-b border-r bg-muted/20 md:min-h-24"
              />
            );
          }
          const dayDate = new Date(year, month, day);
          const events = requests.filter((r) => dateInRange(dayDate, r.start, r.end));
          // Mobile muestra 1 evento, desktop hasta 3
          const visibleCount = 3;
          return (
            <div
              key={i}
              className={`min-h-16 border-b border-r p-1 md:min-h-24 md:p-1.5 ${
                isTodayCell(day) ? "bg-accent/30" : ""
              }`}
            >
              <div className="mb-0.5 text-[10px] font-medium md:mb-1 md:text-xs">
                {day}
              </div>
              <div className="space-y-0.5">
                {events.slice(0, 1).map((e, idx) => (
                  <div
                    key={idx}
                    title={`${e.label} — ${e.type}`}
                    className="truncate rounded px-1 py-0.5 text-[9px] font-medium md:text-[10px]"
                    style={{
                      backgroundColor: (e.color ?? "#0d6efd") + "22",
                      color: e.color ?? "#0d6efd",
                    }}
                  >
                    {e.label}
                  </div>
                ))}
                {/* Mobile: si hay 1+ resto, mostrar +N. Desktop: mostrar hasta 3 y +N para resto */}
                <div className="hidden md:block">
                  {events.slice(1, visibleCount).map((e, idx) => (
                    <div
                      key={idx}
                      title={`${e.label} — ${e.type}`}
                      className="truncate rounded px-1 py-0.5 text-[10px] font-medium"
                      style={{
                        backgroundColor: (e.color ?? "#0d6efd") + "22",
                        color: e.color ?? "#0d6efd",
                      }}
                    >
                      {e.label}
                    </div>
                  ))}
                  {events.length > visibleCount ? (
                    <div className="text-[10px] text-muted-foreground">
                      +{events.length - visibleCount} más
                    </div>
                  ) : null}
                </div>
                {events.length > 1 ? (
                  <div className="text-[9px] text-muted-foreground md:hidden">
                    +{events.length - 1}
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function dateInRange(d: Date, start: Date, end: Date): boolean {
  const t = d.getTime();
  const s = new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime();
  const e = new Date(end.getFullYear(), end.getMonth(), end.getDate()).getTime();
  return t >= s && t <= e;
}

function parseMonthParam(m?: string): { year: number; month: number } | null {
  if (!m) return null;
  const match = m.match(/^(\d{4})-(\d{2})$/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  if (isNaN(year) || isNaN(month) || month < 0 || month > 11) return null;
  return { year, month };
}

function monthKey(year: number, month: number): string {
  // Normalizar rollover: month -1 o 12 → ajustar año.
  const d = new Date(year, month, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function formatMonth(d: Date): string {
  return d.toLocaleDateString("es-AR", { month: "long", year: "numeric" });
}
