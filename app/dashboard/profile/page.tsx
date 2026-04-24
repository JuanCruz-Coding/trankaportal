import { FeatureGate } from "@/components/feature-gate";

export default function ProfilePage() {
  return (
    <FeatureGate feature="self-service">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Mi perfil</h1>
        <p className="text-sm text-muted-foreground">
          Este módulo se habilita en Fase 4.
        </p>
      </div>
    </FeatureGate>
  );
}
