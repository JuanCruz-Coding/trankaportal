"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { setEmployeeActive } from "../actions";

export function EmployeeActiveToggle({
  id,
  isActive,
}: {
  id: string;
  isActive: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const onClick = () => {
    const confirmText = isActive
      ? "¿Desactivar este empleado? Queda en la DB pero marcado como inactivo."
      : "¿Reactivar este empleado?";
    if (!confirm(confirmText)) return;

    startTransition(async () => {
      await setEmployeeActive(id, !isActive);
      router.refresh();
    });
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={onClick}
      disabled={isPending}
    >
      {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
      {isActive ? "Desactivar" : "Reactivar"}
    </Button>
  );
}
