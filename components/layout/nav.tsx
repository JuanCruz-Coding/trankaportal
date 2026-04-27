import Link from "next/link";
import {
  LayoutDashboard,
  Users,
  CalendarOff,
  Clock,
  UserCircle,
  Settings,
  Lock,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { FeatureKey } from "@/lib/features";
import type { OrgRole } from "@/lib/tenant";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Roles con acceso. Undefined = todos. */
  roles?: OrgRole[];
  /** Feature requerida. Undefined = siempre disponible. */
  feature?: FeatureKey;
};

export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  {
    label: "Empleados",
    href: "/dashboard/employees",
    icon: Users,
    roles: ["admin", "hr", "manager"],
    feature: "employees",
  },
  {
    label: "Ausencias",
    href: "/dashboard/time-off",
    icon: CalendarOff,
    feature: "time-off",
  },
  {
    label: "Asistencia",
    href: "/dashboard/attendance",
    icon: Clock,
    feature: "attendance",
  },
  {
    label: "Mi perfil",
    href: "/dashboard/profile",
    icon: UserCircle,
    feature: "self-service",
  },
  {
    label: "Configuración",
    href: "/dashboard/settings",
    icon: Settings,
    roles: ["admin"],
  },
];

/**
 * Lista de links del menú. Aplica dos reglas:
 *  - RBAC (hard): si el rol del user no está en `item.roles`, NO se muestra el item.
 *  - FeatureGate (soft): si el plan no tiene `item.feature`, se muestra pero
 *    deshabilitado con candado.
 */
export function NavList({
  pathname,
  role,
  features,
  onItemClick,
}: {
  pathname: string;
  role: OrgRole;
  features: FeatureKey[];
  onItemClick?: () => void;
}) {
  const featureSet = new Set(features);

  return (
    <nav className="flex flex-col gap-1">
      {NAV_ITEMS.map((item) => {
        // Hard RBAC — ocultar completamente si el rol no tiene acceso
        if (item.roles && !item.roles.includes(role)) return null;

        const locked = item.feature ? !featureSet.has(item.feature) : false;
        const active =
          pathname === item.href ||
          (item.href !== "/dashboard" && pathname.startsWith(item.href));
        const Icon = item.icon;

        if (locked) {
          return (
            <span
              key={item.href}
              title="Mejorá tu plan para acceder"
              className="group/nav relative flex cursor-not-allowed items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium text-muted-foreground/70"
            >
              <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
              <span className="flex-1">{item.label}</span>
              <Lock className="h-3.5 w-3.5" />
            </span>
          );
        }

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onItemClick}
            className={cn(
              "group/nav relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-all duration-150 ease-out",
              active
                ? "bg-surface text-foreground"
                : "text-muted-foreground hover:bg-surface/60 hover:text-foreground"
            )}
          >
            {/* Indicador izquierdo accent — estilo Linear */}
            {active ? (
              <span
                aria-hidden
                className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-primary"
              />
            ) : null}
            <Icon
              className={cn(
                "h-[18px] w-[18px] transition-colors",
                active ? "text-primary" : "text-muted-foreground group-hover/nav:text-foreground"
              )}
              strokeWidth={1.75}
            />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
