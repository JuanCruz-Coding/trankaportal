import { z } from "zod";
import { ContractType } from "@prisma/client";

// Util: convierte "" a null para campos opcionales (los forms HTML devuelven "" cuando están vacíos).
const emptyToNull = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess((v) => (v === "" || v === undefined ? null : v), schema.nullable().optional());

// El salary llega como string desde el form (<input type="number"> igual serializa a string en FormData).
const salarySchema = z.preprocess(
  (v) => (v === "" || v === null || v === undefined ? null : Number(v)),
  z.number().positive("Debe ser mayor a 0").nullable().optional()
);

// Fechas: aceptamos ISO strings o Date, coercemos.
const dateSchema = z.preprocess(
  (v) => (v === "" || v === null || v === undefined ? null : v),
  z.coerce.date().nullable().optional()
);

export const employeeBaseSchema = z.object({
  // Personales (obligatorios)
  firstName: z.string().trim().min(1, "Requerido").max(100),
  lastName: z.string().trim().min(1, "Requerido").max(100),
  email: z.string().trim().toLowerCase().email("Email inválido"),

  // Personales (opcionales)
  dni: emptyToNull(z.string().trim().min(6).max(20)),
  phone: emptyToNull(z.string().trim().min(6).max(30)),
  birthDate: dateSchema,
  address: emptyToNull(z.string().trim().min(3).max(200)),

  // Laborales (opcionales)
  positionId: emptyToNull(z.string().cuid()),
  departmentId: emptyToNull(z.string().cuid()),
  managerId: emptyToNull(z.string().cuid()),
  hireDate: dateSchema,
  contractType: emptyToNull(z.nativeEnum(ContractType)),
  salary: salarySchema,
});

export const employeeCreateSchema = employeeBaseSchema;

// Update: todos los campos opcionales (podés editar solo uno).
export const employeeUpdateSchema = employeeBaseSchema.partial();

export type EmployeeCreateInput = z.infer<typeof employeeCreateSchema>;
export type EmployeeUpdateInput = z.infer<typeof employeeUpdateSchema>;

export const CONTRACT_TYPE_LABEL: Record<ContractType, string> = {
  FULL_TIME: "Tiempo completo",
  PART_TIME: "Medio tiempo",
  CONTRACTOR: "Contratado",
  INTERN: "Pasantía",
};
