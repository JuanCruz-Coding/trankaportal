import { z } from "zod";
import { ContractType } from "@prisma/client";

// =========================================================================
// Server-side schema (lo usa la server action).
// Acá sí coercemos tipos porque los datos llegan desde el cliente ya parseados.
// =========================================================================

const optionalString = z.string().trim().nullable().optional();
const optionalDate = z.coerce.date().nullable().optional();
const optionalNumber = z.number().positive("Debe ser mayor a 0").nullable().optional();

export const employeeCreateSchema = z.object({
  firstName: z.string().trim().min(1, "Requerido").max(100),
  lastName: z.string().trim().min(1, "Requerido").max(100),
  email: z.string().trim().toLowerCase().email("Email inválido"),

  dni: optionalString,
  phone: optionalString,
  birthDate: optionalDate,
  address: optionalString,

  positionId: optionalString,
  departmentId: optionalString,
  managerId: optionalString,
  hireDate: optionalDate,
  contractType: z.nativeEnum(ContractType).nullable().optional(),
  salary: optionalNumber,
});

export const employeeUpdateSchema = employeeCreateSchema.partial();

export type EmployeeCreateInput = z.infer<typeof employeeCreateSchema>;
export type EmployeeUpdateInput = z.infer<typeof employeeUpdateSchema>;

// =========================================================================
// Form schema (lo usa react-hook-form en el cliente).
// Todos los campos son strings — los inputs HTML devuelven siempre string.
// Después convertimos a EmployeeCreateInput vía formToCreateInput().
// =========================================================================

export const employeeFormSchema = z.object({
  firstName: z.string().trim().min(1, "Requerido").max(100),
  lastName: z.string().trim().min(1, "Requerido").max(100),
  email: z.string().trim().email("Email inválido"),

  dni: z.string().optional(),
  phone: z.string().optional(),
  birthDate: z.string().optional(),
  address: z.string().optional(),

  positionId: z.string().optional(),
  departmentId: z.string().optional(),
  managerId: z.string().optional(),
  hireDate: z.string().optional(),
  contractType: z.string().optional(),
  salary: z.string().optional().refine(
    (v) => v === undefined || v === "" || (!isNaN(Number(v)) && Number(v) > 0),
    { message: "Debe ser un número mayor a 0" }
  ),
});

export type EmployeeFormInput = z.infer<typeof employeeFormSchema>;

// =========================================================================
// Form → Server conversión
// =========================================================================

const emptyToNull = (v: string | undefined) => (v === "" || v === undefined ? null : v);

export function formToCreateInput(f: EmployeeFormInput): EmployeeCreateInput {
  const toDate = (v: string | undefined) =>
    v === "" || v === undefined ? null : new Date(v);
  const toNumber = (v: string | undefined) =>
    v === "" || v === undefined ? null : Number(v);
  const toContract = (v: string | undefined): ContractType | null => {
    if (!v) return null;
    return v in ContractType ? (v as ContractType) : null;
  };

  return {
    firstName: f.firstName,
    lastName: f.lastName,
    email: f.email,
    dni: emptyToNull(f.dni),
    phone: emptyToNull(f.phone),
    birthDate: toDate(f.birthDate),
    address: emptyToNull(f.address),
    positionId: emptyToNull(f.positionId),
    departmentId: emptyToNull(f.departmentId),
    managerId: emptyToNull(f.managerId),
    hireDate: toDate(f.hireDate),
    contractType: toContract(f.contractType),
    salary: toNumber(f.salary),
  };
}

/** Server → Form: para pre-llenar el form en modo edit. */
export function createInputToForm(e: Partial<EmployeeCreateInput>): Partial<EmployeeFormInput> {
  const dateToStr = (d: Date | null | undefined) =>
    d ? new Date(d).toISOString().slice(0, 10) : "";
  return {
    firstName: e.firstName ?? "",
    lastName: e.lastName ?? "",
    email: e.email ?? "",
    dni: e.dni ?? "",
    phone: e.phone ?? "",
    birthDate: dateToStr(e.birthDate),
    address: e.address ?? "",
    positionId: e.positionId ?? "",
    departmentId: e.departmentId ?? "",
    managerId: e.managerId ?? "",
    hireDate: dateToStr(e.hireDate),
    contractType: e.contractType ?? "",
    salary: e.salary != null ? String(e.salary) : "",
  };
}

export const CONTRACT_TYPE_LABEL: Record<ContractType, string> = {
  FULL_TIME: "Tiempo completo",
  PART_TIME: "Medio tiempo",
  CONTRACTOR: "Contratado",
  INTERN: "Pasantía",
};

// =========================================================================
// Self-service profile — el empleado edita solo su info personal.
// firstName, lastName, phone, birthDate, address. NO email (vive en Clerk),
// NO DNI (lo valida HR), NO datos laborales.
// =========================================================================

export const profileSelfFormSchema = z.object({
  firstName: z.string().trim().min(1, "Requerido").max(100),
  lastName: z.string().trim().min(1, "Requerido").max(100),
  phone: z.string().optional(),
  birthDate: z.string().optional(),
  address: z.string().optional(),
});

export type ProfileSelfFormInput = z.infer<typeof profileSelfFormSchema>;

export const profileSelfUpdateSchema = z.object({
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
  phone: optionalString,
  birthDate: optionalDate,
  address: optionalString,
});

export type ProfileSelfUpdateInput = z.infer<typeof profileSelfUpdateSchema>;

export function profileFormToUpdate(f: ProfileSelfFormInput): ProfileSelfUpdateInput {
  return {
    firstName: f.firstName,
    lastName: f.lastName,
    phone: f.phone === "" || f.phone === undefined ? null : f.phone,
    birthDate:
      f.birthDate === "" || f.birthDate === undefined ? null : new Date(f.birthDate),
    address: f.address === "" || f.address === undefined ? null : f.address,
  };
}
