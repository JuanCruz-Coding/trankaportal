"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import {
  timeOffRequestFormSchema,
  type TimeOffRequestFormInput,
  formToCreate,
  countBusinessDays,
} from "@/lib/validations/time-off";
import { createTimeOffRequest } from "../actions";

export function RequestDialog({
  types,
}: {
  types: { id: string; name: string; affectsBalance: boolean }[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    formState: { errors },
  } = useForm<TimeOffRequestFormInput>({
    resolver: zodResolver(timeOffRequestFormSchema),
    defaultValues: { typeId: "", startDate: "", endDate: "", reason: "" },
  });

  const startStr = watch("startDate");
  const endStr = watch("endDate");
  const days =
    startStr && endStr
      ? countBusinessDays(new Date(startStr), new Date(endStr))
      : 0;

  const onSubmit = handleSubmit((data) => {
    setServerError(null);
    startTransition(async () => {
      try {
        await createTimeOffRequest(formToCreate(data));
        setOpen(false);
        reset();
        router.refresh();
      } catch (err) {
        setServerError(err instanceof Error ? err.message : "Error al solicitar.");
      }
    });
  });

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" />
        Nueva solicitud
      </Button>

      <Dialog
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) {
            reset();
            setServerError(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nueva solicitud de ausencia</DialogTitle>
          </DialogHeader>
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <Label className="mb-1.5">
                Tipo <span className="text-destructive">*</span>
              </Label>
              <Controller
                control={control}
                name="typeId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Elegí un tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      {types.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name}
                          {!t.affectsBalance ? " (no descuenta saldo)" : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.typeId ? (
                <p className="mt-1 text-xs text-destructive">{errors.typeId.message}</p>
              ) : null}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label className="mb-1.5">
                  Desde <span className="text-destructive">*</span>
                </Label>
                <Input type="date" {...register("startDate")} />
                {errors.startDate ? (
                  <p className="mt-1 text-xs text-destructive">
                    {errors.startDate.message}
                  </p>
                ) : null}
              </div>
              <div>
                <Label className="mb-1.5">
                  Hasta <span className="text-destructive">*</span>
                </Label>
                <Input type="date" {...register("endDate")} />
                {errors.endDate ? (
                  <p className="mt-1 text-xs text-destructive">
                    {errors.endDate.message}
                  </p>
                ) : null}
              </div>
            </div>

            {days > 0 ? (
              <p className="rounded-md bg-muted px-3 py-2 text-sm">
                Total: <strong>{days} día{days === 1 ? "" : "s"} hábil{days === 1 ? "" : "es"}</strong>{" "}
                <span className="text-muted-foreground">(excluye findes)</span>
              </p>
            ) : null}

            <div>
              <Label className="mb-1.5">Motivo (opcional)</Label>
              <Textarea rows={3} {...register("reason")} />
              {errors.reason ? (
                <p className="mt-1 text-xs text-destructive">{errors.reason.message}</p>
              ) : null}
            </div>

            {serverError ? (
              <p className="rounded-md border border-destructive/50 bg-destructive/5 p-3 text-sm text-destructive">
                {serverError}
              </p>
            ) : null}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={isPending}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Enviar solicitud
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
