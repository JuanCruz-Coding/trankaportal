import Link from "next/link";
import {
  LayoutDashboard,
  Users,
  CalendarOff,
  Clock,
  UserCircle,
  Settings,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Empleados", href: "/dashboard/employees", icon: Users },
  { label: "Ausencias", href: "/dashboard/time-off", icon: CalendarOff },
  { label: "Asistencia", href: "/dashboard/attendance", icon: Clock },
  { label: "Mi perfil", href: "/dashboard/profile", icon: UserCircle },
  { label: "Configuración", href: "/dashboard/settings", icon: Settings },
];

/**
 * Lista de links del menú. Se usa tanto en el sidebar de escritorio como en el
 * drawer mobile. Marca el item activo basándose en el pathname actual.
 */
export function NavList({
  pathname,
  onItemClick,
}: {
  pathname: string;
  onItemClick?: () => void;
}) {
  return (
    <nav className="flex flex-col gap-1">
      {NAV_ITEMS.map((item) => {
        const active =
          pathname === item.href ||
          (item.href !== "/dashboard" && pathname.startsWith(item.href));
        const Icon = item.icon;
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
