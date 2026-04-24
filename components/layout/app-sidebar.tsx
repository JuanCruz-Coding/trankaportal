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
    <aside className="hidden md:flex md:w-60 md:shrink-0 md:flex-col md:border-r md:bg-sidebar md:text-sidebar-foreground">
      <div className="flex h-14 items-center border-b px-4">
        <span className="font-semibold tracking-tight">TrankaPortal</span>
      </div>
      <div className="flex-1 overflow-y-auto p-3">
        <NavList pathname={pathname} role={role} features={features} />
      </div>
    </aside>
  );
}
