-- Novo Tournament Beta · esquema Ranked (idempotente: se puede correr más de una vez)
-- Ejecutar en Supabase > SQL Editor.

create extension if not exists pgcrypto;

-- ───────────────────────── Tablas base ─────────────────────────
create table if not exists public.ranked_players (
  id uuid default gen_random_uuid() primary key,
  nombre text not null,
  nivel text not null,
  puntos integer default 1000,
  activo boolean default true,
  created_at timestamptz default now()
);

create table if not exists public.ranked_retas (
  id uuid default gen_random_uuid() primary key,
  jugador_a uuid references public.ranked_players(id),
  jugador_b uuid references public.ranked_players(id),
  fecha timestamptz not null,
  estado text default 'pendiente' check (estado in ('pendiente','jugada','cancelada')),
  sets_a integer,
  sets_b integer,
  ganador uuid references public.ranked_players(id),
  created_at timestamptz default now()
);

-- ───────────────────────── 7 niveles: 7ª Bronce … 1ª Leyenda ─────────────────────────
alter table public.ranked_players drop constraint if exists ranked_players_nivel_check;
alter table public.ranked_players add constraint ranked_players_nivel_check
  check (nivel in ('Bronce','Plata','Oro','Platino','Diamante','Élite','Leyenda'));

-- ───────────────────────── Cuenta de jugador + ID ─────────────────────────
alter table public.ranked_players add column if not exists user_id uuid unique references auth.users(id) on delete set null;
alter table public.ranked_players add column if not exists codigo text unique;   -- ID visible: NT-XXXXXX

-- Datos personales del onboarding: SOLO el dueño y el admin los leen (nunca públicos)
create table if not exists public.ranked_player_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  player_id uuid references public.ranked_players(id) on delete cascade,
  edad integer check (edad between 8 and 90),
  genero text check (genero in ('Mujer','Hombre','Otro','Prefiero no decir')),
  codigo_postal text check (codigo_postal ~ '^[0-9]{5}$'),
  tiempo_jugando text,
  acepta_comunicaciones boolean not null default false,
  created_at timestamptz default now()
);

create table if not exists public.ranked_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz default now()
);

-- ───────────────────────── Sesiones (QR) e inscripciones ─────────────────────────
create table if not exists public.ranked_sesiones (
  id uuid default gen_random_uuid() primary key,
  fecha timestamptz not null,
  nivel text not null check (nivel in ('Bronce','Plata','Oro','Platino','Diamante','Élite','Leyenda')),
  cupo integer not null default 4 check (cupo > 0),
  codigo text unique,                                     -- RT-XXXXXX: va dentro del QR de la reta
  estado text not null default 'abierta' check (estado in ('abierta','cerrada','cancelada')),
  created_at timestamptz default now()
);

create table if not exists public.ranked_inscripciones (
  id uuid default gen_random_uuid() primary key,
  sesion_id uuid not null references public.ranked_sesiones(id) on delete cascade,
  player_id uuid not null references public.ranked_players(id) on delete cascade,
  estado text not null default 'confirmada' check (estado in ('confirmada','pendiente','rechazada')),
  created_at timestamptz default now(),
  unique (sesion_id, player_id)
);

alter table public.ranked_retas add column if not exists sesion_id uuid references public.ranked_sesiones(id) on delete set null;
alter table public.ranked_retas add column if not exists delta_a integer;
alter table public.ranked_retas add column if not exists delta_b integer;
alter table public.ranked_retas add column if not exists jugada_at timestamptz;

-- ───────────────────────── Utilidades ─────────────────────────
create or replace function public.ranked_gen_code(prefix text) returns text
language plpgsql as $$
declare alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; out text := ''; i int;
begin
  for i in 1..6 loop out := out || substr(alphabet, 1 + floor(random() * 32)::int, 1); end loop;
  return prefix || '-' || out;
end $$;

create or replace function public.ranked_set_codigo() returns trigger
language plpgsql as $$
begin
  if new.codigo is null then
    new.codigo := public.ranked_gen_code(case tg_table_name when 'ranked_players' then 'NT' else 'RT' end);
  end if;
  return new;
end $$;

drop trigger if exists ranked_players_codigo on public.ranked_players;
create trigger ranked_players_codigo before insert on public.ranked_players
  for each row execute function public.ranked_set_codigo();
drop trigger if exists ranked_sesiones_codigo on public.ranked_sesiones;
create trigger ranked_sesiones_codigo before insert on public.ranked_sesiones
  for each row execute function public.ranked_set_codigo();

update public.ranked_players set codigo = public.ranked_gen_code('NT') where codigo is null;

create or replace function public.ranked_nivel_idx(n text) returns int
language sql immutable as $$
  select array_position(array['Bronce','Plata','Oro','Platino','Diamante','Élite','Leyenda'], n)
$$;

create or replace function public.ranked_is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.ranked_admins where user_id = auth.uid())
$$;

create or replace function public.ranked_admin_exists() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.ranked_admins)
$$;

-- El primer usuario autenticado puede reclamar el rol de administrador (solo si aún no hay ninguno)
create or replace function public.ranked_claim_admin() returns boolean
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'sin_sesion'; end if;
  if exists (select 1 from public.ranked_admins) then return false; end if;
  insert into public.ranked_admins(user_id) values (auth.uid());
  return true;
end $$;

-- ───────────────────────── Onboarding de jugador ─────────────────────────
create or replace function public.ranked_registrar_jugador(
  p_nombre text, p_nivel text, p_edad int, p_genero text, p_cp text, p_tiempo text, p_optin boolean
) returns public.ranked_players
language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_player public.ranked_players;
begin
  if v_uid is null then raise exception 'sin_sesion'; end if;
  select * into v_player from public.ranked_players where user_id = v_uid;
  if found then return v_player; end if;
  if coalesce(trim(p_nombre), '') = '' then raise exception 'nombre_requerido'; end if;
  insert into public.ranked_players (nombre, nivel, user_id)
    values (trim(p_nombre), p_nivel, v_uid) returning * into v_player;
  insert into public.ranked_player_profiles (user_id, player_id, edad, genero, codigo_postal, tiempo_jugando, acepta_comunicaciones)
    values (v_uid, v_player.id, p_edad, p_genero, p_cp, p_tiempo, coalesce(p_optin, false))
    on conflict (user_id) do nothing;
  return v_player;
end $$;

-- ───────────────────────── Inscripción por QR ─────────────────────────
-- Un jugador puede entrar a sesiones de su nivel o de un nivel arriba; si no, queda "pendiente" para el admin.
create or replace function public.ranked_inscribirme(p_codigo text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid(); v_ses public.ranked_sesiones; v_pl public.ranked_players;
  v_estado text; v_diff int; v_ocupados int; v_prev text;
begin
  if v_uid is null then raise exception 'sin_sesion'; end if;
  select * into v_ses from public.ranked_sesiones where codigo = p_codigo;
  if not found then raise exception 'sesion_no_existe'; end if;
  select * into v_pl from public.ranked_players where user_id = v_uid;
  if not found then raise exception 'sin_perfil'; end if;

  select estado into v_prev from public.ranked_inscripciones where sesion_id = v_ses.id and player_id = v_pl.id;
  if found then return jsonb_build_object('estado', v_prev, 'ya_inscrito', true, 'sesion_id', v_ses.id); end if;
  if v_ses.estado <> 'abierta' then return jsonb_build_object('estado', 'cerrada', 'sesion_id', v_ses.id); end if;

  v_diff := public.ranked_nivel_idx(v_ses.nivel) - public.ranked_nivel_idx(v_pl.nivel);
  select count(*) into v_ocupados from public.ranked_inscripciones where sesion_id = v_ses.id and estado = 'confirmada';

  if v_diff in (0, 1) then
    if v_ocupados >= v_ses.cupo then return jsonb_build_object('estado', 'llena', 'sesion_id', v_ses.id); end if;
    v_estado := 'confirmada';
  else
    v_estado := 'pendiente';
  end if;
  insert into public.ranked_inscripciones (sesion_id, player_id, estado) values (v_ses.id, v_pl.id, v_estado);
  return jsonb_build_object('estado', v_estado, 'sesion_id', v_ses.id);
end $$;

-- ───────────────────────── Resultado + Elo (K = 32), atómico ─────────────────────────
create or replace function public.ranked_capturar_resultado(p_reta uuid, p_sets_a int, p_sets_b int) returns jsonb
language plpgsql security definer set search_path = public as $$
declare r public.ranked_retas; pa public.ranked_players; pb public.ranked_players; ea numeric; sa int; da int; v_gan uuid;
begin
  if not public.ranked_is_admin() then raise exception 'solo_admin'; end if;
  if p_sets_a is null or p_sets_b is null or p_sets_a < 0 or p_sets_b < 0 or p_sets_a = p_sets_b then
    raise exception 'resultado_invalido';
  end if;
  select * into r from public.ranked_retas where id = p_reta for update;
  if not found or r.estado <> 'pendiente' then raise exception 'reta_no_pendiente'; end if;
  select * into pa from public.ranked_players where id = r.jugador_a for update;
  select * into pb from public.ranked_players where id = r.jugador_b for update;

  ea := 1 / (1 + power(10, (pb.puntos - pa.puntos)::numeric / 400));
  sa := case when p_sets_a > p_sets_b then 1 else 0 end;
  da := round(32 * (sa - ea));
  v_gan := case when sa = 1 then pa.id else pb.id end;

  update public.ranked_players set puntos = puntos + da where id = pa.id;
  update public.ranked_players set puntos = puntos - da where id = pb.id;
  update public.ranked_retas
     set estado = 'jugada', sets_a = p_sets_a, sets_b = p_sets_b, ganador = v_gan,
         delta_a = da, delta_b = -da, jugada_at = now()
   where id = r.id;
  return jsonb_build_object('delta_a', da, 'delta_b', -da, 'ganador', v_gan,
                            'puntos_a', pa.puntos + da, 'puntos_b', pb.puntos - da);
end $$;

-- ───────────────────────── RLS ─────────────────────────
alter table public.ranked_players enable row level security;
alter table public.ranked_retas enable row level security;
alter table public.ranked_sesiones enable row level security;
alter table public.ranked_inscripciones enable row level security;
alter table public.ranked_player_profiles enable row level security;
alter table public.ranked_admins enable row level security;

-- Lectura pública (anon): tabla, retas, sesiones e inscripciones
drop policy if exists "players_select_public" on public.ranked_players;
create policy "players_select_public" on public.ranked_players for select using (true);
drop policy if exists "retas_select_public" on public.ranked_retas;
create policy "retas_select_public" on public.ranked_retas for select using (true);
drop policy if exists "sesiones_select_public" on public.ranked_sesiones;
create policy "sesiones_select_public" on public.ranked_sesiones for select using (true);
drop policy if exists "inscripciones_select_public" on public.ranked_inscripciones;
create policy "inscripciones_select_public" on public.ranked_inscripciones for select using (true);

-- Escritura: solo administradores (los jugadores escriben a través de las funciones de arriba)
drop policy if exists "players_write_admin" on public.ranked_players;
create policy "players_write_admin" on public.ranked_players for all
  using (public.ranked_is_admin()) with check (public.ranked_is_admin());
drop policy if exists "retas_write_admin" on public.ranked_retas;
create policy "retas_write_admin" on public.ranked_retas for all
  using (public.ranked_is_admin()) with check (public.ranked_is_admin());
drop policy if exists "sesiones_write_admin" on public.ranked_sesiones;
create policy "sesiones_write_admin" on public.ranked_sesiones for all
  using (public.ranked_is_admin()) with check (public.ranked_is_admin());
drop policy if exists "inscripciones_write_admin" on public.ranked_inscripciones;
create policy "inscripciones_write_admin" on public.ranked_inscripciones for all
  using (public.ranked_is_admin()) with check (public.ranked_is_admin());

-- Datos personales: dueño y admin leen; el dueño puede cambiar su permiso de avisos
drop policy if exists "profiles_select_owner_admin" on public.ranked_player_profiles;
create policy "profiles_select_owner_admin" on public.ranked_player_profiles for select
  using (user_id = auth.uid() or public.ranked_is_admin());
drop policy if exists "profiles_update_owner" on public.ranked_player_profiles;
create policy "profiles_update_owner" on public.ranked_player_profiles for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "admins_select_self" on public.ranked_admins;
create policy "admins_select_self" on public.ranked_admins for select using (user_id = auth.uid());

-- ───────────────────────── Permisos de funciones ─────────────────────────
revoke all on function public.ranked_claim_admin() from public;
revoke all on function public.ranked_registrar_jugador(text, text, int, text, text, text, boolean) from public;
revoke all on function public.ranked_inscribirme(text) from public;
revoke all on function public.ranked_capturar_resultado(uuid, int, int) from public;
grant execute on function public.ranked_claim_admin() to authenticated;
grant execute on function public.ranked_registrar_jugador(text, text, int, text, text, text, boolean) to authenticated;
grant execute on function public.ranked_inscribirme(text) to authenticated;
grant execute on function public.ranked_capturar_resultado(uuid, int, int) to authenticated;
grant execute on function public.ranked_admin_exists() to anon, authenticated;
grant execute on function public.ranked_is_admin() to anon, authenticated;

-- ───────────────────────── Realtime (modo TV) ─────────────────────────
do $$ begin
  alter publication supabase_realtime add table public.ranked_players;
exception when others then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.ranked_retas;
exception when others then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.ranked_inscripciones;
exception when others then null; end $$;
