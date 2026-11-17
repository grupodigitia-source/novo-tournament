-- Novo Tournament Beta · marcador punto por punto + perfil de jugador (idempotente)
-- Ejecutar DESPUÉS de 0001_ranked.sql, en Supabase > SQL Editor.

-- ───────────── Estado "en_juego" para partidos con marcador en vivo ─────────────
alter table public.ranked_retas drop constraint if exists ranked_retas_estado_check;
alter table public.ranked_retas add constraint ranked_retas_estado_check
  check (estado in ('pendiente','en_juego','jugada','cancelada'));

-- ───────────── Registro de cada punto (el marcador se calcula a partir de aquí) ─────────────
create table if not exists public.ranked_puntos (
  id bigint generated always as identity primary key,
  reta_id uuid not null references public.ranked_retas(id) on delete cascade,
  lado text not null check (lado in ('a','b')),
  created_at timestamptz default now()
);
create index if not exists ranked_puntos_reta_idx on public.ranked_puntos (reta_id, id);

alter table public.ranked_puntos enable row level security;
drop policy if exists "puntos_select_public" on public.ranked_puntos;
create policy "puntos_select_public" on public.ranked_puntos for select using (true);
drop policy if exists "puntos_write_admin" on public.ranked_puntos;
create policy "puntos_write_admin" on public.ranked_puntos for all
  using (public.ranked_is_admin()) with check (public.ranked_is_admin());

do $$ begin
  alter publication supabase_realtime add table public.ranked_puntos;
exception when others then null; end $$;

-- ───────────── Resultado + Elo: ahora acepta partidos pendientes o en juego ─────────────
create or replace function public.ranked_capturar_resultado(p_reta uuid, p_sets_a int, p_sets_b int) returns jsonb
language plpgsql security definer set search_path = public as $$
declare r public.ranked_retas; pa public.ranked_players; pb public.ranked_players; ea numeric; sa int; da int; v_gan uuid;
begin
  if not public.ranked_is_admin() then raise exception 'solo_admin'; end if;
  if p_sets_a is null or p_sets_b is null or p_sets_a < 0 or p_sets_b < 0 or p_sets_a = p_sets_b then
    raise exception 'resultado_invalido';
  end if;
  select * into r from public.ranked_retas where id = p_reta for update;
  if not found or r.estado not in ('pendiente','en_juego') then raise exception 'reta_no_pendiente'; end if;
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

-- ───────────── El jugador edita sus propios datos ─────────────
create or replace function public.ranked_actualizar_perfil(p_nombre text, p_edad int, p_genero text, p_cp text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'sin_sesion'; end if;
  if coalesce(trim(p_nombre), '') = '' then raise exception 'nombre_requerido'; end if;
  update public.ranked_players set nombre = trim(p_nombre) where user_id = auth.uid();
  update public.ranked_player_profiles
     set edad = p_edad, genero = p_genero, codigo_postal = p_cp
   where user_id = auth.uid();
end $$;

revoke all on function public.ranked_actualizar_perfil(text, int, text, text) from public;
grant execute on function public.ranked_actualizar_perfil(text, int, text, text) to authenticated;
