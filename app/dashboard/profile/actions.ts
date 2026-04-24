"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentEmployeeId } from "@/lib/tenant";
import {
  profileSelfUpdateSchema,
  type ProfileSelfUpdateInput,
} from "@/lib/validations/employee";

/**
 * Actualiza los datos personales del usuario logueado (self-service).
 * No hay requireRole — cualquier rol puede editar su propia ficha.
 * El helper getCurrentEmployeeId() garantiza que solo modifique lo suyo.
 */
export async function updateSelfProfile(input: ProfileSelfUpdateInput) {
  const myEmpId = await getCurrentEmployeeId();
  if (!myEmpId) {
    throw new Error(
      "No se encontró tu ficha de empleado. Contactá a RRHH para que la creen."
    );
  }

  const data = profileSelfUpdateSchema.parse(input);

  await prisma.employee.update({ where: { id: myEmpId }, data });

  revalidatePath("/dashboard/profile");
}
