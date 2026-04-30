-- ============================================================
-- La Trama — Setup inicial de Supabase
-- Correr en: Supabase Console → SQL Editor → New query
-- ============================================================

-- 1. Tabla principal
create extension if not exists pgcrypto;

create table public.profesionales (
    id uuid primary key default gen_random_uuid(),
    nombre text not null,
    especialidad text not null,
    rating numeric(2,1) default 0 check (rating >= 0 and rating <= 5),
    bio text default '',
    modalidad text default '',
    experiencia text default '',
    whatsapp text default '',
    email text default '',
    activo boolean default true,
    destacado boolean default false,
    img text default '',
    img_path text default '',
    instagram text default '',
    facebook text default '',
    tiktok text default '',
    youtube text default '',
    linkedin text default '',
    sitio_web text default '',
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

create index profesionales_activo_idx on public.profesionales (activo);
create index profesionales_nombre_idx on public.profesionales (nombre);

-- 2. Trigger para updated_at automático
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
    new.updated_at = now();
    return new;
end $$;

create trigger profesionales_set_updated_at
before update on public.profesionales
for each row execute function public.set_updated_at();

-- 3. Row Level Security
alter table public.profesionales enable row level security;

-- Visitantes públicos: solo pueden ver profesionales activos
create policy "public_read_active" on public.profesionales
    for select using (activo = true);

-- Admin autenticado: puede ver todos (incluyendo inactivos)
create policy "auth_select_all" on public.profesionales
    for select to authenticated using (true);

-- Admin autenticado: puede crear, editar y borrar
create policy "auth_insert" on public.profesionales
    for insert to authenticated with check (true);

create policy "auth_update" on public.profesionales
    for update to authenticated using (true) with check (true);

create policy "auth_delete" on public.profesionales
    for delete to authenticated using (true);

-- ============================================================
-- 4. Storage: políticas del bucket "profesionales-imagenes"
--    (crear el bucket manualmente en Storage → New bucket
--     con nombre "profesionales-imagenes" y Public: ON)
-- ============================================================

create policy "public_read_imagenes" on storage.objects
    for select using (bucket_id = 'profesionales-imagenes');

create policy "auth_upload_imagenes" on storage.objects
    for insert to authenticated with check (bucket_id = 'profesionales-imagenes');

create policy "auth_update_imagenes" on storage.objects
    for update to authenticated using (bucket_id = 'profesionales-imagenes');

create policy "auth_delete_imagenes" on storage.objects
    for delete to authenticated using (bucket_id = 'profesionales-imagenes');

-- ============================================================
-- 5. Realtime: habilitar cambios en tiempo real para el panel
--    (también se puede hacer en Database → Replication → supabase_realtime)
-- ============================================================
alter publication supabase_realtime add table public.profesionales;

-- ============================================================
-- Migración: redes sociales (correr si la tabla ya existe)
-- ============================================================
alter table public.profesionales add column if not exists instagram  text default '';
alter table public.profesionales add column if not exists facebook   text default '';
alter table public.profesionales add column if not exists tiktok     text default '';
alter table public.profesionales add column if not exists youtube    text default '';
alter table public.profesionales add column if not exists linkedin   text default '';
alter table public.profesionales add column if not exists sitio_web  text default '';

-- ============================================================
-- 6. Tabla credenciales (diplomas, certificados, documentos)
-- ============================================================

create table public.credenciales (
    id uuid primary key default gen_random_uuid(),
    profesional_id uuid not null references public.profesionales(id) on delete cascade,
    nombre text not null,
    tipo text not null default 'Documento',
    url text not null,
    path text not null,
    created_at timestamptz default now()
);

create index credenciales_profesional_idx on public.credenciales (profesional_id);

alter table public.credenciales enable row level security;

-- Público: solo puede ver credenciales de profesionales activos
create policy "public_read_credenciales" on public.credenciales
    for select using (
        exists (
            select 1 from public.profesionales p
            where p.id = profesional_id and p.activo = true
        )
    );

-- Admin autenticado: CRUD completo
create policy "auth_all_credenciales" on public.credenciales
    for all to authenticated using (true) with check (true);

-- ============================================================
-- 7. Storage bucket "profesionales-credenciales"
--    (crear manualmente en Storage → New bucket
--     con nombre "profesionales-credenciales" y Public: ON)
-- ============================================================

create policy "public_read_credenciales_files" on storage.objects
    for select using (bucket_id = 'profesionales-credenciales');

create policy "auth_upload_credenciales" on storage.objects
    for insert to authenticated with check (bucket_id = 'profesionales-credenciales');

create policy "auth_update_credenciales" on storage.objects
    for update to authenticated using (bucket_id = 'profesionales-credenciales');

create policy "auth_delete_credenciales" on storage.objects
    for delete to authenticated using (bucket_id = 'profesionales-credenciales');
