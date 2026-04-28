import { redirect } from "next/navigation";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppHeader } from "@/components/layout/app-header";
import {
  getOrgContext,
  NoOrgSelectedError,
  OrgNotSyncedError,
  UnauthenticatedError,
} from "@/lib/tenant";
import { getOrgFeatures } from "@/lib/features";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let ctx;
  try {
    ctx = await getOrgContext();
  } catch (err) {
    if (err instanceof UnauthenticatedError) redirect("/sign-in");
    if (err instanceof NoOrgSelectedError) redirect("/?need=org");
    if (err instanceof OrgNotSyncedError) redirect("/?error=sync");
    throw err;
  }

  // Cargamos las features una vez acá y las pasamos al header + sidebar
  // para evitar que cada uno haga su propia query.
  const featuresSet = await getOrgFeatures(ctx.organizationId);
  const features = [...featuresSet];

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar role={ctx.role} features={features} />
      <div className="flex flex-1 flex-col bg-[var(--color-surface)]">
        <AppHeader role={ctx.role} features={features} />
        <main className="flex-1 px-4 py-6 md:px-8 md:py-8">
          <div className="mx-auto w-full max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
