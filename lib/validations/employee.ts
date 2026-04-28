import { z } from "zod";
import { ContractType } from "@prisma/client";

// =========================================================================
// Validación de fecha de nacimiento — edad mínima legal para trabajar
// en Argentina. Frenamos casos absurdos (ej. fecha = hoy o futuro, o un
// "empleado" de 5 años) tanto en form como en server action.
// =========================================================================

export const MIN_EMPLOYEE_AGE_YEARS = 16;
const BIRTH_DATE_TOO_RECENT = `El empleado debe tener al menos ${MIN_EMPLOYEE_AGE_YEARS} años.`;

/** YYYY-MM-DD máximo aceptable como fecha de nacimiento (= hoy − 16 años). */
export function getMaxBirthDateString(): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() - MIN_EMPLOYEE_AGE_YEARS);
  return d.toISOString().slice(0, 10);
}

const isBirthDateOk = (d: Date | null | undefined): boolean => {
  if (!d) return true;
  return d.toISOString().slice(0, 10) <= getMaxBirthDateString();
};
const isBirthDateStringOk = (v: string | undefined): boolean => {
  if (!v || v === "") return true;
  return v <= getMaxBirthDateString();
};

// =========================================================================
// Server-side schema (lo usa la server action).
// Acá sí coercemos tipos porque los datos llegan desde el cliente ya parseados.
// =========================================================================

const optionalString = z.string().trim().nullable().optional();
const optionalDate = z.coerce.date().nullable().optional();
const optionalNumber = z.number().positive("Debe ser mayor a 0").nullable().optional();
const optionalBirthDate = z.coerce
  .date()
  .nullable()
  .optional()
  .refine(isBirthDateOk, { message: BIRTH_DATE_TOO_RECENT });
const optionalBirthDateString = z
  .string()
  .optional()
  .refine(isBirthDateStringOk, { message: BIRTH_DATE_TOO_RECENT });

export const employeeCreateSchema = z.object({
  firstName: z.string().trim().min(1, "Requerido").max(100),
  lastName: z.string().trim().min(1, "Requerido").max(100),
  email: z.string().trim().toLowerCase().email("Email inválido"),

  dni: optionalString,
  phone: optionalString,
  birthDate: optionalBirthDate,
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
  birthDate: optionalBirthDateString,
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
  birthDate: optionalBirthDateString,
  address: z.string().optional(),
});

export type ProfileSelfFormInput = z.infer<typeof profileSelfFormSchema>;

export const profileSelfUpdateSchema = z.object({
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
  phone: optionalString,
  birthDate: optionalBirthDate,
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
