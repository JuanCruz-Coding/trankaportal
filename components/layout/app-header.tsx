import { UserButton, OrganizationSwitcher } from "@clerk/nextjs";
import { MobileNav } from "./mobile-nav";

/**
 * Header superior del dashboard.
 * En mobile muestra el botón hamburguesa; en desktop el espacio queda limpio
 * porque el sidebar ya tiene el branding.
 */
export function AppHeader() {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-4 border-b bg-background px-4 md:px-6">
      <div className="flex items-center gap-2">
        <MobileNav />
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
