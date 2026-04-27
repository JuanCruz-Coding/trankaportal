"use client";

import { usePathname } from "next/navigation";
import { NavList } from "./nav";
import type { FeatureKey } from "@/lib/features";
import type { OrgRole } from "@/lib/tenant";

export function AppSidebar({
  role,
  features,
}: {
  role: OrgRole;
  features: FeatureKey[];
}) {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex md:w-64 md:shrink-0 md:flex-col md:border-r md:border-border md:bg-sidebar md:text-sidebar-foreground">
      {/* Branding — color brand para el logo */}
      <div className="flex h-16 items-center border-b border-border px-5">
        <div className="flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-lg bg-[var(--color-brand)]" />
          <div className="flex flex-col leading-tight">
            <span className="text-[15px] font-semibold tracking-tight text-foreground">
              TrankaPortal
            </span>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
              by Trankasoft
            </span>
          </div>
        </div>
      </div>

      {/* Nav — espacios generosos */}
      <div className="flex-1 overflow-y-auto px-3 py-4">
        <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          General
        </p>
        <NavList pathname={pathname} role={role} features={features} />
      </div>
    </aside>
  );
}
