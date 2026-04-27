"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { EmployeeRole } from "@prisma/client";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { setEmployeeRole } from "../actions";

const ROLE_LABEL: Record<EmployeeRole, string> = {
  EMPLOYEE: "Empleado",
  MANAGER: "Manager",
  HR: "Recursos Humanos",
  ADMIN: "Administrador",
};

const ROLE_DESCRIPTION: Record<EmployeeRole, string> = {
  EMPLOYEE: "Ve solo su propia ficha y módulos de self-service.",
  MANAGER: "Ve y aprueba a sus subordinados directos.",
  HR: "Acceso completo a empleados, ausencias, asistencia.",
  ADMIN: "Todo lo anterior + configuración + cambio de roles.",
};

export function EmployeeRoleChanger({
  employeeId,
  currentRole,
}: {
  employeeId: string;
  currentRole: EmployeeRole;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [selected, setSelected] = useState<EmployeeRole>(currentRole);
  const [error, setError] = useState<string | null>(null);

  const dirty = selected !== currentRole;

  const handleSave = () => {
    setError(null);
    startTransition(async () => {
      try {
        await setEmployeeRole(employeeId, selected);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al cambiar rol.");
        setSelected(currentRole);
      }
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-2">
        <div className="flex-1 min-w-[200px]">
          <Select
            value={selected}
            onValueChange={(v) => setSelected(v as EmployeeRole)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(ROLE_LABEL) as EmployeeRole[]).map((r) => (
                <SelectItem key={r} value={r}>
                  {ROLE_LABEL[r]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          type="button"
          size="sm"
          onClick={handleSave}
          disabled={!dirty || pending}
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Guardar
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        {ROLE_DESCRIPTION[selected]}
      </p>
      {error ? (
        <p className="text-xs text-destructive">{error}</p>
      ) : null}
    </div>
  );
}
