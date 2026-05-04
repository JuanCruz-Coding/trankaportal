"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import {
  getCurrentEmployeeId,
  getOrgContext,
  requireRole,
} from "@/lib/tenant";
import {
  countBusinessDays,
  timeOffRequestCreateSchema,
  type TimeOffRequestCreateInput,
} from "@/lib/validations/time-off";
import { sendEmailSafe, type EmailPayload } from "@/lib/email";
import { hasFeature } from "@/lib/features";
import {
  createNotifications,
  resolveEscalationRecipients,
} from "@/lib/notifications";

/**
 * Wrapper que solo manda el email si el plan de la org tiene
 * `email-notifications`. Evita consumir Resend en orgs que no pagaron
 * por la feature (cualquier llamada a `sendEmailSafe` directamente
 * en este archivo se saltearía el gating).
 */
async function sendOrgEmailIfEnabled(
  organizationId: string,
  payload: EmailPayload
) {
  const enabled = await hasFeature(organizationId, "email-notifications");
  if (!enabled) return;
  await sendEmailSafe(payload);
}

// =========================================================================
// Balance helper
// =========================================================================

/** Crea el balance anual si no existe. Usa defaultAnnualTimeOffDays de la org. */
async function ensureBalance(
  employeeId: string,
  organizationId: string,
  year: number
) {
  const existing = await prisma.timeOffBalance.findUnique({
    where: { employeeId_year: { employeeId, year } },
  });
  if (existing) return existing;

  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { defaultAnnualTimeOffDays: true },
  });

  return prisma.timeOffBalance.create({
    data: {
      organizationId,
      employeeId,
      year,
      totalDays: org?.defaultAnnualTimeOffDays ?? 14,
      usedDays: 0,
    },
  });
}

// =========================================================================
// createTimeOffRequest (lo crea el propio empleado)
// =========================================================================

export async function createTimeOffRequest(input: TimeOffRequestCreateInput) {
  const ctx = await getOrgContext();
  const myEmpId = await getCurrentEmployeeId();
  if (!myEmpId) throw new Error("No se encontró tu ficha de empleado.");

  const data = timeOffRequestCreateSchema.parse(input);

  // Validar el type: tiene que ser de esta org.
  const type = await prisma.timeOffType.findFirst({
    where: { id: data.typeId, organizationId: ctx.organizationId },
    select: { id: true, name: true, affectsBalance: true },
  });
  if (!type) throw new Error("Tipo de ausencia inválido.");

  const totalDays = countBusinessDays(data.startDate, data.endDate);
  if (totalDays === 0) {
    throw new Error("El rango elegido no incluye días hábiles.");
  }

  // Si afecta saldo, chequear que alcance para el año del inicio.
  if (type.affectsBalance) {
    const year = data.startDate.getFullYear();
    const bal = await ensureBalance(myEmpId, ctx.organizationId, year);
    const available = bal.totalDays - bal.usedDays;
    if (totalDays > available) {
      throw new Error(
        `Saldo insuficiente. Pediste ${totalDays} días hábiles pero tenés ${available} disponibles para ${year}.`
      );
    }
  }

  const req = await prisma.timeOffRequest.create({
    data: {
      organizationId: ctx.organizationId,
      employeeId: myEmpId,
      typeId: type.id,
      startDate: data.startDate,
      endDate: data.endDate,
      totalDays,
      reason: data.reason ?? null,
      status: "PENDING",
    },
    include: {
      employee: { select: { firstName: true, lastName: true, email: true, managerId: true } },
      type: { select: { name: true } },
    },
  });

  // Resolver destinatarios: manager directo, o si no tiene → top-level (CEO).
  let recipientEmployeeIds: string[] = [];
  if (req.employee.managerId) {
    recipientEmployeeIds = [req.employee.managerId];
  } else {
    recipientEmployeeIds = await resolveEscalationRecipients(ctx.organizationId);
  }

  // Notif in-app
  await createNotifications({
    organizationId: ctx.organizationId,
    recipientEmployeeIds,
    type: "TIME_OFF_REQUESTED",
    title: `Nueva solicitud de ${req.employee.firstName} ${req.employee.lastName}`,
    body: `${req.type.name} · ${req.totalDays} día${req.totalDays === 1 ? "" : "s"} desde ${req.startDate.toLocaleDateString("es-AR")}`,
    link: "/dashboard/time-off",
    relatedTimeOffRequestId: req.id,
  });

  // Email (fire-and-forget) — solo si tenemos email del recipient.
  const recipients = await prisma.employee.findMany({
    where: { id: { in: recipientEmployeeIds } },
    select: { email: true },
  });
  const emails = recipients.map((r) => r.email).filter(Boolean);

  if (emails.length > 0) {
    await sendOrgEmailIfEnabled(ctx.organizationId, {
      to: emails,
      subject: `Nueva solicitud de ausencia — ${req.employee.firstName} ${req.employee.lastName}`,
      html: `
        <p><strong>${req.employee.firstName} ${req.employee.lastName}</strong> solicitó una ausencia:</p>
        <ul>
          <li>Tipo: ${req.type.name}</li>
          <li>Desde: ${req.startDate.toLocaleDateString("es-AR")}</li>
          <li>Hasta: ${req.endDate.toLocaleDateString("es-AR")}</li>
          <li>Días hábiles: ${req.totalDays}</li>
          ${req.reason ? `<li>Motivo: ${req.reason}</li>` : ""}
        </ul>
        <p>Revisala en ${process.env.NEXT_PUBLIC_APP_URL ?? ""}/dashboard/time-off</p>
      `,
    });
  }

  revalidatePath("/dashboard/time-off");
  return req;
}

// =========================================================================
// approveTimeOffRequest / rejectTimeOffRequest (manager / hr / admin)
// =========================================================================

async function loadRequestForReview(id: string) {
  const ctx = await getOrgContext();
  requireRole(ctx, ["admin", "hr", "manager"]);

  const req = await prisma.timeOffRequest.findFirst({
    where: { id, organizationId: ctx.organizationId },
    include: {
      employee: {
        select: { id: true, firstName: true, lastName: true, email: true, managerId: true },
      },
      type: { select: { affectsBalance: true, name: true } },
    },
  });
  if (!req) throw new Error("Solicitud no encontrada.");

  // Manager solo puede revisar solicitudes de sus subordinados directos.
  if (ctx.role === "manager") {
    const myEmpId = await getCurrentEmployeeId();
    if (req.employee.managerId !== myEmpId) {
      throw new Error("Solo podés revisar solicitudes de tu equipo directo.");
    }
  }

  return { ctx, req };
}

export async function approveTimeOffRequest(id: string, note?: string | null) {
  const { ctx, req } = await loadRequestForReview(id);
  const reviewerId = await getCurrentEmployeeId();

  if (req.status !== "PENDING") {
    throw new Error(`No se puede aprobar una solicitud en estado ${req.status}.`);
  }

  await prisma.$transaction(async (tx) => {
    // Si afecta saldo, descontar.
    if (req.type.affectsBalance) {
      const year = req.startDate.getFullYear();
      await tx.timeOffBalance.upsert({
        where: { employeeId_year: { employeeId: req.employeeId, year } },
        update: { usedDays: { increment: req.totalDays } },
        create: {
          organizationId: ctx.organizationId,
          employeeId: req.employeeId,
          year,
          totalDays: 14, // fallback, normalmente ya existe desde ensureBalance
          usedDays: req.totalDays,
        },
      });
    }

    await tx.timeOffRequest.update({
      where: { id },
      data: {
        status: "APPROVED",
        reviewedByEmployeeId: reviewerId,
        reviewedAt: new Date(),
        reviewNote: note?.trim() || null,
      },
    });
  });

  await createNotifications({
    organizationId: ctx.organizationId,
    recipientEmployeeIds: [req.employeeId],
    type: "TIME_OFF_APPROVED",
    title: "Tu solicitud fue aprobada",
    body: `${req.type.name} · ${req.totalDays} día${req.totalDays === 1 ? "" : "s"} desde ${req.startDate.toLocaleDateString("es-AR")}`,
    link: "/dashboard/time-off",
    relatedTimeOffRequestId: req.id,
  });

  await sendOrgEmailIfEnabled(ctx.organizationId, {
    to: req.employee.email,
    subject: `Tu solicitud de ${req.type.name} fue aprobada`,
    html: `
      <p>Hola ${req.employee.firstName},</p>
      <p>Tu solicitud de <strong>${req.type.name}</strong> del
         ${req.startDate.toLocaleDateString("es-AR")} al
         ${req.endDate.toLocaleDateString("es-AR")}
         (${req.totalDays} días hábiles) fue <strong>aprobada</strong>.</p>
      ${note ? `<p>Comentario: ${note}</p>` : ""}
    `,
  });

  revalidatePath("/dashboard/time-off");
}

export async function rejectTimeOffRequest(id: string, note: string) {
  const { ctx, req } = await loadRequestForReview(id);
  const reviewerId = await getCurrentEmployeeId();

  if (req.status !== "PENDING") {
    throw new Error(`No se puede rechazar una solicitud en estado ${req.status}.`);
  }
  if (!note || note.trim().length === 0) {
    throw new Error("Explicá el motivo del rechazo.");
  }

  await prisma.timeOffRequest.update({
    where: { id },
    data: {
      status: "REJECTED",
      reviewedByEmployeeId: reviewerId,
      reviewedAt: new Date(),
      reviewNote: note.trim(),
    },
  });

  await createNotifications({
    organizationId: ctx.organizationId,
    recipientEmployeeIds: [req.employeeId],
    type: "TIME_OFF_REJECTED",
    title: "Tu solicitud fue rechazada",
    body: `Motivo: ${note.trim()}`,
    link: "/dashboard/time-off",
    relatedTimeOffRequestId: req.id,
  });

  await sendOrgEmailIfEnabled(ctx.organizationId, {
    to: req.employee.email,
    subject: `Tu solicitud de ${req.type.name} fue rechazada`,
    html: `
      <p>Hola ${req.employee.firstName},</p>
      <p>Tu solicitud del
         ${req.startDate.toLocaleDateString("es-AR")} al
         ${req.endDate.toLocaleDateString("es-AR")}
         fue <strong>rechazada</strong>.</p>
      <p>Motivo: ${note}</p>
    `,
  });

  revalidatePath("/dashboard/time-off");
}

// =========================================================================
// cancelTimeOffRequest (el propio empleado cancela)
// =========================================================================

export async function cancelTimeOffRequest(id: string) {
  const ctx = await getOrgContext();
  const myEmpId = await getCurrentEmployeeId();
  if (!myEmpId) throw new Error("No se encontró tu ficha.");

  const req = await prisma.timeOffRequest.findFirst({
    where: { id, organizationId: ctx.organizationId },
    include: { type: { select: { affectsBalance: true } } },
  });
  if (!req) throw new Error("Solicitud no encontrada.");
  if (req.employeeId !== myEmpId) {
    throw new Error("Solo podés cancelar tus propias solicitudes.");
  }
  if (req.status === "REJECTED" || req.status === "CANCELLED") {
    throw new Error("Esta solicitud ya está cerrada.");
  }

  const wasApproved = req.status === "APPROVED";

  await prisma.$transaction(async (tx) => {
    await tx.timeOffRequest.update({
      where: { id },
      data: { status: "CANCELLED" },
    });

    // Si ya estaba aprobada y descontada del saldo, devolver.
    if (wasApproved && req.type.affectsBalance) {
      const year = req.startDate.getFullYear();
      await tx.timeOffBalance.update({
        where: { employeeId_year: { employeeId: req.employeeId, year } },
        data: { usedDays: { decrement: req.totalDays } },
      });
    }
  });

  // Si era aprobada, avisarle a quien la había aprobado (manager / top-level).
  if (wasApproved) {
    const fullReq = await prisma.timeOffRequest.findUnique({
      where: { id },
      include: {
        employee: {
          select: { firstName: true, lastName: true, managerId: true },
        },
      },
    });
    if (fullReq) {
      let recipients: string[] = [];
      if (fullReq.employee.managerId) {
        recipients = [fullReq.employee.managerId];
      } else {
        recipients = await resolveEscalationRecipients(ctx.organizationId);
      }
      await createNotifications({
        organizationId: ctx.organizationId,
        recipientEmployeeIds: recipients,
        type: "TIME_OFF_CANCELLED",
        title: `Solicitud cancelada por ${fullReq.employee.firstName} ${fullReq.employee.lastName}`,
        body: `Del ${fullReq.startDate.toLocaleDateString("es-AR")} al ${fullReq.endDate.toLocaleDateString("es-AR")}`,
        link: "/dashboard/time-off",
        relatedTimeOffRequestId: id,
      });
    }
  }

  revalidatePath("/dashboard/time-off");
}

// =========================================================================
// Helpers de lectura para pages (cacheables)
// =========================================================================

export async function getMyCurrentBalance() {
  const ctx = await getOrgContext();
  const myEmpId = await getCurrentEmployeeId();
  if (!myEmpId) return null;

  const year = new Date().getFullYear();
  const bal = await ensureBalance(myEmpId, ctx.organizationId, year);
  return {
    year,
    totalDays: bal.totalDays,
    usedDays: bal.usedDays,
    remainingDays: bal.totalDays - bal.usedDays,
  };
}

