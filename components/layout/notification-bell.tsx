"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, Check, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

import {
  getRecentNotifications,
  getUnreadCount,
  markAllAsRead,
  markAsRead,
  type NotificationItem,
} from "@/app/dashboard/notifications/actions";

const POLL_INTERVAL_MS = 60_000;

export function NotificationBell({
  initialUnreadCount,
}: {
  initialUnreadCount: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const [items, setItems] = useState<NotificationItem[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [, startTransition] = useTransition();

  // Polling cada 60s — solo cuando la pestaña está visible.
  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      if (typeof document !== "undefined" && document.hidden) return;
      try {
        const count = await getUnreadCount();
        if (!cancelled) setUnreadCount(count);
      } catch {
        // silencio: no rompemos el header si una request falla.
      }
    };
    const interval = setInterval(tick, POLL_INTERVAL_MS);
    // También refresca cuando vuelve a estar visible (ej. cambias de pestaña).
    const onVisible = () => {
      if (!document.hidden) tick();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  // Cargar la lista cuando el popover se abre.
  useEffect(() => {
    if (!open) return;
    setLoading(true);
    getRecentNotifications(10)
      .then((res) => setItems(res))
      .finally(() => setLoading(false));
  }, [open]);

  const handleClick = (n: NotificationItem) => {
    if (!n.readAt) {
      startTransition(async () => {
        await markAsRead(n.id);
        setUnreadCount((c) => Math.max(0, c - 1));
        setItems((prev) =>
          prev
            ? prev.map((x) => (x.id === n.id ? { ...x, readAt: new Date() } : x))
            : prev
        );
      });
    }
    if (n.link) {
      setOpen(false);
      router.push(n.link);
    }
  };

  const handleMarkAll = () => {
    startTransition(async () => {
      await markAllAsRead();
      setUnreadCount(0);
      setItems((prev) =>
        prev ? prev.map((x) => ({ ...x, readAt: x.readAt ?? new Date() })) : prev
      );
    });
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            className="relative"
            aria-label="Notificaciones"
          />
        }
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : null}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <p className="text-sm font-semibold">Notificaciones</p>
          {unreadCount > 0 ? (
            <button
              type="button"
              onClick={handleMarkAll}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Marcar todas como leídas
            </button>
          ) : null}
        </div>

        <div className="max-h-96 overflow-y-auto">
          {loading && !items ? (
            <div className="flex items-center justify-center p-6">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : items && items.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              No tenés notificaciones todavía.
            </div>
          ) : (
            <ul className="divide-y">
              {items?.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => handleClick(n)}
                    className="block w-full px-3 py-2.5 text-left transition-colors hover:bg-accent"
                  >
                    <div className="flex items-start gap-2">
                      <div
                        className={cn(
                          "mt-1.5 h-2 w-2 shrink-0 rounded-full",
                          n.readAt ? "bg-transparent" : "bg-primary"
                        )}
                      />
                      <div className="min-w-0 flex-1">
                        <p
                          className={cn(
                            "text-sm",
                            n.readAt ? "text-muted-foreground" : "font-medium"
                          )}
                        >
                          {n.title}
                        </p>
                        {n.body ? (
                          <p className="mt-0.5 truncate text-xs text-muted-foreground">
                            {n.body}
                          </p>
                        ) : null}
                        <p className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                          {timeAgo(n.createdAt)}
                        </p>
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="border-t px-3 py-2">
          <Link
            href="/dashboard/notifications"
            onClick={() => setOpen(false)}
            className="flex items-center justify-center text-xs text-muted-foreground hover:text-foreground"
          >
            Ver todas
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function timeAgo(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "ahora";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `hace ${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `hace ${days}d`;
  return date.toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
  });
}
