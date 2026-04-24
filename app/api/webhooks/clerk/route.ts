import type { NextRequest } from "next/server";
import { verifyWebhook } from "@clerk/nextjs/webhooks";
import { prisma } from "@/lib/prisma";

// Webhook de Clerk. URL pública: /api/webhooks/clerk
// Configurar en Clerk Dashboard → Webhooks → Endpoints con signing secret
// en CLERK_WEBHOOK_SIGNING_SECRET.
//
// Eventos suscriptos (ver Clerk Dashboard):
//   - organization.created / .updated / .deleted
//   - organizationMembership.created / .deleted
//   - user.updated

const DEFAULT_TIMEOFF_TYPES = [
  { key: "vacation", name: "Vacaciones", affectsBalance: true, requiresApproval: true, colorHex: "#0d6efd" },
  { key: "sick", name: "Enfermedad", affectsBalance: false, requiresApproval: false, colorHex: "#dc3545" },
  { key: "personal", name: "Personal", affectsBalance: true, requiresApproval: true, colorHex: "#6c757d" },
];

export async function POST(req: NextRequest) {
  // 1) Verificar firma. Si falla → 400. Clerk no reintenta 4xx.
  let evt;
  try {
    evt = await verifyWebhook(req);
  } catch (err) {
    console.error("[webhook] Verificación fallida:", err);
    return new Response("Webhook verification failed", { status: 400 });
  }

  // 2) Despachar por tipo. Si un handler tira, devolvemos 500 para que Clerk reintente.
  try {
    switch (evt.type) {
      case "organization.created":
        await handleOrgCreated(evt.data);
        break;
      case "organization.updated":
        await handleOrgUpdated(evt.data);
        break;
      case "organization.deleted":
        await handleOrgDeleted(evt.data);
        break;
      case "organizationMembership.created":
        await handleMembershipCreated(evt.data);
        break;
      case "organizationMembership.deleted":
        await handleMembershipDeleted(evt.data);
        break;
      case "user.updated":
        await handleUserUpdated(evt.data);
        break;
      default:
        // Evento no manejado — responder 200 igual para que Clerk no reintente.
        console.log(`[webhook] Evento ignorado: ${evt.type}`);
    }
    return new Response("OK", { status: 200 });
  } catch (err) {
    console.error(`[webhook] Error procesando ${evt.type}:`, err);
    return new Response("Handler error", { status: 500 });
  }
}

// =========================================================================
// Handlers
// =========================================================================

async function handleOrgCreated(data: OrganizationData) {
  const starterPlan = await prisma.plan.findUnique({ where: { key: "starter" } });
  if (!starterPlan) throw new Error("Plan 'starter' no existe. Corré `npx prisma db seed`.");

  const org = await prisma.organization.upsert({
    where: { clerkOrgId: data.id },
    update: {
      name: data.name,
      slug: data.slug ?? data.id,
    },
    create: {
      clerkOrgId: data.id,
      name: data.name,
      slug: data.slug ?? data.id,
      // timezone y defaultAnnualTimeOffDays toman los defaults del schema
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
  });

  console.log(`[webhook] Organization created: ${org.name} (${org.id})`);
}

async function handleOrgUpdated(data: OrganizationData) {
  await prisma.organization.updateMany({
    where: { clerkOrgId: data.id },
    data: { name: data.name, slug: data.slug ?? data.id },
  });
}

async function handleOrgDeleted(data: { id?: string }) {
  if (!data.id) return; // evento de delete sin id → nada que hacer
  // Cascade borra Subscription, Employees, Documents, TimeOff*, AttendanceRecords, etc.
  await prisma.organization.deleteMany({ where: { clerkOrgId: data.id } });
}

async function handleMembershipCreated(data: MembershipData) {
  const clerkUserId = data.public_user_data.user_id;
  const clerkOrgId = data.organization.id;

  const org = await prisma.organization.findUnique({
    where: { clerkOrgId },
    select: { id: true },
  });
  if (!org) {
    // Orden invertido: membership llegó antes que organization.created.
    // Devolver 500 para que Clerk reintente cuando la org ya exista.
    throw new Error(`Organization ${clerkOrgId} todavía no existe en DB`);
  }

  // Si ya existe un Employee con ese clerkUserId (limitación MVP: un user = una org),
  // ignorar. En el futuro multi-org, esto debería crear una fila nueva.
  const existing = await prisma.employee.findUnique({
    where: { clerkUserId },
    select: { id: true, organizationId: true },
  });
  if (existing) {
    if (existing.organizationId !== org.id) {
      console.warn(
        `[webhook] User ${clerkUserId} ya existe en otra org. Ignorando membership en ${clerkOrgId}.`
      );
    } else {
      // Reactivar si estaba desactivado (rehire).
      await prisma.employee.update({
        where: { id: existing.id },
        data: { isActive: true },
      });
    }
    return;
  }

  const primaryEmail =
    data.public_user_data.identifier ??
    `${clerkUserId}@unknown.local`; // fallback por si el shape falla

  await prisma.employee.create({
    data: {
      organizationId: org.id,
      clerkUserId,
      firstName: data.public_user_data.first_name ?? "",
      lastName: data.public_user_data.last_name ?? "",
      email: primaryEmail,
    },
  });

  console.log(`[webhook] Employee created: ${primaryEmail} → ${org.id}`);
}

async function handleMembershipDeleted(data: MembershipData) {
  const clerkUserId = data.public_user_data.user_id;
  await prisma.employee.updateMany({
    where: { clerkUserId },
    data: { isActive: false },
  });
}

async function handleUserUpdated(data: UserData) {
  const primaryEmail = getPrimaryEmail(data);
  await prisma.employee.updateMany({
    where: { clerkUserId: data.id },
    data: {
      firstName: data.first_name ?? "",
      lastName: data.last_name ?? "",
      ...(primaryEmail ? { email: primaryEmail } : {}),
    },
  });
}

function getPrimaryEmail(data: UserData): string | null {
  const primary = data.email_addresses?.find(
    (e) => e.id === data.primary_email_address_id
  );
  return primary?.email_address ?? data.email_addresses?.[0]?.email_address ?? null;
}

// =========================================================================
// Tipos mínimos de los payloads de Clerk. Los tipos oficiales son un discriminated
// union enorme — acá nos quedamos con los campos que usamos.
// =========================================================================

type OrganizationData = { id: string; name: string; slug?: string | null };

type MembershipData = {
  organization: { id: string };
  public_user_data: {
    user_id: string;
    first_name?: string | null;
    last_name?: string | null;
    identifier?: string; // email
  };
};

type UserData = {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  primary_email_address_id?: string | null;
  email_addresses?: Array<{ id: string; email_address: string }>;
};
