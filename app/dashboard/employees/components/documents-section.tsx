"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Download, Loader2, Trash2, Upload } from "lucide-react";
import { DocumentType } from "@prisma/client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import {
  uploadEmployeeDocument,
  deleteEmployeeDocument,
  getEmployeeDocumentUrl,
} from "../documents-actions";

export type DocumentItem = {
  id: string;
  name: string;
  type: DocumentType;
  mimeType: string | null;
  sizeBytes: number | null;
  uploadedAt: Date;
};

const DOC_TYPE_LABEL: Record<DocumentType, string> = {
  CONTRACT: "Contrato",
  DNI: "DNI",
  PAYSLIP: "Recibo de sueldo",
  OTHER: "Otro",
};

export function DocumentsSection({
  employeeId,
  documents,
  canManage,
}: {
  employeeId: string;
  documents: DocumentItem[];
  canManage: boolean;
}) {
  return (
    <div className="rounded-lg border bg-card p-5 text-card-foreground shadow-sm md:col-span-2">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-base font-semibold">
          Documentos{" "}
          <span className="text-muted-foreground">({documents.length})</span>
        </h3>
        {canManage ? <UploadButton employeeId={employeeId} /> : null}
      </div>

      {documents.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Todavía no hay documentos subidos.
        </p>
      ) : (
        <ul className="divide-y">
          {documents.map((d) => (
            <DocumentRow
              key={d.id}
              doc={d}
              canManage={canManage}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function DocumentRow({
  doc,
  canManage,
}: {
  doc: DocumentItem;
  canManage: boolean;
}) {
  const router = useRouter();
  const [isDownloading, startDownload] = useTransition();
  const [isDeleting, startDelete] = useTransition();

  const handleDownload = () => {
    startDownload(async () => {
      try {
        const url = await getEmployeeDocumentUrl(doc.id);
        window.open(url, "_blank");
      } catch (err) {
        alert(err instanceof Error ? err.message : "Error al descargar.");
      }
    });
  };

  const handleDelete = () => {
    if (!confirm(`¿Borrar "${doc.name}"? Esto lo elimina definitivamente.`)) return;
    startDelete(async () => {
      try {
        await deleteEmployeeDocument(doc.id);
        router.refresh();
      } catch (err) {
        alert(err instanceof Error ? err.message : "Error al borrar.");
      }
    });
  };

  return (
    <li className="flex items-center justify-between gap-4 py-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-medium">{doc.name}</span>
          <Badge variant="secondary">{DOC_TYPE_LABEL[doc.type]}</Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          {formatSize(doc.sizeBytes)} · Subido{" "}
          {new Date(doc.uploadedAt).toLocaleDateString("es-AR")}
        </p>
      </div>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={handleDownload}
          disabled={isDownloading}
          aria-label="Descargar"
        >
          {isDownloading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
        </Button>
        {canManage ? (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={handleDelete}
            disabled={isDeleting}
            aria-label="Borrar"
          >
            {isDeleting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4 text-destructive" />
            )}
          </Button>
        ) : null}
      </div>
    </li>
  );
}

function UploadButton({ employeeId }: { employeeId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [type, setType] = useState<DocumentType>("CONTRACT");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setFile(null);
    setName("");
    setType("CONTRACT");
    setError(null);
  };

  const handleSubmit = () => {
    if (!file) {
      setError("Seleccioná un archivo.");
      return;
    }
    if (name.trim().length === 0) {
      setError("El nombre no puede estar vacío.");
      return;
    }
    setError(null);

    const fd = new FormData();
    fd.append("employeeId", employeeId);
    fd.append("file", file);
    fd.append("name", name.trim());
    fd.append("type", type);

    startTransition(async () => {
      try {
        await uploadEmployeeDocument(fd);
        setOpen(false);
        reset();
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al subir.");
      }
    });
  };

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <Upload className="h-4 w-4" />
        Subir documento
      </Button>

      <Dialog
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) reset();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Subir documento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="mb-1.5">Archivo</Label>
              <Input
                type="file"
                accept="application/pdf,image/png,image/jpeg"
                onChange={(e) => {
                  const f = e.target.files?.[0] ?? null;
                  setFile(f);
                  if (f && !name) setName(f.name.replace(/\.[^.]+$/, ""));
                }}
                disabled={isPending}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                PDF, PNG o JPG. Máximo 10 MB.
              </p>
            </div>
            <div>
              <Label className="mb-1.5">Nombre</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Contrato de trabajo"
                disabled={isPending}
              />
            </div>
            <div>
              <Label className="mb-1.5">Tipo</Label>
              <Select
                value={type}
                onValueChange={(v) => setType(v as DocumentType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(DOC_TYPE_LABEL).map(([k, label]) => (
                    <SelectItem key={k} value={k}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {error ? (
              <p className="text-xs text-destructive">{error}</p>
            ) : null}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={isPending}>
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Subir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function formatSize(bytes: number | null): string {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
