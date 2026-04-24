"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, X } from "lucide-react";
import { TimeOffRequestStatus } from "@prisma/client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { STATUS_LABEL, STATUS_VARIANT } from "@/lib/validations/time-off";
import {
  approveTimeOffRequest,
  cancelTimeOffRequest,
  rejectTimeOffRequest,
} from "../actions";

export type RequestRow = {
  id: string;
  typeName: string;
  startDate: Date;
  endDate: Date;
  totalDays: number;
  status: TimeOffRequestStatus;
  reason: string | null;
  reviewNote: string | null;
  employeeName: string;
};

// =========================================================================
// My requests (empleado ve las suyas, con botón de cancelar)
// =========================================================================

export function MyRequestsTable({ rows }: { rows: RequestRow[] }) {
  if (rows.length === 0) {
    return (
      <p className="rounded-md border bg-card p-6 text-center text-sm text-muted-foreground">
        Todavía no tenés solicitudes. Creá la primera con "Nueva solicitud".
      </p>
    );
  }
  return (
    <div className="rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Tipo</TableHead>
            <TableHead>Desde</TableHead>
            <TableHead>Hasta</TableHead>
            <TableHead>Días</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.id}>
              <TableCell>{r.typeName}</TableCell>
              <TableCell>{formatDate(r.startDate)}</TableCell>
              <TableCell>{formatDate(r.endDate)}</TableCell>
              <TableCell>{r.totalDays}</TableCell>
              <TableCell>
                <Badge variant={STATUS_VARIANT[r.status]}>
                  {STATUS_LABEL[r.status]}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                {r.status === "PENDING" || r.status === "APPROVED" ? (
                  <CancelButton id={r.id} />
                ) : null}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function CancelButton({ id }: { id: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handle = () => {
    if (!confirm("¿Cancelar esta solicitud?")) return;
    startTransition(async () => {
      try {
        await cancelTimeOffRequest(id);
        router.refresh();
      } catch (err) {
        alert(err instanceof Error ? err.message : "Error al cancelar.");
      }
    });
  };

  return (
    <Button variant="ghost" size="sm" onClick={handle} disabled={isPending}>
      {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
      Cancelar
    </Button>
  );
}

// =========================================================================
// Review table (manager/hr/admin aprueba/rechaza)
// =========================================================================

export function ReviewTable({ rows }: { rows: RequestRow[] }) {
  if (rows.length === 0) {
    return (
      <p className="rounded-md border bg-card p-6 text-center text-sm text-muted-foreground">
        No hay solicitudes pendientes de revisión.
      </p>
    );
  }
  return (
    <div className="rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Empleado</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Desde</TableHead>
            <TableHead>Hasta</TableHead>
            <TableHead>Días</TableHead>
            <TableHead>Motivo</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.id}>
              <TableCell className="font-medium">{r.employeeName}</TableCell>
              <TableCell>{r.typeName}</TableCell>
              <TableCell>{formatDate(r.startDate)}</TableCell>
              <TableCell>{formatDate(r.endDate)}</TableCell>
              <TableCell>{r.totalDays}</TableCell>
              <TableCell className="max-w-xs truncate text-muted-foreground">
                {r.reason ?? "—"}
              </TableCell>
              <TableCell className="text-right">
                <ReviewActions id={r.id} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function ReviewActions({ id }: { id: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [rejectOpen, setRejectOpen] = useState(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleApprove = () => {
    startTransition(async () => {
      try {
        await approveTimeOffRequest(id);
        router.refresh();
      } catch (err) {
        alert(err instanceof Error ? err.message : "Error.");
      }
    });
  };

  const handleReject = () => {
    setError(null);
    if (note.trim().length === 0) {
      setError("Explicá el motivo.");
      return;
    }
    startTransition(async () => {
      try {
        await rejectTimeOffRequest(id, note);
        setRejectOpen(false);
        setNote("");
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error.");
      }
    });
  };

  return (
    <div className="flex items-center justify-end gap-1">
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={handleApprove}
        disabled={isPending}
        aria-label="Aprobar"
      >
        {isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Check className="h-4 w-4 text-primary" />
        )}
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => setRejectOpen(true)}
        disabled={isPending}
        aria-label="Rechazar"
      >
        <X className="h-4 w-4 text-destructive" />
      </Button>

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rechazar solicitud</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Label className="mb-1.5">Motivo del rechazo</Label>
            <Textarea
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              disabled={isPending}
            />
            {error ? <p className="text-xs text-destructive">{error}</p> : null}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRejectOpen(false)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button onClick={handleReject} disabled={isPending}>
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Rechazar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function formatDate(d: Date): string {
  return new Date(d).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}
