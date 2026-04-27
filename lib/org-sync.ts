import { clerkClient } from "@clerk/nextjs/server";
import { EmployeeRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const DEFAULT_TIMEOFF_TYPES = [
  { key: "vacation", name: "Vacaciones", affectsBalance: true, requiresApproval: true, colorHex: "#0d6efd" },
  { key: "sick", name: "Enfermedad", affectsBalance: false, requiresApproval: false, colorHex: "#dc3545" },
  { key: "personal", name: "Personal", affectsBalance: true, requiresApproval: true, colorHex: "#6c757d" },
];

/**
 * Garantiza que exista una fila `Organization` en la DB para la org de Clerk
 * indicada. Si no existe, la crea on-the-fly con datos de Clerk API +
 * Subscription Starter + TimeOffTypes default. Idempotente vía upsert.
 */
export async function ensureOrganizationSynced(
  clerkOrgId: string
): Promise<{ id: string }> {
  const existing = await prisma.organization.findUnique({
    where: { clerkOrgId },
    select: { id: true },
  });
  if (existing) return existing;

  const client = await clerkClient();
  const clerkOrg = await client.organizations.getOrganization({
    organizationId: clerkOrgId,
  });

  const starterPlan = await prisma.plan.findUnique({
    where: { key: "starter" },
    select: { id: true },
  });
  if (!starterPlan) {
    throw new Error("Plan 'starter' no existe. Corré `npx prisma db seed`.");
  }

  const created = await prisma.organization.upsert({
    where: { clerkOrgId },
    update: {},
    create: {
      clerkOrgId,
      name: clerkOrg.name,
      slug: clerkOrg.slug ?? clerkOrgId,
      subscription: { create: { planId: starterPlan.id, status: "ACTIVE" } },
      timeOffTypes: { createMany: { data: DEFAULT_TIMEOFF_TYPES } },
    },
    select: { id: true },
  });

  console.log(`[org-sync] Organization lazy-creada: ${clerkOrg.name} (${created.id})`);
  return created;
}

/**
 * Mapea el rol de Clerk al rol de aplicación (DB).
 * Clerk free/Pro tier solo nos da `admin` y `basic_member` por default.
 * Mapeamos:
 *   - admin (en Clerk) → ADMIN (en DB)
 *   - cualquier otro     → EMPLOYEE
 *
 * Después, el ADMIN puede cambiar el rol de cualquiera a HR / MANAGER /
 * EMPLOYEE / ADMIN desde el dashboard. Esa elección persiste en la DB y
 * NO se sobreescribe con el rol de Clerk en sincronizaciones futuras.
 */
function clerkRoleToDbRole(clerkRole: string | null | undefined): EmployeeRole {
  const v = (clerkRole ?? "").replace(/^org:/, "").toLowerCase();
  return v === "admin" ? "ADMIN" : "EMPLOYEE";
}

/**
 * Garantiza que exista la fila `Employee` del usuario logueado en la org
 * indicada. Si no existe, la crea desde Clerk API.
 *
 * Devuelve el id y el rol DB (EMPLOYEE/MANAGER/HR/ADMIN). El rol viene de
 * la fila DB; en la primera creación se semilla a partir del rol de Clerk.
 */
export async function ensureEmployeeSynced(
  clerkUserId: string,
  organizationDbId: string,
  options?: { defaultClerkRole?: string | null }
): Promise<{ id: string; role: EmployeeRole }> {
  const existing = await prisma.employee.findFirst({
    where: { organizationId: organizationDbId, clerkUserId },
    select: { id: true, role: true },
  });
  if (existing) return existing;

  // Caso edge: ya hay una fila con ese clerkUserId pero en OTRA org
  // (limitación MVP multi-org).
  const globalConflict = await prisma.employee.findUnique({
    where: { clerkUserId },
    select: { id: true, organizationId: true, role: true },
  });
  if (globalConflict && globalConflict.organizationId !== organizationDbId) {
    console.warn(
      `[org-sync] User ${clerkUserId} ya existe en otra org. Devolviendo esa fila como fallback.`
    );
    return { id: globalConflict.id, role: globalConflict.role };
  }

  // Fetch del user de Clerk para nombre + email.
  const client = await clerkClient();
  const user = await client.users.getUser(clerkUserId);

  const primaryEmail =
    user.emailAddresses.find((e) => e.id === user.primaryEmailAddressId)
      ?.emailAddress ??
    user.emailAddresses[0]?.emailAddress ??
    `${clerkUserId}@unknown.local`;

  const seedRole = clerkRoleToDbRole(options?.defaultClerkRole ?? null);

  // Caso: HR precargó el Employee por email sin clerkUserId. Linkear.
  const preloaded = await prisma.employee.findFirst({
    where: {
      organizationId: organizationDbId,
      email: primaryEmail,
      clerkUserId: { equals: null },
    },
    select: { id: true, role: true },
  });
  if (preloaded) {
    const updated = await prisma.employee.update({
      where: { id: preloaded.id },
      data: {
        clerkUserId,
        firstName: user.firstName ?? undefined,
        lastName: user.lastName ?? undefined,
        isActive: true,
        // Si HR ya le había asignado un rol distinto a EMPLOYEE, respetarlo.
        // Si está en EMPLOYEE default, sobreescribir solo si Clerk dice admin.
        ...(preloaded.role === "EMPLOYEE" && seedRole === "ADMIN"
          ? { role: "ADMIN" }
          : {}),
      },
      select: { id: true, role: true },
    });
    console.log(`[org-sync] Employee lazy-linkeado por email: ${primaryEmail}`);
    return updated;
  }

  const created = await prisma.employee.create({
    data: {
      organizationId: organizationDbId,
      clerkUserId,
      firstName: user.firstName ?? "",
      lastName: user.lastName ?? "",
      email: primaryEmail,
      role: seedRole,
    },
    select: { id: true, role: true },
  });
  console.log(
    `[org-sync] Employee lazy-creado: ${primaryEmail} → role=${seedRole}`
  );
  return created;
}
