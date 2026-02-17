
-- ==============================================================================
-- SCHEMA DO TÁ NO POSTO
-- Copie e cole este conteúdo no SQL Editor do Supabase.
-- ==============================================================================

-- 1. ENUMS (Para garantir consistência com os types.ts do Frontend)
-- ==============================================================================
create type user_role as enum ('admin', 'driver');
create type user_status as enum ('active', 'banned');
create type report_status as enum ('pending', 'resolved', 'dismissed');

-- 2. TABELA DE PERFIS (PROFILES)
-- Extensão da tabela auth.users padrão do Supabase
-- ==============================================================================
create table public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  email text not null,
  name text,
  role user_role default 'driver',
  reputation int default 0,
  contributions int default 0,
  status user_status default 'active',
  created_at timestamp with time zone default timezone('utc'::text, now()),
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- Habilitar RLS
alter table public.profiles enable row level security;

-- Políticas de Segurança (RLS)
create policy "Perfis são visíveis para todos (leitura)" 
  on profiles for select using (true);

create policy "Usuário pode criar seu próprio perfil no cadastro" 
  on profiles for insert with check (auth.uid() = id);

create policy "Usuário pode editar seu próprio perfil" 
  on profiles for update using (auth.uid() = id);

create policy "Admins podem editar qualquer perfil" 
  on profiles for update using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

-- 3. TABELA DE TIPOS DE COMBUSTÍVEL (FUEL TYPES)
-- Gerenciado pelo AdminApp -> Settings
-- ==============================================================================
create table public.fuel_types (
  id uuid default gen_random_uuid() primary key,
  name text not null unique, -- Ex: 'Gasolina Comum', 'Etanol'
  color text default '#3b82f6', -- Cor Hex para UI
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- RLS
alter table public.fuel_types enable row level security;

create policy "Leitura pública de combustíveis" 
  on fuel_types for select using (true);

create policy "Apenas admins podem gerenciar combustíveis" 
  on fuel_types for all using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

-- Seed Inicial de Combustíveis (Baseado no types.ts)
insert into public.fuel_types (name, color) values
  ('Gasolina Comum', '#ef4444'),
  ('Gasolina Aditivada', '#dc2626'),
  ('Etanol', '#22c55e'),
  ('Diesel S10', '#1f2937'),
  ('Diesel S500', '#4b5563'),
  ('GNV', '#eab308'),
  ('Arla 32', '#3b82f6')
on conflict (name) do nothing;

-- 4. TABELA DE POSTOS (STATIONS)
-- Gerenciado pelo AdminApp -> Stations
-- ==============================================================================
create table public.stations (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  brand text not null, -- Ex: 'Petrobras', 'Shell'
  address text,
  lat double precision not null,
  lng double precision not null,
  is_verified boolean default false, -- Se foi criado/validado por um admin
  created_by uuid references public.profiles(id),
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- RLS
alter table public.stations enable row level security;

create policy "Leitura pública de postos" 
  on stations for select using (true);

create policy "Admins podem criar/editar/deletar postos" 
  on stations for all using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

create policy "Drivers podem sugerir postos (Insert apenas)" 
  on stations for insert with check (auth.role() = 'authenticated');

-- 5. TABELA DE PREÇOS (PRICES)
-- ClientApp -> UpdatePriceModal
-- Armazena o preço ATUAL. Histórico pode ser feito em outra tabela se necessário.
-- ==============================================================================
create table public.station_prices (
  id uuid default gen_random_uuid() primary key,
  station_id uuid references public.stations(id) on delete cascade not null,
  fuel_type_id uuid references public.fuel_types(id) on delete restrict not null,
  value numeric(10, 2) not null, -- Preço
  updated_by uuid references public.profiles(id),
  confirmations int default 0,
  updated_at timestamp with time zone default timezone('utc'::text, now()),
  
  -- Garante apenas um registro de preço por tipo de combustível por posto
  unique(station_id, fuel_type_id)
);

-- RLS
alter table public.station_prices enable row level security;

create policy "Leitura pública de preços" 
  on station_prices for select using (true);

create policy "Usuários autenticados podem atualizar preços" 
  on station_prices for insert with check (auth.role() = 'authenticated');

create policy "Usuários autenticados podem editar preços" 
  on station_prices for update using (auth.role() = 'authenticated');

-- NOVA POLÍTICA: Admins podem deletar preços (necessário para Cascade Delete de Postos)
create policy "Admins podem deletar preços" 
  on station_prices for delete using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

-- 6. FAVORITOS (USER_FAVORITES)
-- ClientApp -> Favorites Tab
-- ==============================================================================
create table public.user_favorites (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  station_id uuid references public.stations(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  
  unique(user_id, station_id)
);

-- RLS
alter table public.user_favorites enable row level security;

create policy "Usuários gerenciam seus próprios favoritos" 
  on user_favorites for all using (auth.uid() = user_id);

-- NOVA POLÍTICA: Admins podem deletar qualquer favorito (necessário para Cascade Delete de Postos)
create policy "Admins podem deletar favoritos em cascata" 
  on user_favorites for delete using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

-- 7. DENÚNCIAS (REPORTS)
-- AdminApp -> Moderation
-- ==============================================================================
create table public.reports (
  id uuid default gen_random_uuid() primary key,
  station_id uuid references public.stations(id) on delete cascade,
  reported_by uuid references public.profiles(id),
  reason text not null,
  status report_status default 'pending',
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- RLS
alter table public.reports enable row level security;

create policy "Admins podem ver e gerenciar denúncias" 
  on reports for all using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

create policy "Usuários podem criar denúncias" 
  on reports for insert with check (auth.role() = 'authenticated');

-- 8. CONFIGURAÇÕES DO USUÁRIO & NOTIFICAÇÕES
-- ClientApp -> NotificationsSettings
-- ==============================================================================
create table public.user_settings (
  user_id uuid references public.profiles(id) on delete cascade primary key,
  alert_price boolean default true,
  alert_new_stations boolean default false,
  alert_updates boolean default true
);

alter table public.user_settings enable row level security;
create policy "Usuários gerenciam suas configs" on user_settings for all using (auth.uid() = user_id);

-- Trigger para criar settings padrão ao criar user
create or replace function public.handle_new_user_settings() 
returns trigger as $$
begin
  insert into public.user_settings (user_id) values (new.id);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_profile_created
  after insert on public.profiles
  for each row execute procedure public.handle_new_user_settings();


-- ==============================================================================
-- DADOS DE DEMONSTRAÇÃO
-- ==============================================================================

-- Inserir alguns postos na área de demonstração (Cabo de Santo Agostinho/Recife)
insert into public.stations (name, brand, address, lat, lng, is_verified) values 
('Posto Central', 'Petrobras', 'Av. Principal, 100', -8.285816, -35.034964, true),
('Auto Posto Shell', 'Shell', 'Rodovia BR-101, Km 20', -8.289000, -35.031000, true),
('Posto Econômico', 'Bandeira Branca', 'Rua do Comércio, 50', -8.282000, -35.038000, true);

-- ==============================================================================
-- PATCH / CORREÇÃO (RODE APENAS O CÓDIGO ABAIXO SE JÁ TIVER CRIADO O BANCO ANTES)
-- Copie e cole APENAS o bloco abaixo no SQL Editor do Supabase para corrigir a exclusão
-- ==============================================================================

/*

-- 1. Remover chaves estrangeiras antigas e recriar com CASCADE
ALTER TABLE public.station_prices DROP CONSTRAINT IF EXISTS station_prices_station_id_fkey;
ALTER TABLE public.station_prices
  ADD CONSTRAINT station_prices_station_id_fkey
  FOREIGN KEY (station_id) REFERENCES public.stations(id)
  ON DELETE CASCADE;

ALTER TABLE public.user_favorites DROP CONSTRAINT IF EXISTS user_favorites_station_id_fkey;
ALTER TABLE public.user_favorites
  ADD CONSTRAINT user_favorites_station_id_fkey
  FOREIGN KEY (station_id) REFERENCES public.stations(id)
  ON DELETE CASCADE;

ALTER TABLE public.reports DROP CONSTRAINT IF EXISTS reports_station_id_fkey;
ALTER TABLE public.reports
  ADD CONSTRAINT reports_station_id_fkey
  FOREIGN KEY (station_id) REFERENCES public.stations(id)
  ON DELETE CASCADE;

-- 2. Garantir que Admins tenham permissão para deletar os registros filhos (RLS)
DROP POLICY IF EXISTS "Admins podem deletar preços" ON public.station_prices;
CREATE POLICY "Admins podem deletar preços" 
  ON public.station_prices FOR DELETE 
  USING (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

DROP POLICY IF EXISTS "Admins podem deletar favoritos em cascata" ON public.user_favorites;
CREATE POLICY "Admins podem deletar favoritos em cascata" 
  ON public.user_favorites FOR DELETE 
  USING (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

*/
