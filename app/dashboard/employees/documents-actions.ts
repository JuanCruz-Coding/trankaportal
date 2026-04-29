"use server";

import { revalidatePath } from "next/cache";
import { DocumentType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentEmployeeId, getOrgContext, requireRole } from "@/lib/tenant";
import { getOrgFeatures } from "@/lib/features";
import { DOCUMENTS_BUCKET, supabaseAdmin } from "@/lib/supabase";
import { createNotifications } from "@/lib/notifications";

const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED_MIME = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/jpg",
];

function validateFile(file: File) {
  if (file.size === 0) throw new Error("Archivo vacío.");
  if (file.size > MAX_SIZE_BYTES) throw new Error("El archivo supera los 10 MB.");
  if (!ALLOWED_MIME.includes(file.type)) {
    throw new Error("Tipo de archivo no permitido. Usá PDF, PNG o JPG.");
  }
}

function safeFilename(name: string): string {
  // Reemplazar cualquier char raro por "_" para que el path sea seguro.
  return name.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 80);
}

export async function uploadEmployeeDocument(formData: FormData) {
  const ctx = await getOrgContext();
  requireRole(ctx, ["admin", "hr"]);

  const features = await getOrgFeatures(ctx.organizationId);
  if (!features.has("employees.documents")) {
    throw new Error("La gestión de documentos no está disponible en tu plan.");
  }

  const employeeId = formData.get("employeeId");
  const file = formData.get("file");
  const name = formData.get("name");
  const type = formData.get("type");

  if (typeof employeeId !== "string") throw new Error("employeeId faltante.");
  if (!(file instanceof File)) throw new Error("Archivo faltante.");
  if (typeof name !== "string" || name.trim().length === 0) {
    throw new Error("Poné un nombre para el documento.");
  }
  if (typeof type !== "string" || !(type in DocumentType)) {
    throw new Error("Tipo de documento inválido.");
  }

  validateFile(file);

  // Verificar que el empleado pertenece a esta org (tenant-safety).
  const emp = await prisma.employee.findFirst({
    where: { id: employeeId, organizationId: ctx.organizationId },
    select: { id: true },
  });
  if (!emp) throw new Error("Empleado no encontrado.");

  // Path en Storage: {orgId}/{employeeId}/{uuid}-{filename}
  const uniquePrefix = crypto.randomUUID();
  const storagePath = `${ctx.organizationId}/${employeeId}/${uniquePrefix}-${safeFilename(file.name)}`;

  const sb = supabaseAdmin();
  const { error: uploadError } = await sb.storage
    .from(DOCUMENTS_BUCKET)
    .upload(storagePath, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type,
    });
  if (uploadError) {
    throw new Error(`Error al subir: ${uploadError.message}`);
  }

  // Persistimos la fila después del upload. Si falla, limpiamos el blob.
  let docId: string;
  try {
    const created = await prisma.document.create({
      data: {
        organizationId: ctx.organizationId,
        employeeId,
        name: name.trim(),
        type: type as DocumentType,
        storagePath,
        mimeType: file.type,
        sizeBytes: file.size,
        uploadedByClerkUserId: ctx.clerkUserId,
      },
      select: { id: true },
    });
    docId = created.id;
  } catch (err) {
    await sb.storage.from(DOCUMENTS_BUCKET).remove([storagePath]);
    throw err;
  }

  // Notificar al empleado dueño del doc — pero solo si no es uno mismo
  // (HR subiendo a su propia ficha no necesita notificarse a sí mismo).
  const myEmpId = await prisma.employee.findUnique({
    where: { clerkUserId: ctx.clerkUserId },
    select: { id: true },
  });
  if (myEmpId?.id !== employeeId) {
    await createNotifications({
      organizationId: ctx.organizationId,
      recipientEmployeeIds: [employeeId],
      type: "DOCUMENT_UPLOADED",
      title: "Nuevo documento subido a tu ficha",
      body: `${name.trim()} (${type})`,
      link: "/dashboard/profile",
      relatedDocumentId: docId,
    });
  }

  revalidatePath(`/dashboard/employees/${employeeId}`);
}

export async function deleteEmployeeDocument(docId: string) {
  const ctx = await getOrgContext();
  requireRole(ctx, ["admin", "hr"]);

  const features = await getOrgFeatures(ctx.organizationId);
  if (!features.has("employees.documents")) {
    throw new Error("La gestión de documentos no está disponible en tu plan.");
  }

  const doc = await prisma.document.findFirst({
    where: { id: docId, organizationId: ctx.organizationId },
    select: { id: true, storagePath: true, employeeId: true },
  });
  if (!doc) throw new Error("Documento no encontrado.");

  const sb = supabaseAdmin();
  await sb.storage.from(DOCUMENTS_BUCKET).remove([doc.storagePath]);
  await prisma.document.delete({ where: { id: docId } });

  revalidatePath(`/dashboard/employees/${doc.employeeId}`);
}

/**
 * Genera una signed URL temporal para descargar el documento.
 * Dura 60 segundos — suficiente para que el browser inicie la descarga.
 * Cualquier usuario de la misma org puede descargar — pero el plan tiene
 * que habilitar la feature: `employees.documents` para docs de otros,
 * `self-service.documents` (o `employees.documents`) para los propios.
 */
export async function getEmployeeDocumentUrl(docId: string): Promise<string> {
  const ctx = await getOrgContext();

  const doc = await prisma.document.findFirst({
    where: { id: docId, organizationId: ctx.organizationId },
    select: { storagePath: true, employeeId: true },
  });
  if (!doc) throw new Error("Documento no encontrado.");

  const features = await getOrgFeatures(ctx.organizationId);
  const myEmpId = await getCurrentEmployeeId();
  const isOwnDoc = myEmpId !== null && myEmpId === doc.employeeId;
  const allowed = isOwnDoc
    ? features.has("self-service.documents") || features.has("employees.documents")
    : features.has("employees.documents");
  if (!allowed) {
    throw new Error("La gestión de documentos no está disponible en tu plan.");
  }

  const sb = supabaseAdmin();
  const { data, error } = await sb.storage
    .from(DOCUMENTS_BUCKET)
    .createSignedUrl(doc.storagePath, 60);

  if (error || !data?.signedUrl) {
    throw new Error(`Error al generar URL: ${error?.message ?? "desconocido"}`);
  }
  return data.signedUrl;
}
