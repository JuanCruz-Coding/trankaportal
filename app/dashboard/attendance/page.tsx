import { FeatureGate } from "@/components/feature-gate";

export default function AttendancePage() {
  return (
    <FeatureGate feature="attendance">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Asistencia</h1>
        <p className="text-sm text-muted-foreground">
          Este módulo se habilita en Fase 6.
        </p>
      </div>
    </FeatureGate>
  );
}
