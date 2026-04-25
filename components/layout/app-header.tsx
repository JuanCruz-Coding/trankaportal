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
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-2 border-b bg-background px-3 md:px-6">
      <div className="flex shrink-0 items-center gap-2">
        <MobileNav role={role} features={features} />
      </div>
      <div className="flex min-w-0 items-center gap-2 md:gap-3">
        <div className="min-w-0">
          <OrganizationSwitcher
            hidePersonal
            afterCreateOrganizationUrl="/dashboard"
            afterSelectOrganizationUrl="/dashboard"
          />
        </div>
        <UserButton />
      </div>
    </header>
  );
}
