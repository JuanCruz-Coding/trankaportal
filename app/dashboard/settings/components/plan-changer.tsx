"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { changePlan } from "../actions";

const SUPPORT_EMAIL = "hola@trankasoft.com";

const PLAN_LABELS: Record<string, string> = {
  starter: "Starter",
  pro: "Pro",
  business: "Business",
};

export function PlanChanger({ currentPlanKey }: { currentPlanKey: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [contactDialog, setContactDialog] = useState<string | null>(null);

  const handleClick = (target: string) => {
    if (target === currentPlanKey) return;

    // Upgrade a planes pagos → abrir dialog de contacto.
    // El cobro se hace manual hasta que tengamos integración con MercadoPago.
    if (target !== "starter") {
      setContactDialog(target);
      return;
    }

    // Downgrade a Starter (gratis) — confirmamos y aplicamos.
    if (
      !confirm(
        `¿Cambiar el plan a Starter? Algunos módulos pueden quedar bloqueados.`
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
    <>
      <div className="flex flex-wrap gap-2">
        {plans.map((p) => (
          <Button
            key={p}
            type="button"
            variant={p === currentPlanKey ? "default" : "outline"}
            size="sm"
            onClick={() => handleClick(p)}
            disabled={isPending || p === currentPlanKey}
          >
            {isPending && p === "starter" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : null}
            {PLAN_LABELS[p]}
          </Button>
        ))}
      </div>

      <Dialog
        open={contactDialog !== null}
        onOpenChange={(o) => {
          if (!o) setContactDialog(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Upgradear a {contactDialog ? PLAN_LABELS[contactDialog] : ""}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>
              Para activar el plan{" "}
              <strong>{contactDialog ? PLAN_LABELS[contactDialog] : ""}</strong>,
              escribinos a{" "}
              <a
                href={`mailto:${SUPPORT_EMAIL}?subject=Upgrade a plan ${contactDialog ? PLAN_LABELS[contactDialog] : ""}`}
                className="text-primary hover:underline"
              >
                {SUPPORT_EMAIL}
              </a>{" "}
              y te respondemos en menos de 24 horas con el detalle de pago.
            </p>
            <p>
              Una vez recibida la transferencia, activamos tu plan al instante.
              Cobros mensuales por transferencia o MercadoPago.
            </p>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setContactDialog(null)}
            >
              Cerrar
            </Button>
            <Button
              type="button"
              onClick={() => {
                window.location.href = `mailto:${SUPPORT_EMAIL}?subject=Upgrade a plan ${contactDialog ? PLAN_LABELS[contactDialog] : ""}`;
              }}
            >
              <Mail className="h-4 w-4" />
              Escribir email
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
