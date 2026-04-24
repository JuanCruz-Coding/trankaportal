"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Pencil } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import {
  profileSelfFormSchema,
  type ProfileSelfFormInput,
  profileFormToUpdate,
} from "@/lib/validations/employee";
import { updateSelfProfile } from "../actions";

export function ProfileEditDialog({
  defaultValues,
}: {
  defaultValues: ProfileSelfFormInput;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProfileSelfFormInput>({
    resolver: zodResolver(profileSelfFormSchema),
    defaultValues,
  });

  const onSubmit = handleSubmit((data) => {
    setServerError(null);
    startTransition(async () => {
      try {
        await updateSelfProfile(profileFormToUpdate(data));
        setOpen(false);
        router.refresh();
      } catch (err) {
        setServerError(err instanceof Error ? err.message : "Error al guardar.");
      }
    });
  });

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <Pencil className="h-4 w-4" />
        Editar mis datos
      </Button>

      <Dialog
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) {
            reset(defaultValues);
            setServerError(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar mis datos personales</DialogTitle>
          </DialogHeader>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Nombre" error={errors.firstName?.message} required>
                <Input {...register("firstName")} />
              </Field>
              <Field label="Apellido" error={errors.lastName?.message} required>
                <Input {...register("lastName")} />
              </Field>
            </div>
            <Field label="Teléfono" error={errors.phone?.message}>
              <Input {...register("phone")} />
            </Field>
            <Field label="Fecha de nacimiento" error={errors.birthDate?.message}>
              <Input type="date" {...register("birthDate")} />
            </Field>
            <Field label="Dirección" error={errors.address?.message}>
              <Textarea rows={2} {...register("address")} />
            </Field>

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
                Guardar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Field({
  label,
  error,
  required,
  children,
}: {
  label: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <Label className="mb-1.5">
        {label}
        {required ? <span className="ml-0.5 text-destructive">*</span> : null}
      </Label>
      {children}
      {error ? <p className="mt-1 text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
