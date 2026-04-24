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
              className="flex cursor-not-allowed items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground opacity-60"
            >
              <Icon className="h-4 w-4" />
              <span className="flex-1">{item.label}</span>
              <Lock className="h-3 w-3" />
            </span>
          );
        }

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onItemClick}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )}
          >
            <Icon className="h-4 w-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
