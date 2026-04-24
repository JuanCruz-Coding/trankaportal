"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getOrgContext, requireRole } from "@/lib/tenant";

// =========================================================================
// Cambio de plan
// =========================================================================

const planKeySchema = z.enum(["starter", "pro", "business"]);

export async function changePlan(planKey: string) {
  const ctx = await getOrgContext();
  requireRole(ctx, ["admin"]);

  const key = planKeySchema.parse(planKey);

  const newPlan = await prisma.plan.findUnique({
    where: { key },
    select: { id: true },
  });
  if (!newPlan) throw new Error(`Plan ${key} no existe.`);

  await prisma.subscription.update({
    where: { organizationId: ctx.organizationId },
    data: { planId: newPlan.id, status: "ACTIVE" },
  });

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
