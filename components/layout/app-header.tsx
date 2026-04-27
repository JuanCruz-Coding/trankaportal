import { UserButton, OrganizationSwitcher } from "@clerk/nextjs";
import { MobileNav } from "./mobile-nav";
import { NotificationBell } from "./notification-bell";
import { getUnreadCount } from "@/app/dashboard/notifications/actions";
import type { FeatureKey } from "@/lib/features";
import type { OrgRole } from "@/lib/tenant";

export async function AppHeader({
  role,
  features,
}: {
  role: OrgRole;
  features: FeatureKey[];
}) {
  const initialUnread = await getUnreadCount();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-2 border-b border-border bg-background/80 px-4 backdrop-blur-md md:px-6">
      <div className="flex shrink-0 items-center gap-2">
        <MobileNav role={role} features={features} />
      </div>
      <div className="flex min-w-0 items-center gap-3">
        <div className="min-w-0">
          <OrganizationSwitcher
            hidePersonal
            afterCreateOrganizationUrl="/dashboard"
            afterSelectOrganizationUrl="/dashboard"
            appearance={{
              elements: {
                organizationSwitcherTrigger:
                  "rounded-lg px-2.5 py-1.5 hover:bg-surface transition-colors",
              },
            }}
          />
        </div>
        <div className="h-5 w-px bg-border" aria-hidden />
        <NotificationBell initialUnreadCount={initialUnread} />
        <UserButton
          appearance={{
            elements: {
              avatarBox: "h-8 w-8",
            },
          }}
        />
      </div>
    </header>
  );
}
