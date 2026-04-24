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
      <SheetContent side="left" className="w-64 p-0">
        <SheetHeader className="border-b px-4 py-3">
          <SheetTitle>TrankaPortal</SheetTitle>
        </SheetHeader>
        <div className="p-3">
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
