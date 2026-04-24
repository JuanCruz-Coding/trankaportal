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
  employeeFormSchema,
  type EmployeeFormInput,
  formToCreateInput,
  CONTRACT_TYPE_LABEL,
} from "@/lib/validations/employee";
import {
  createEmployee,
  updateEmployee,
  createDepartment,
  createPosition,
} from "../actions";

type SelectOption = { id: string; label: string };

type Props = {
  mode: "create" | "edit";
  employeeId?: string;
  defaultValues?: Partial<EmployeeFormInput>;
  departments: SelectOption[];
  positions: SelectOption[];
  managers: SelectOption[];
};

const UNASSIGNED = "__unassigned__";

export function EmployeeForm({
  mode,
  employeeId,
  defaultValues,
  departments: initialDepartments,
  positions: initialPositions,
  managers,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);

  // Options en state para poder agregar nuevos inline sin refrescar toda la página.
  const [departments, setDepartments] = useState(initialDepartments);
  const [positions, setPositions] = useState(initialPositions);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors },
  } = useForm<EmployeeFormInput>({
    resolver: zodResolver(employeeFormSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      dni: "",
      phone: "",
      birthDate: "",
      address: "",
      positionId: "",
      departmentId: "",
      managerId: "",
      hireDate: "",
      contractType: "",
      salary: "",
      ...defaultValues,
    },
  });

  const onSubmit = handleSubmit((data) => {
    setServerError(null);
    const payload = formToCreateInput(data);

    startTransition(async () => {
      try {
        if (mode === "create") {
          await createEmployee(payload);
          router.push("/dashboard/employees");
        } else {
          if (!employeeId) throw new Error("Falta employeeId en modo edit");
          await updateEmployee(employeeId, payload);
          router.push(`/dashboard/employees/${employeeId}`);
        }
      } catch (err) {
        setServerError(err instanceof Error ? err.message : "Error al guardar.");
      }
    });
  });

  const contractOptions = Object.entries(CONTRACT_TYPE_LABEL).map(([id, label]) => ({
    id,
    label,
  }));

  return (
    <form onSubmit={onSubmit} className="space-y-8">
      <Section title="Datos personales">
        <Field label="Nombre" error={errors.firstName?.message} required>
          <Input {...register("firstName")} />
        </Field>
        <Field label="Apellido" error={errors.lastName?.message} required>
          <Input {...register("lastName")} />
        </Field>
        <Field label="Email" error={errors.email?.message} required>
          <Input type="email" {...register("email")} />
        </Field>
        <Field label="DNI" error={errors.dni?.message}>
          <Input {...register("dni")} />
        </Field>
        <Field label="Teléfono" error={errors.phone?.message}>
          <Input {...register("phone")} />
        </Field>
        <Field label="Fecha de nacimiento" error={errors.birthDate?.message}>
          <Input type="date" {...register("birthDate")} />
        </Field>
        <Field label="Dirección" error={errors.address?.message} wide>
          <Textarea rows={2} {...register("address")} />
        </Field>
      </Section>

      <Section title="Datos laborales">
        <Field label="Departamento" error={errors.departmentId?.message}>
          <CreatableSelectField
            control={control}
            name="departmentId"
            options={departments}
            placeholder="Sin asignar"
            dialogTitle="Nuevo departamento"
            dialogLabel="Nombre"
            onCreate={async (name) => {
              const d = await createDepartment(name);
              setDepartments((prev) => [...prev, { id: d.id, label: d.name }]);
              setValue("departmentId", d.id);
            }}
          />
        </Field>
        <Field label="Puesto" error={errors.positionId?.message}>
          <CreatableSelectField
            control={control}
            name="positionId"
            options={positions}
            placeholder="Sin asignar"
            dialogTitle="Nuevo puesto"
            dialogLabel="Título"
            onCreate={async (title) => {
              const p = await createPosition(title);
              setPositions((prev) => [...prev, { id: p.id, label: p.title }]);
              setValue("positionId", p.id);
            }}
          />
        </Field>
        <Field label="Manager" error={errors.managerId?.message}>
          <SelectField
            control={control}
            name="managerId"
            options={managers}
            placeholder="Sin asignar"
          />
        </Field>
        <Field label="Fecha de ingreso" error={errors.hireDate?.message}>
          <Input type="date" {...register("hireDate")} />
        </Field>
        <Field label="Tipo de contrato" error={errors.contractType?.message}>
          <SelectField
            control={control}
            name="contractType"
            options={contractOptions}
            placeholder="Sin asignar"
          />
        </Field>
        <Field label="Salario" error={errors.salary?.message} hint="Neto mensual">
          <Input type="number" step="0.01" min="0" {...register("salary")} />
        </Field>
      </Section>

      {serverError ? (
        <p className="rounded-md border border-destructive/50 bg-destructive/5 p-3 text-sm text-destructive">
          {serverError}
        </p>
      ) : null}

      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={isPending}
        >
          Cancelar
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {mode === "create" ? "Crear empleado" : "Guardar cambios"}
        </Button>
      </div>
    </form>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold">{title}</h2>
      <div className="grid gap-4 md:grid-cols-2">{children}</div>
    </div>
  );
}

function Field({
  label,
  error,
  required,
  hint,
  wide,
  children,
}: {
  label: string;
  error?: string;
  required?: boolean;
  hint?: string;
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={wide ? "md:col-span-2" : ""}>
      <Label className="mb-1.5">
        {label}
        {required ? <span className="ml-0.5 text-destructive">*</span> : null}
      </Label>
      {children}
      {hint && !error ? (
        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      ) : null}
      {error ? <p className="mt-1 text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

function SelectField({
  control,
  name,
  options,
  placeholder,
}: {
  control: ReturnType<typeof useForm<EmployeeFormInput>>["control"];
  name: keyof EmployeeFormInput;
  options: SelectOption[];
  placeholder: string;
}) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <Select
          value={field.value ? field.value : UNASSIGNED}
          onValueChange={(v) => field.onChange(v === UNASSIGNED ? "" : v)}
        >
          <SelectTrigger>
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={UNASSIGNED}>{placeholder}</SelectItem>
            {options.map((o) => (
              <SelectItem key={o.id} value={o.id}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    />
  );
}

/**
 * Select + botón "+ Nuevo" al lado que abre un dialog para crear una opción
 * nueva. La opción creada se agrega a la lista y se auto-selecciona.
 */
function CreatableSelectField({
  control,
  name,
  options,
  placeholder,
  dialogTitle,
  dialogLabel,
  onCreate,
}: {
  control: ReturnType<typeof useForm<EmployeeFormInput>>["control"];
  name: keyof EmployeeFormInput;
  options: SelectOption[];
  placeholder: string;
  dialogTitle: string;
  dialogLabel: string;
  onCreate: (value: string) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setError(null);
    setSaving(true);
    try {
      await onCreate(value);
      setValue("");
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <SelectField
            control={control}
            name={name}
            options={options}
            placeholder={placeholder}
          />
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          aria-label={dialogTitle}
          onClick={() => setOpen(true)}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dialogTitle}</DialogTitle>
          </DialogHeader>
          {/*
            Nested form: Dialog corre dentro del <form> del empleado.
            Usamos onKeyDown para que Enter dispare el submit del dialog y no
            propague al form padre (createEmployee).
          */}
          <div className="space-y-3">
            <div>
              <Label className="mb-1.5">{dialogLabel}</Label>
              <Input
                autoFocus
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleSubmit(e);
                  }
                }}
                disabled={saving}
              />
            </div>
            {error ? <p className="text-xs text-destructive">{error}</p> : null}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={saving || value.trim().length === 0}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Crear
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
