"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getOrgContext, requireRole } from "@/lib/tenant";
import { orgFeaturesCacheTag } from "@/lib/features";

// =========================================================================
// Cambio de plan
// =========================================================================

const planKeySchema = z.enum(["starter", "pro", "business"]);

export async function changePlan(planKey: string) {
  const ctx = await getOrgContext();
  requireRole(ctx, ["admin"]);

  const key = planKeySchema.parse(planKey);

  // Self-service: solo permitimos downgrade a Starter desde la UI.
  // Upgrades a Pro/Business requieren contacto manual + cobro:
  // el cliente nos escribe a hola@trankasoft.com, transfiere, y nosotros
  // aplicamos el cambio directamente en Supabase Table Editor.
  if (key !== "starter") {
    throw new Error(
      "Para upgradear a Pro o Business, contactanos a hola@trankasoft.com. Te respondemos en menos de 24hs con el detalle de pago."
    );
  }

  const newPlan = await prisma.plan.findUnique({
    where: { key },
    select: { id: true },
  });
  if (!newPlan) throw new Error(`Plan ${key} no existe.`);

  await prisma.subscription.update({
    where: { organizationId: ctx.organizationId },
    data: { planId: newPlan.id, status: "ACTIVE" },
  });

  // Invalidar caché de features (la sidebar ya muestra/oculta módulos según plan).
  revalidateTag(orgFeaturesCacheTag(ctx.organizationId), "default");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/settings");
}

// =========================================================================
// Config de organización (timezone + saldo default de vacaciones)
// =========================================================================

const orgSettingsSchema = z.object({
  timezone: z.string().min(1),
  defaultAnnualTimeOffDays: z.coerce.number().int().min(0).max(60),
});

export async function updateOrgSettings(formData: FormData) {
  const ctx = await getOrgContext();
  requireRole(ctx, ["admin"]);

  const data = orgSettingsSchema.parse({
    timezone: formData.get("timezone"),
    defaultAnnualTimeOffDays: formData.get("defaultAnnualTimeOffDays"),
  });

  await prisma.organization.update({
    where: { id: ctx.organizationId },
    data,
  });

  revalidatePath("/dashboard/settings");
}
