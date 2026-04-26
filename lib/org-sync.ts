import { clerkClient } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

/**
 * Defaults para crear una org nueva (mismos que usa el webhook de Clerk).
 * Mantener en sync con `app/api/webhooks/clerk/route.ts`.
 */
const DEFAULT_TIMEOFF_TYPES = [
  { key: "vacation", name: "Vacaciones", affectsBalance: true, requiresApproval: true, colorHex: "#0d6efd" },
  { key: "sick", name: "Enfermedad", affectsBalance: false, requiresApproval: false, colorHex: "#dc3545" },
  { key: "personal", name: "Personal", affectsBalance: true, requiresApproval: true, colorHex: "#6c757d" },
];

/**
 * Garantiza que exista una fila `Organization` en la DB para la org de Clerk
 * indicada. Si no existe, la crea on-the-fly con datos de Clerk API +
 * Subscription Starter + TimeOffTypes default.
 *
 * Sirve como fallback al webhook: cuando Clerk redirige al user a /dashboard
 * inmediatamente después de crear la org, hay una ventana de race condition
 * donde el webhook todavía no llegó. Sin esta función la primera carga del
 * dashboard fallaba con `OrgNotSyncedError`.
 *
 * Idempotente vía upsert.
 */
export async function ensureOrganizationSynced(
  clerkOrgId: string
): Promise<{ id: string }> {
  const existing = await prisma.organization.findUnique({
    where: { clerkOrgId },
    select: { id: true },
  });
  if (existing) return existing;

  // No existe → fetch de Clerk para tener nombre/slug.
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

  // Upsert por las dudas: si el webhook llegó entre el findUnique y el create,
  // evita duplicate key error.
  const created = await prisma.organization.upsert({
    where: { clerkOrgId },
    update: {},
    create: {
      clerkOrgId,
      name: clerkOrg.name,
      slug: clerkOrg.slug ?? clerkOrgId,
      subscription: {
        create: {
          planId: starterPlan.id,
          status: "ACTIVE",
        },
      },
      timeOffTypes: {
        createMany: { data: DEFAULT_TIMEOFF_TYPES },
      },
    },
    select: { id: true },
  });

  console.log(`[org-sync] Organization lazy-creada: ${clerkOrg.name} (${created.id})`);
  return created;
}

/**
 * Garantiza que exista la fila `Employee` del usuario logueado en la org
 * indicada. Si no existe, la crea desde datos de Clerk API.
 *
 * Mismo motivo que `ensureOrganizationSynced` — fallback al webhook
 * `organizationMembership.created` que puede tardar.
 */
export async function ensureEmployeeSynced(
  clerkUserId: string,
  organizationDbId: string
): Promise<{ id: string }> {
  const existing = await prisma.employee.findFirst({
    where: { organizationId: organizationDbId, clerkUserId },
    select: { id: true },
  });
  if (existing) return existing;

  // Fetch del user de Clerk para nombre + email.
  const client = await clerkClient();
  const user = await client.users.getUser(clerkUserId);

  const primaryEmail =
    user.emailAddresses.find((e) => e.id === user.primaryEmailAddressId)
      ?.emailAddress ??
    user.emailAddresses[0]?.emailAddress ??
    `${clerkUserId}@unknown.local`;

  // Caso edge: ya hay una fila con ese clerkUserId pero en OTRA org.
  // Por la limitación MVP (clerkUserId @unique global), no podemos crear otra.
  // Devolvemos la existente, log de warning.
  const globalConflict = await prisma.employee.findUnique({
    where: { clerkUserId },
    select: { id: true, organizationId: true },
  });
  if (globalConflict && globalConflict.organizationId !== organizationDbId) {
    console.warn(
      `[org-sync] User ${clerkUserId} ya existe en otra org. Devolviendo esa fila como fallback.`
    );
    return { id: globalConflict.id };
  }

  // Caso: HR precargó por email sin clerkUserId. Linkear.
  const preloaded = await prisma.employee.findFirst({
    where: {
      organizationId: organizationDbId,
      email: primaryEmail,
      clerkUserId: { equals: null },
    },
    select: { id: true },
  });
  if (preloaded) {
    await prisma.employee.update({
      where: { id: preloaded.id },
      data: {
        clerkUserId,
        firstName: user.firstName ?? undefined,
        lastName: user.lastName ?? undefined,
        isActive: true,
      },
    });
    console.log(`[org-sync] Employee lazy-linkeado por email: ${primaryEmail}`);
    return preloaded;
  }

  const created = await prisma.employee.create({
    data: {
      organizationId: organizationDbId,
      clerkUserId,
      firstName: user.firstName ?? "",
      lastName: user.lastName ?? "",
      email: primaryEmail,
    },
    select: { id: true },
  });
  console.log(`[org-sync] Employee lazy-creado: ${primaryEmail}`);
  return created;
}
