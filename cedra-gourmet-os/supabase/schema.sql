-- Cedra Gourmet OS · esquema para Supabase.
-- Un documento JSONB por usuario: mismo formato que el respaldo JSON de la app,
-- así importar/exportar y sincronizar son la misma operación.

create table if not exists public.cedra_workspaces (
  owner_id   uuid primary key references auth.users (id) on delete cascade,
  data       jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.cedra_workspaces enable row level security;

create policy "cada usuario lee su espacio" on public.cedra_workspaces
  for select using (auth.uid() = owner_id);

create policy "cada usuario escribe su espacio" on public.cedra_workspaces
  for insert with check (auth.uid() = owner_id);

create policy "cada usuario actualiza su espacio" on public.cedra_workspaces
  for update using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
