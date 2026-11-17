import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Player, Punto, Reta, Sesion } from '../lib/types'
import { calcular, type Marcador } from '../lib/marcador'
import { useRealtime } from '../hooks/useRealtime'
import { fechaCorta } from '../lib/format'
import { nivelCat } from '../lib/niveles'
import { Logo } from '../components/Logo'

export default function TV() {
  const [players, setPlayers] = useState<Player[]>([])
  const [retas, setRetas] = useState<Reta[]>([])
  const [sesiones, setSesiones] = useState<Sesion[]>([])
  const [vivos, setVivos] = useState<{ reta: Reta; m: Marcador }[]>([])
  const [hora, setHora] = useState(new Date())

  const load = useCallback(async () => {
    const [{ data: p }, { data: r }, { data: s }] = await Promise.all([
      supabase.from('ranked_players').select('*').order('puntos', { ascending: false }),
      supabase.from('ranked_retas').select('*').eq('estado', 'jugada').order('jugada_at', { ascending: false }).limit(5),
      supabase.from('ranked_sesiones').select('*').eq('estado', 'abierta').gte('fecha', new Date(Date.now() - 3 * 3600_000).toISOString()).order('fecha').limit(3),
    ])
    const { data: v } = await supabase.from('ranked_retas').select('*').eq('estado', 'en_juego').order('fecha')
    const enJuego = (v ?? []) as Reta[]
    if (enJuego.length) {
      const { data: pts } = await supabase.from('ranked_puntos').select('*').in('reta_id', enJuego.map((x) => x.id)).order('id')
      const todos = (pts ?? []) as Punto[]
      setVivos(enJuego.map((reta) => ({ reta, m: calcular(todos.filter((x) => x.reta_id === reta.id).map((x) => x.lado)) })))
    } else setVivos([])
    setPlayers((p ?? []) as Player[]); setRetas((r ?? []) as Reta[]); setSesiones((s ?? []) as Sesion[])
  }, [])
  useEffect(() => { void load(); const t = setInterval(() => setHora(new Date()), 30_000); const t2 = setInterval(() => void load(), 60_000); return () => { clearInterval(t); clearInterval(t2) } }, [load])
  useRealtime(['ranked_puntos', 'ranked_players', 'ranked_retas', 'ranked_sesiones', 'ranked_inscripciones'], () => void load())

  const nombre = (id: string | null) => players.find((p) => p.id === id)?.nombre ?? '—'
  return (
    <div className="fixed inset-0 z-50 overflow-auto bg-white p-8">
      <div className="mx-auto max-w-[1600px]">
        <div className="mb-6 flex items-center justify-between">
          <Logo size={44} />
          <div className="flex items-center gap-3 text-sm font-semibold text-soft"><span className="h-2.5 w-2.5 animate-pulse rounded-full bg-pos" /> EN VIVO · {hora.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}</div>
        </div>
        {vivos.length > 0 && (
          <section className="card mb-8 p-6">
            <h2 className="mb-4 flex items-center gap-3 text-lg font-bold"><span className="h-2.5 w-2.5 animate-pulse rounded-full bg-neg" /> Jugando ahora</h2>
            <div className="grid gap-4 md:grid-cols-2">
              {vivos.map(({ reta, m }) => (
                <div key={reta.id} className="rounded-card border border-line bg-white p-5">
                  {([[reta.jugador_a, m.juegosA, m.puntosA], [reta.jugador_b, m.juegosB, m.puntosB]] as const).map(([id, j, pt], i) => (
                    <div key={id} className={`flex items-center justify-between text-3xl ${i === 0 ? 'mb-2 border-b border-line pb-2' : ''}`}>
                      <span className="font-semibold">{nombre(id)}</span>
                      <span className="flex items-center gap-6 tabular-nums"><b className="text-terra">{j}</b><b className="w-16 text-right">{pt}</b></span>
                    </div>
                  ))}
                  <div className="mt-2 text-sm font-semibold text-soft">{m.tiebreak ? 'Tie-break' : m.puntoOro ? 'Punto de oro' : ''}</div>
                </div>
              ))}
            </div>
          </section>
        )}
        <div className="grid gap-8 lg:grid-cols-3">
          <section className="card p-6 lg:col-span-2">
            <h2 className="mb-4 text-lg font-bold">Top 10 Ranked</h2>
            <ol className="space-y-1">
              {players.filter((p) => p.activo).slice(0, 10).map((p, i) => (
                <li key={p.id} className="flex items-center gap-4 rounded-card px-3 py-2 text-xl transition-all duration-700" style={{ background: i === 0 ? 'rgba(193,122,90,.08)' : undefined }}>
                  <span className="w-10 text-2xl font-bold text-terra">{i + 1}</span>
                  <span className="flex-1 font-semibold">{p.nombre}</span>
                  <span className="chip !text-base">{p.nivel} · {nivelCat(p.nivel)}</span>
                  <span className="w-24 text-right text-2xl font-bold tabular-nums">{p.puntos}</span>
                </li>
              ))}
            </ol>
          </section>
          <div className="space-y-8">
            <section className="card p-6">
              <h2 className="mb-3 text-lg font-bold">Últimos resultados</h2>
              {retas.length === 0 ? <p className="text-soft">Sin resultados aún.</p> : retas.map((r) => (
                <div key={r.id} className="border-b border-line py-2 last:border-0">
                  <div className="text-lg font-semibold">{nombre(r.jugador_a)} <span className="text-terra">{r.sets_a}–{r.sets_b}</span> {nombre(r.jugador_b)}</div>
                  <div className="text-sm text-pos">{r.delta_a !== null && `${r.delta_a >= 0 ? '+' : ''}${r.delta_a} / ${(r.delta_b ?? 0) >= 0 ? '+' : ''}${r.delta_b}`}</div>
                </div>
              ))}
            </section>
            <section className="card p-6">
              <h2 className="mb-3 text-lg font-bold">Próximas retas</h2>
              {sesiones.length === 0 ? <p className="text-soft">Sin retas programadas.</p> : sesiones.map((s) => (
                <div key={s.id} className="flex justify-between border-b border-line py-2 text-lg last:border-0"><span>{fechaCorta(s.fecha)}</span><span className="chip">{s.nivel} · {nivelCat(s.nivel)}</span></div>
              ))}
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}
