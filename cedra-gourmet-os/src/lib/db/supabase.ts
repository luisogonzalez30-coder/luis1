import type { AppData } from "../domain/types";
import { parseAppData, type Repository } from "./repository";

/**
 * Adaptador Supabase (PostgREST directo, sin SDK). NO está conectado a la interfaz todavía:
 * falta el inicio de sesión que entrega `accessToken`. El esquema está en supabase/schema.sql.
 * Guarda el espacio de trabajo completo como un documento JSONB por usuario.
 */
export class SupabaseRepository implements Repository {
  constructor(
    private readonly url: string,
    private readonly anonKey: string,
    private readonly accessToken: string,
    private readonly userId: string,
  ) {}

  private headers(): HeadersInit {
    return { apikey: this.anonKey, Authorization: `Bearer ${this.accessToken}`, "Content-Type": "application/json" };
  }

  async load(): Promise<AppData | null> {
    const res = await fetch(`${this.url}/rest/v1/cedra_workspaces?owner_id=eq.${this.userId}&select=data`, {
      headers: this.headers(),
    });
    if (!res.ok) throw new Error(`Supabase respondió ${res.status} al leer.`);
    const rows = (await res.json()) as { data: unknown }[];
    return rows[0] ? parseAppData(rows[0].data) : null;
  }

  async save(data: AppData): Promise<void> {
    const res = await fetch(`${this.url}/rest/v1/cedra_workspaces?on_conflict=owner_id`, {
      method: "POST",
      headers: { ...this.headers(), Prefer: "resolution=merge-duplicates" },
      body: JSON.stringify({ owner_id: this.userId, data, updated_at: new Date().toISOString() }),
    });
    if (!res.ok) throw new Error(`Supabase respondió ${res.status} al guardar.`);
  }
}

export function supabaseConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}
