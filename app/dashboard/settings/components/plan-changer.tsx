"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { changePlan } from "../actions";

export function PlanChanger({ currentPlanKey }: { currentPlanKey: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleChange = (target: string) => {
    if (target === currentPlanKey) return;
    if (
      !confirm(
        `¿Cambiar el plan a ${target.toUpperCase()}? Algunos módulos pueden quedar bloqueados o desbloqueados.`
      )
    ) {
      return;
    }
    startTransition(async () => {
      try {
        await changePlan(target);
        router.refresh();
      } catch (err) {
        alert(err instanceof Error ? err.message : "Error al cambiar plan.");
      }
    });
  };

  const plans = ["starter", "pro", "business"] as const;

  return (
    <div className="flex flex-wrap gap-2">
      {plans.map((p) => (
        <Button
          key={p}
          type="button"
          variant={p === currentPlanKey ? "default" : "outline"}
          size="sm"
          onClick={() => handleChange(p)}
          disabled={isPending || p === currentPlanKey}
        >
          {isPending && p !== currentPlanKey ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : null}
          {p.charAt(0).toUpperCase() + p.slice(1)}
        </Button>
      ))}
    </div>
  );
}
