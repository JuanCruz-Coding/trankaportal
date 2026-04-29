import Link from "next/link";
import { Lock } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { getOrgContext } from "@/lib/tenant";
import { hasFeature, type FeatureKey } from "@/lib/features";

const FEATURE_LABEL: Record<FeatureKey, string> = {
  // Empleados
  employees: "Gestión de empleados",
  "employees.documents": "Documentos por empleado",
  "employees.compensation": "Compensación y contrato",
  "employees.org-chart": "Organigrama",
  "employees.org-chart-visual": "Organigrama visual",
  "employees.csv-export": "Export / import masivo",
  "employees.custom-fields": "Campos personalizados",
  "employees.audit-log": "Historial de cambios",
  // Portal del empleado
  "self-service": "Portal del empleado",
  "self-service.documents": "Documentos propios",
  "self-service.time-off": "Solicitar ausencias",
  "self-service.attendance-view": "Ver asistencia propia",
  "self-service.payroll-signature": "Firma digital de recibos",
  // Time-off
  "time-off": "Ausencias y vacaciones",
  "time-off.calendar": "Calendario de equipo",
  "time-off.multi-approval": "Aprobación multi-nivel",
  "time-off.carry-over": "Carry-over de días",
  "time-off.holidays": "Feriados configurables",
  // Attendance
  attendance: "Control de asistencia",
  "attendance.team-view": "Vista de equipo",
  "attendance.shifts": "Turnos y horarios",
  "attendance.geo": "Geolocalización",
  "attendance.ip-whitelist": "Restricción por IP",
  "attendance.overtime-approval": "Aprobación de horas extras",
  "attendance.export": "Export Excel",
  // Comunicación
  "email-notifications": "Notificaciones por email",
  announcements: "Anuncios internos",
  // Recibos
  payroll: "Recibos de sueldo",
  // Reportes
  "reports.basic": "Reportes básicos",
  "reports.advanced": "Analytics avanzado",
  // Procesos
  onboarding: "Onboarding / Offboarding",
  "performance-reviews": "Evaluaciones de desempeño",
  // Integraciones
  integrations: "Integraciones",
};

/**
 * Bloquea el render de `children` si la organización no tiene la feature en su plan.
 * Se usa en páginas de módulos que dependen de un plan.
 *
 *   <FeatureGate feature="time-off">
 *     <TimeOffModule />
 *   </FeatureGate>
 */
export async function FeatureGate({
  feature,
  children,
  fallback,
}: {
  feature: FeatureKey;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const ctx = await getOrgContext();
  const allowed = await hasFeature(ctx.organizationId, feature);

  if (allowed) return <>{children}</>;
  return <>{fallback ?? <UpgradeCta feature={feature} />}</>;
}

function UpgradeCta({ feature }: { feature: FeatureKey }) {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center gap-4 rounded-lg border bg-card p-10 text-center text-card-foreground shadow-sm">
      <div className="rounded-full bg-muted p-3">
        <Lock className="h-6 w-6 text-muted-foreground" />
      </div>
      <div>
        <h2 className="text-lg font-semibold">
          {FEATURE_LABEL[feature]} no está disponible en tu plan
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Mejorá tu plan para habilitar este módulo.
        </p>
      </div>
      <Link href="/dashboard/settings" className={buttonVariants({ size: "sm" })}>
        Ver planes
      </Link>
    </div>
  );
}
