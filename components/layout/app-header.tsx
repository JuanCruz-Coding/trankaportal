import { UserButton, OrganizationSwitcher } from "@clerk/nextjs";
import { MobileNav } from "./mobile-nav";
import type { FeatureKey } from "@/lib/features";
import type { OrgRole } from "@/lib/tenant";

export function AppHeader({
  role,
  features,
}: {
  role: OrgRole;
  features: FeatureKey[];
}) {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-4 border-b bg-background px-4 md:px-6">
      <div className="flex items-center gap-2">
        <MobileNav role={role} features={features} />
      </div>
      <div className="flex items-center gap-3">
        <OrganizationSwitcher
          hidePersonal
          afterCreateOrganizationUrl="/dashboard"
          afterSelectOrganizationUrl="/dashboard"
        />
        <UserButton />
      </div>
    </header>
  );
}
