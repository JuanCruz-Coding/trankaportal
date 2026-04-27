import { clerkClient } from "@clerk/nextjs/server";
import { EmployeeRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const DEFAULT_TIMEOFF_TYPES = [
  { key: "vacation", name: "Vacaciones", affectsBalance: true, requiresApproval: true, colorHex: "#0d6efd" },
  { key: "sick", name: "Enfermedad", affectsBalance: false, requiresApproval: false, colorHex: "#dc3545" },
  { key: "personal", name: "Personal", affectsBalance: true, requiresApproval: true, colorHex: "#6c757d" },
];

/**
 * Fast-path: con UNA sola query trae Org + Employee del usuario en esa org.
 * Si ambos existen, devuelve los datos. Si alguno falta, devuelve null y el
 * caller debe usar las funciones ensure* para sincronizar.
 *
 * Esto reemplaza el patrón anterior de 2 queries (ensureOrg + ensureEmp) en
 * el happy path (que es el 99% de los requests).
 */
export async function fastFetchOrgAndEmployee(
  clerkUserId: string,
  clerkOrgId: string
): Promise<{
  organizationId: string;
  organizationName: string;
  organizationTimezone: string;
  employeeId: string;
  employeeRole: EmployeeRole;
} | null> {
  const emp = await prisma.employee.findFirst({
    where: {
      clerkUserId,
      organization: { clerkOrgId },
    },
    select: {
      id: true,
      role: true,
      organization: {
        select: { id: true, name: true, timezone: true },
      },
    },
  });
  if (!emp) return null;
  return {
    organizationId: emp.organization.id,
    organizationName: emp.organization.name,
    organizationTimezone: emp.organization.timezone,
    employeeId: emp.id,
    employeeRole: emp.role,
  };
}

/**
 * Garantiza que exista una fila `Organization` en la DB. Si no existe, la crea
 * desde Clerk API + Subscription Starter + TimeOffTypes default.
 *
 * Devuelve los campos que típicamente necesitamos en el dashboard (name, tz)
 * para que el caller no tenga que hacer otra query.
 */
export async function ensureOrganizationSynced(clerkOrgId: string): Promise<{
  id: string;
  name: string;
  timezone: string;
}> {
  const existing = await prisma.organization.findUnique({
    where: { clerkOrgId },
    select: { id: true, name: true, timezone: true },
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
    select: { id: true, name: true, timezone: true },
  });

  console.log(`[org-sync] Organization lazy-creada: ${created.name} (${created.id})`);
  return created;
}

function clerkRoleToDbRole(clerkRole: string | null | undefined): EmployeeRole {
  const v = (clerkRole ?? "").replace(/^org:/, "").toLowerCase();
  return v === "admin" ? "ADMIN" : "EMPLOYEE";
}

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

  const client = await clerkClient();
  const user = await client.users.getUser(clerkUserId);

  const primaryEmail =
    user.emailAddresses.find((e) => e.id === user.primaryEmailAddressId)
      ?.emailAddress ??
    user.emailAddresses[0]?.emailAddress ??
    `${clerkUserId}@unknown.local`;

  const seedRole = clerkRoleToDbRole(options?.defaultClerkRole ?? null);

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
