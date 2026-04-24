import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Cliente de Supabase con service role key (admin).
 * SOLO usar server-side — nunca exponer al cliente.
 *
 * Lo usamos para subir/borrar/firmar URLs en Storage con total autoridad,
 * saltando cualquier RLS que pudiera tener configurada Supabase.
 */
let _admin: SupabaseClient | null = null;

export function supabaseAdmin(): SupabaseClient {
  if (_admin) return _admin;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) throw new Error("NEXT_PUBLIC_SUPABASE_URL no definida");
  if (!serviceRoleKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY no definida");

  _admin = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return _admin;
}

export const DOCUMENTS_BUCKET = "employee-documents";
