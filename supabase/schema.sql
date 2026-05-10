-- Run this in the Supabase SQL Editor once per project.

create table if not exists public.keyfocus_entries (
  code text primary key,
  name text not null,
  phone text not null,
  updated_at timestamptz not null default now()
);

alter table public.keyfocus_entries enable row level security;

-- Allow the anon/publishable key (used by the Flask app) to read and write.
-- Tighten these policies if you expose the same key elsewhere.

create policy "keyfocus_select"
  on public.keyfocus_entries
  for select
  using (true);

create policy "keyfocus_insert"
  on public.keyfocus_entries
  for insert
  with check (true);

create policy "keyfocus_update"
  on public.keyfocus_entries
  for update
  using (true)
  with check (true);
