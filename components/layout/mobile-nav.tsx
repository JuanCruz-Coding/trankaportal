"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { NavList } from "./nav";
import type { FeatureKey } from "@/lib/features";
import type { OrgRole } from "@/lib/tenant";

export function MobileNav({
  role,
  features,
}: {
  role: OrgRole;
  features: FeatureKey[];
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={<Button variant="ghost" size="icon" className="md:hidden" aria-label="Abrir menú" />}>
        <Menu className="h-5 w-5" />
      </SheetTrigger>
      <SheetContent side="left" className="w-72 p-0">
        <SheetHeader className="border-b border-border px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-lg bg-[var(--color-brand)]" />
            <div className="flex flex-col leading-tight">
              <SheetTitle className="text-[15px] font-semibold tracking-tight">
                TrankaPortal
              </SheetTitle>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                by Trankasoft
              </span>
            </div>
          </div>
        </SheetHeader>
        <div className="px-3 py-4">
          <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            General
          </p>
          <NavList
            pathname={pathname}
            role={role}
            features={features}
            onItemClick={() => setOpen(false)}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
