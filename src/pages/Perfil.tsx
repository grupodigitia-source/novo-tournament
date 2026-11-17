import { useCallback, useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import type { Inscripcion, Player, Reta, Sesion } from '../lib/types'
import { useRealtime } from '../hooks/useRealtime'
import { fechaCorta } from '../lib/format'
import { Empty, NivelBadge } from '../components/ui'

function Linea({ serie }: { serie: number[] }) {
  if (serie.length < 2) return null
  const min = Math.min(...serie), max = Math.max(...serie), rango = Math.max(1, max - min)
  const pts = serie.map((v, i) => `${(i / (serie.length - 1)) * 300},${50 - ((v - min) / rango) * 44 - 3}`).join(' ')
  return (
    <svg viewBox="0 0 300 50" className="h-14 w-full" preserveAspectRatio="none">
      <polyline points={pts} fill="none" stroke="#C17A5A" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </svg>
  )
}

export default function Perfil() {
  const { session, player, loading, isAdmin } = useAuth()
  const [optin, setOptin] = useState<boolean | null>(null)
  const [todos, setTodos] = useState<Player[]>([])
  const [retas, setRetas] = useState<Reta[]>([])
  const [proximas, setProximas] = useState<{ ins: Inscripcion; ses: Sesion }[]>([])
  const pid = player?.id

  const cargar = useCallback(async () => {
    if (!pid) return
    const [{ data: p }, { data: r }, { data: i }] = await Promise.all([
      supabase.from('ranked_players').select('*').eq('activo', true),
      supabase.from('ranked_retas').select('*').or(`jugador_a.eq.${pid},jugador_b.eq.${pid}`).order('fecha', { ascending: false }).limit(60),
      supabase.from('ranked_inscripciones').select('*').eq('player_id', pid).neq('estado', 'rechazada'),
    ])
    setTodos((p ?? []) as Player[]); setRetas((r ?? []) as Reta[])
    const ins = (i ?? []) as Inscripcion[]
    if (ins.length) {
      const { data: s } = await supabase.from('ranked_sesiones').select('*').in('id', ins.map((x) => x.sesion_id)).eq('estado', 'abierta').gte('fecha', new Date(Date.now() - 3 * 3600_000).toISOString()).order('fecha')
      const ses = (s ?? []) as Sesion[]
      setProximas(ses.map((x) => ({ ses: x, ins: ins.find((y) => y.sesion_id === x.id)! })))
    } else setProximas([])
  }, [pid])
  useEffect(() => { void cargar() }, [cargar])
  useRealtime(['ranked_retas', 'ranked_players', 'ranked_inscripciones'], () => void cargar())
  useEffect(() => {
    if (!session) return
    supabase.from('ranked_player_profiles').select('acepta_comunicaciones').eq('user_id', session.user.id).maybeSingle()
      .then(({ data }) => setOptin(data ? Boolean(data.acepta_comunicaciones) : null))
  }, [session])

  if (loading) return <Empty>Cargando…</Empty>
  if (!session) return <Navigate to="/login" replace />
  if (!player) return isAdmin ? <Navigate to="/admin" replace /> : <Navigate to="/registro" replace />

  const yo = todos.find((p) => p.id === player.id) ?? player
  const orden = [...todos].sort((a, b) => b.puntos - a.puntos)
  const lugar = orden.findIndex((p) => p.id === yo.id) + 1
  const nom = (id: string) => todos.find((p) => p.id === id)?.nombre ?? 'Jugador'
  const jugadas = retas.filter((r) => r.estado === 'jugada')
  const pendientes = retas.filter((r) => r.estado === 'pendiente')
  const miDelta = (r: Reta) => (r.jugador_a === yo.id ? r.delta_a : r.delta_b) ?? 0
  const gane = (r: Reta) => r.ganador === yo.id
  const ganadas = jugadas.filter(gane).length
  let racha = 0
  for (const r of jugadas) { if (gane(r)) racha++; else break }
  // Evolución de puntos reconstruida hacia atrás desde los puntos actuales
  const serie: number[] = [yo.puntos]
  for (const r of jugadas) serie.unshift(serie[0] - miDelta(r))

  const toggle = async (v: boolean) => {
    setOptin(v)
    await supabase.from('ranked_player_profiles').update({ acepta_comunicaciones: v }).eq('user_id', session.user.id)
  }

  return (
    <div className="mx-auto max-w-md space-y-4">
      <div className="card rise p-5">
        <div className="flex items-start justify-between gap-3">
          <div><div className="text-lg font-bold">{yo.nombre}</div><div className="mt-1 flex items-center gap-2"><NivelBadge nivel={yo.nivel} /><span className="font-mono text-xs text-soft">{yo.codigo}</span></div></div>
          <div className="text-right"><div className="text-4xl font-bold leading-none tabular-nums">{yo.puntos}</div><div className="mt-1 text-xs text-soft">puntos</div></div>
        </div>
        <div className="mt-4 grid grid-cols-4 gap-2 text-center">
          {[['#' + lugar, 'lugar'], [String(jugadas.length), 'jugadas'], [jugadas.length ? Math.round((ganadas / jugadas.length) * 100) + '%' : '—', 'victorias'], [String(racha), 'racha']].map(([v, l]) => (
            <div key={l} className="rounded-btn bg-off py-2"><div className="text-base font-bold tabular-nums">{v}</div><div className="text-[11px] text-soft">{l}</div></div>
          ))}
        </div>
        <div className="mt-4"><Linea serie={serie} /></div>
      </div>

      <section className="card rise p-5">
        <h2 className="mb-3 text-sm font-semibold">Mis próximas retas</h2>
        {proximas.length === 0 ? <p className="text-sm text-soft">No estás inscrito en ninguna. <Link to="/retas" className="font-semibold text-terra">Ver retas</Link></p> : (
          <ul className="space-y-2">{proximas.map(({ ses, ins }) => (
            <li key={ses.id} className="flex items-center justify-between text-sm"><span>{fechaCorta(ses.fecha)}</span><span className="chip">{ins.estado === 'pendiente' ? 'En revisión' : 'Confirmada'}</span></li>
          ))}</ul>
        )}
        {pendientes.length > 0 && <p className="mt-3 text-xs text-soft">{pendientes.length} partido{pendientes.length > 1 ? 's' : ''} por jugar.</p>}
      </section>

      <section className="card rise p-5">
        <h2 className="mb-3 text-sm font-semibold">Mis resultados</h2>
        {jugadas.length === 0 ? <p className="text-sm text-soft">Aún no has jugado partidos de Ranked.</p> : (
          <ul className="divide-y divide-line">{jugadas.map((r) => {
            const rival = nom(r.jugador_a === yo.id ? r.jugador_b : r.jugador_a)
            const mio = r.jugador_a === yo.id ? r.sets_a : r.sets_b, suyo = r.jugador_a === yo.id ? r.sets_b : r.sets_a
            const d = miDelta(r)
            return (
              <li key={r.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <div><div className="font-medium">vs {rival}</div><div className="text-xs text-soft">{fechaCorta(r.fecha)}</div></div>
                <div className="text-right"><div className="font-semibold tabular-nums">{mio}–{suyo}</div><div className={`text-xs font-bold tabular-nums ${d >= 0 ? 'text-pos' : 'text-neg'}`}>{d >= 0 ? '+' : ''}{d}</div></div>
              </li>
            )
          })}</ul>
        )}
      </section>

      <section className="card rise flex flex-col items-center gap-2 p-5">
        <QRCodeSVG value={yo.codigo ?? yo.id} size={130} fgColor="#111111" />
        <div className="text-sm font-bold tracking-widest">{yo.codigo}</div>
        <div className="text-xs text-soft">Tu ID de jugador</div>
        {optin !== null && (
          <label className="mt-3 flex w-full cursor-pointer items-center justify-between gap-4 border-t border-line pt-3 text-sm">
            <span>Recibir información de retas y torneos</span>
            <input type="checkbox" role="switch" className="h-5 w-9 cursor-pointer accent-[#C17A5A]" checked={optin} onChange={(e) => void toggle(e.target.checked)} />
          </label>
        )}
      </section>
    </div>
  )
}
