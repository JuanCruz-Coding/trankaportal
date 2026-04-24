import { FeatureGate } from "@/components/feature-gate";

export default function EmployeesPage() {
  return (
    <FeatureGate feature="employees">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Empleados</h1>
        <p className="text-sm text-muted-foreground">
          Este módulo se habilita en Fase 3.
        </p>
      </div>
    </FeatureGate>
  );
}
