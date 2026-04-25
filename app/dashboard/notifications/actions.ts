"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentEmployeeId, getOrgContext } from "@/lib/tenant";

/**
 * TTL de notificaciones leídas. Las leídas con más de 30 días se borran lazy
 * cuando se consulta la lista, así no acumulamos basura para siempre.
 */
const READ_TTL_DAYS = 30;

async function purgeOldRead(employeeId: string) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - READ_TTL_DAYS);
  await prisma.notification.deleteMany({
    where: {
      recipientEmployeeId: employeeId,
      readAt: { lte: cutoff },
    },
  });
}

export async function getUnreadCount(): Promise<number> {
  const myId = await getCurrentEmployeeId();
  if (!myId) return 0;
  return prisma.notification.count({
    where: { recipientEmployeeId: myId, readAt: null },
  });
}

export type NotificationItem = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  readAt: Date | null;
  createdAt: Date;
};

export async function getRecentNotifications(
  limit = 10
): Promise<NotificationItem[]> {
  const myId = await getCurrentEmployeeId();
  if (!myId) return [];

  // Cleanup oportunista — barato, evita acumular leídas viejas.
  void purgeOldRead(myId);

  const items = await prisma.notification.findMany({
    where: { recipientEmployeeId: myId },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      type: true,
      title: true,
      body: true,
      link: true,
      readAt: true,
      createdAt: true,
    },
  });
  return items;
}

export async function markAsRead(id: string): Promise<void> {
  const myId = await getCurrentEmployeeId();
  if (!myId) throw new Error("No se encontró tu ficha.");

  // Tenant safety: solo el dueño marca su propia notif.
  await prisma.notification.updateMany({
    where: { id, recipientEmployeeId: myId, readAt: null },
    data: { readAt: new Date() },
  });
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/notifications");
}

export async function markAllAsRead(): Promise<void> {
  const myId = await getCurrentEmployeeId();
  if (!myId) throw new Error("No se encontró tu ficha.");

  await prisma.notification.updateMany({
    where: { recipientEmployeeId: myId, readAt: null },
    data: { readAt: new Date() },
  });
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/notifications");
}
