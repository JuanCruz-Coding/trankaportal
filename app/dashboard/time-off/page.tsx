import { FeatureGate } from "@/components/feature-gate";

export default function TimeOffPage() {
  return (
    <FeatureGate feature="time-off">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Ausencias</h1>
        <p className="text-sm text-muted-foreground">
          Este módulo se habilita en Fase 5.
        </p>
      </div>
    </FeatureGate>
  );
}
