"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, LogIn, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { checkIn, checkOut } from "../actions";

type Status = "not-started" | "working" | "finished";

export function CheckButton({ status }: { status: Status }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handle = (action: () => Promise<void>) => {
    startTransition(async () => {
      try {
        await action();
        router.refresh();
      } catch (err) {
        alert(err instanceof Error ? err.message : "Error.");
      }
    });
  };

  // En mobile el botón es full-width y alto (touch-friendly).
  // En desktop queda compacto al lado de la card de estado.
  const baseClasses = "w-full h-14 text-base md:h-10 md:w-auto md:text-sm";

  if (status === "not-started") {
    return (
      <Button
        size="lg"
        className={baseClasses}
        onClick={() => handle(checkIn)}
        disabled={isPending}
      >
        {isPending ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <LogIn className="h-5 w-5" />
        )}
        Iniciar jornada
      </Button>
    );
  }
  if (status === "working") {
    return (
      <Button
        size="lg"
        variant="destructive"
        className={baseClasses}
        onClick={() => handle(checkOut)}
        disabled={isPending}
      >
        {isPending ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <LogOut className="h-5 w-5" />
        )}
        Terminar jornada
      </Button>
    );
  }
  // finished
  return (
    <Button size="lg" variant="outline" className={baseClasses} disabled>
      Jornada cerrada
    </Button>
  );
}
