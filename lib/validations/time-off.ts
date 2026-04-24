import { z } from "zod";
import { TimeOffRequestStatus } from "@prisma/client";

// =========================================================================
// Form schema (lo que manda el form del cliente). Todas strings.
// =========================================================================

export const timeOffRequestFormSchema = z
  .object({
    typeId: z.string().cuid("Elegí un tipo válido"),
    startDate: z.string().min(1, "Elegí fecha de inicio"),
    endDate: z.string().min(1, "Elegí fecha de fin"),
    reason: z.string().max(500).optional(),
  })
  .refine(
    (v) => {
      const s = new Date(v.startDate);
      const e = new Date(v.endDate);
      return !isNaN(s.getTime()) && !isNaN(e.getTime()) && e >= s;
    },
    { message: "La fecha de fin debe ser igual o posterior a la de inicio", path: ["endDate"] }
  );

export type TimeOffRequestFormInput = z.infer<typeof timeOffRequestFormSchema>;

// =========================================================================
// Server schema (lo que consume la server action después de coerción).
// =========================================================================

export const timeOffRequestCreateSchema = z.object({
  typeId: z.string().cuid(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  reason: z.string().max(500).nullable().optional(),
});

export type TimeOffRequestCreateInput = z.infer<typeof timeOffRequestCreateSchema>;

export function formToCreate(f: TimeOffRequestFormInput): TimeOffRequestCreateInput {
  return {
    typeId: f.typeId,
    startDate: new Date(f.startDate),
    endDate: new Date(f.endDate),
    reason: f.reason && f.reason.trim().length > 0 ? f.reason.trim() : null,
  };
}

// =========================================================================
// Helpers de negocio
// =========================================================================

/**
 * Cuenta días hábiles (Lun-Vie) entre start y end INCLUSIVE, inclusive.
 * No considera feriados — HR puede ajustar manualmente al aprobar si cae feriado.
 */
export function countBusinessDays(start: Date, end: Date): number {
  if (end < start) return 0;
  let count = 0;
  const cur = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  while (cur <= endDay) {
    const dow = cur.getDay(); // 0 = domingo, 6 = sábado
    if (dow !== 0 && dow !== 6) count++;
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}

// =========================================================================
// Labels para UI
// =========================================================================

export const STATUS_LABEL: Record<TimeOffRequestStatus, string> = {
  PENDING: "Pendiente",
  APPROVED: "Aprobada",
  REJECTED: "Rechazada",
  CANCELLED: "Cancelada",
};

export const STATUS_VARIANT: Record<
  TimeOffRequestStatus,
  "default" | "secondary" | "outline" | "destructive"
> = {
  PENDING: "outline",
  APPROVED: "default",
  REJECTED: "destructive",
  CANCELLED: "secondary",
};
