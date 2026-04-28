"use client";

import { useState, useTransition } from "react";
import { Pencil, Trash2, Check, X, Plus, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  createDepartment,
  createPosition,
  deleteDepartment,
  deletePosition,
  updateDepartment,
  updatePosition,
} from "@/app/dashboard/employees/actions";

type Item = { id: string; label: string; count: number };

type Props = {
  departments: Item[];
  positions: Item[];
};

export function OrgStructureSection({ departments, positions }: Props) {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <ManagerCard
        title="Departamentos"
        emptyText="No hay departamentos cargados."
        addPlaceholder="Nuevo departamento"
        items={departments}
        onCreate={async (name) => {
          await createDepartment(name);
        }}
        onRename={updateDepartment}
        onDelete={deleteDepartment}
      />
      <ManagerCard
        title="Puestos"
        emptyText="No hay puestos cargados."
        addPlaceholder="Nuevo puesto"
        items={positions}
        onCreate={async (title) => {
          await createPosition(title);
        }}
        onRename={updatePosition}
        onDelete={deletePosition}
      />
    </div>
  );
}

function ManagerCard({
  title,
  emptyText,
  addPlaceholder,
  items,
  onCreate,
  onRename,
  onDelete,
}: {
  title: string;
  emptyText: string;
  addPlaceholder: string;
  items: Item[];
  onCreate: (label: string) => Promise<void>;
  onRename: (id: string, label: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [newValue, setNewValue] = useState("");
  const [creating, startCreate] = useTransition();
  const [createError, setCreateError] = useState<string | null>(null);

  const handleCreate = () => {
    if (newValue.trim().length === 0) return;
    setCreateError(null);
    startCreate(async () => {
      try {
        await onCreate(newValue.trim());
        setNewValue("");
      } catch (err) {
        setCreateError(err instanceof Error ? err.message : "Error al crear.");
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">{emptyText}</p>
        ) : (
          <ul className="divide-y divide-border/60">
            {items.map((item) => (
              <ItemRow
                key={item.id}
                item={item}
                onRename={onRename}
                onDelete={onDelete}
              />
            ))}
          </ul>
        )}

        <div className="flex items-center gap-1.5 border-t border-border/60 pt-4">
          <Input
            value={newValue}
            onChange={(e) => {
              setNewValue(e.target.value);
              setCreateError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleCreate();
              }
            }}
            placeholder={addPlaceholder}
            disabled={creating}
          />
          <Button
            type="button"
            size="icon-lg"
            variant="outline"
            onClick={handleCreate}
            disabled={creating || newValue.trim().length === 0}
            aria-label={`Agregar ${title.toLowerCase()}`}
          >
            {creating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
          </Button>
        </div>
        {createError ? (
          <p className="text-xs text-destructive">{createError}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}

function ItemRow({
  item,
  onRename,
  onDelete,
}: {
  item: Item;
  onRename: (id: string, label: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(item.label);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const startEdit = () => {
    setValue(item.label);
    setError(null);
    setEditing(true);
  };

  const cancel = () => {
    setEditing(false);
    setError(null);
  };

  const save = () => {
    const cleaned = value.trim();
    if (cleaned.length === 0 || cleaned === item.label) {
      cancel();
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        await onRename(item.id, cleaned);
        setEditing(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al guardar.");
      }
    });
  };

  const confirmDelete = () => {
    setError(null);
    startTransition(async () => {
      try {
        await onDelete(item.id);
        setConfirmOpen(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al eliminar.");
      }
    });
  };

  return (
    <li className="py-2.5 first:pt-0">
      <div className="flex items-center gap-2">
        {editing ? (
          <Input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                save();
              } else if (e.key === "Escape") {
                e.preventDefault();
                cancel();
              }
            }}
            autoFocus
            disabled={pending}
            className="flex-1"
          />
        ) : (
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{item.label}</p>
            <p className="text-xs text-muted-foreground">
              {item.count === 0
                ? "Sin empleados"
                : `${item.count} empleado${item.count === 1 ? "" : "s"}`}
            </p>
          </div>
        )}

        <div className="flex shrink-0 items-center gap-1">
          {editing ? (
            <>
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                onClick={save}
                disabled={pending}
                aria-label="Guardar"
              >
                {pending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Check className="h-3.5 w-3.5" />
                )}
              </Button>
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                onClick={cancel}
                disabled={pending}
                aria-label="Cancelar"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </>
          ) : (
            <>
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                onClick={startEdit}
                aria-label="Renombrar"
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                onClick={() => setConfirmOpen(true)}
                aria-label="Eliminar"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </>
          )}
        </div>
      </div>

      {error ? <p className="mt-1 text-xs text-destructive">{error}</p> : null}

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Eliminar &ldquo;{item.label}&rdquo;?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {item.count === 0
              ? "No hay empleados asignados. La acción no se puede deshacer."
              : `Hay ${item.count} empleado(s) asignado(s). Si los hay, la acción se va a bloquear hasta que los reasignes.`}
          </p>
          {error ? (
            <p className="text-xs text-destructive">{error}</p>
          ) : null}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirmOpen(false)}
              disabled={pending}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={confirmDelete}
              disabled={pending}
            >
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </li>
  );
}
