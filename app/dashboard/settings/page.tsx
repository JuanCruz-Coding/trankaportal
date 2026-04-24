import { redirect } from "next/navigation";
import { ForbiddenError, getOrgContext, requireRole } from "@/lib/tenant";

export default async function SettingsPage() {
  const ctx = await getOrgContext();

  try {
    requireRole(ctx, ["admin"]);
  } catch (err) {
    if (err instanceof ForbiddenError) redirect("/dashboard");
    throw err;
  }

  return (
    <div className="space-y-2">
      <h1 className="text-2xl font-semibold tracking-tight">Configuración</h1>
      <p className="text-sm text-muted-foreground">
        Próximamente: config de la organización y plan.
      </p>
    </div>
  );
}
