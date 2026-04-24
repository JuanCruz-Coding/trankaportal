import { redirect } from "next/navigation";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppHeader } from "@/components/layout/app-header";
import {
  getOrgContext,
  NoOrgSelectedError,
  OrgNotSyncedError,
  UnauthenticatedError,
} from "@/lib/tenant";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Verifica sesión + org seleccionada + org en DB. Si falta algo, redirigimos.
  try {
    await getOrgContext();
  } catch (err) {
    if (err instanceof UnauthenticatedError) redirect("/sign-in");
    if (err instanceof NoOrgSelectedError) redirect("/?need=org");
    if (err instanceof OrgNotSyncedError) redirect("/?error=sync");
    throw err;
  }

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar />
      <div className="flex flex-1 flex-col">
        <AppHeader />
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
