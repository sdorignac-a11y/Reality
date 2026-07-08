-- =========================================================
-- Ébano — schema de Supabase
-- Correr esto completo en: Supabase → SQL Editor → New query
-- =========================================================

-- Tabla de productos
create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  price text not null,
  alto numeric not null,
  ancho numeric not null,
  fondo numeric not null,
  model_url text,
  is_real_model boolean not null default true,
  status text not null default 'review' check (status in ('review','published','rejected')),
  created_at timestamptz not null default now()
);

alter table products enable row level security;

-- Cada mueblería (usuario logueado) puede ver y manejar SOLO sus propios productos
create policy "Owners can select their products"
  on products for select
  to authenticated
  using (auth.uid() = owner_id);

create policy "Owners can insert their products"
  on products for insert
  to authenticated
  with check (auth.uid() = owner_id);

create policy "Owners can update their products"
  on products for update
  to authenticated
  using (auth.uid() = owner_id);

create policy "Owners can delete their products"
  on products for delete
  to authenticated
  using (auth.uid() = owner_id);

-- El sitio público (usuarios anónimos, sin login) solo puede ver
-- los productos que ya fueron aprobados y publicados
create policy "Anyone can view published products"
  on products for select
  to anon
  using (status = 'published');

-- =========================================================
-- Storage: bucket donde se guardan los archivos .glb
-- =========================================================
-- Paso manual necesario (no se puede hacer por SQL):
-- Supabase → Storage → New bucket → nombre: "models" → activar "Public bucket"

-- Política: solo usuarios logueados pueden subir archivos al bucket
create policy "Authenticated users can upload models"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'models');

-- La lectura pública ya queda habilitada automáticamente al marcar
-- el bucket como "Public" desde la interfaz de Supabase.
