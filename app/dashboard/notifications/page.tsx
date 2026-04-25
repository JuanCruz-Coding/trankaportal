import Link from "next/link";
import { redirect } from "next/navigation";
import { Bell } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";
import { getCurrentEmployeeId } from "@/lib/tenant";
import { MarkAllReadButton } from "./components/mark-all-read-button";

export default async function NotificationsPage() {
  const myId = await getCurrentEmployeeId();
  if (!myId) redirect("/dashboard");

  const items = await prisma.notification.findMany({
    where: { recipientEmployeeId: myId },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const unreadCount = items.filter((n) => !n.readAt).length;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Notificaciones</h1>
          <p className="text-sm text-muted-foreground">
            Mostramos las últimas 100. Las leídas se borran automáticamente
            después de 30 días.
          </p>
        </div>
        {unreadCount > 0 ? <MarkAllReadButton /> : null}
      </header>

      {items.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border bg-card p-10 text-center">
          <Bell className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            No tenés notificaciones todavía.
          </p>
        </div>
      ) : (
        <div className="rounded-lg border bg-card">
          <ul className="divide-y">
            {items.map((n) => {
              const inner = (
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      "mt-1.5 h-2 w-2 shrink-0 rounded-full",
                      n.readAt ? "bg-transparent" : "bg-primary"
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p
                        className={cn(
                          "text-sm",
                          n.readAt ? "text-muted-foreground" : "font-medium"
                        )}
                      >
                        {n.title}
                      </p>
                      <Badge variant="secondary" className="text-[10px]">
                        {labelForType(n.type)}
                      </Badge>
                    </div>
                    {n.body ? (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {n.body}
                      </p>
                    ) : null}
                    <p className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                      {formatDate(n.createdAt)}
                    </p>
                  </div>
                </div>
              );
              return (
                <li key={n.id}>
                  {n.link ? (
                    <Link
                      href={n.link}
                      className="block px-4 py-3 transition-colors hover:bg-accent"
                    >
                      {inner}
                    </Link>
                  ) : (
                    <div className="px-4 py-3">{inner}</div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

const TYPE_LABEL: Record<string, string> = {
  TIME_OFF_REQUESTED: "Ausencia",
  TIME_OFF_APPROVED: "Ausencia",
  TIME_OFF_REJECTED: "Ausencia",
  TIME_OFF_CANCELLED: "Ausencia",
  DOCUMENT_UPLOADED: "Documento",
  WELCOME: "Bienvenida",
};

function labelForType(t: string): string {
  return TYPE_LABEL[t] ?? t;
}

function formatDate(d: Date): string {
  return new Date(d).toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}
