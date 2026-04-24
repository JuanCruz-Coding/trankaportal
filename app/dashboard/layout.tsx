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
      <div className="flex flex-1 flex-col">
        <AppHeader role={ctx.role} features={features} />
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
