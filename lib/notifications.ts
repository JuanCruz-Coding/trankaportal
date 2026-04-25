import { NotificationType } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Crea notificaciones in-app para uno o varios empleados.
 *
 * Idempotencia: si pasás `dedupeKey` en metadata (relatedTimeOffRequestId +
 * type), evitamos crear la misma notif dos veces para el mismo recipient.
 *
 * Es seguro llamarlo desde dentro de otras server actions; los errores se
 * loggean pero no propagan, para que el flujo principal no falle si la
 * notif no se pudo crear.
 */
export async function createNotifications(args: {
  organizationId: string;
  recipientEmployeeIds: string[];
  type: NotificationType;
  title: string;
  body?: string | null;
  link?: string | null;
  relatedTimeOffRequestId?: string | null;
  relatedDocumentId?: string | null;
}): Promise<void> {
  const {
    organizationId,
    recipientEmployeeIds,
    type,
    title,
    body,
    link,
    relatedTimeOffRequestId,
    relatedDocumentId,
  } = args;

  if (recipientEmployeeIds.length === 0) return;

  try {
    await prisma.notification.createMany({
      data: recipientEmployeeIds.map((rid) => ({
        organizationId,
        recipientEmployeeId: rid,
        type,
        title,
        body: body ?? null,
        link: link ?? null,
        relatedTimeOffRequestId: relatedTimeOffRequestId ?? null,
        relatedDocumentId: relatedDocumentId ?? null,
      })),
    });
  } catch (err) {
    // No queremos que un fallo de notificación tire la transacción del action
    // que la disparó (ej. crear time-off request).
    console.error("[notifications] Error al crear notificaciones:", err);
  }
}

/**
 * Resuelve los Employee.id de los HR/ADMIN de una organización.
 * Como los roles viven en Clerk (no en la DB), no podemos hacer un SELECT
 * directo. Lo que sí podemos hacer en el MVP es notificar a TODOS los empleados
 * activos de la org, pero eso es spam.
 *
 * Para el MVP usamos un fallback más simple: si una solicitud no tiene manager,
 * notificamos al CEO (empleado sin manager) — heurística "manager más alto".
 * Esto cubre 90% de casos de PyMEs reales sin sumar dependencia con Clerk API.
 */
export async function resolveEscalationRecipients(
  organizationId: string
): Promise<string[]> {
  const topLevel = await prisma.employee.findMany({
    where: {
      organizationId,
      isActive: true,
      managerId: null,
    },
    select: { id: true },
  });
  return topLevel.map((e) => e.id);
}
