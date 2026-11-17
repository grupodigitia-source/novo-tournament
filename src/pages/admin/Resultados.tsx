import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import type { Player, Reta } from '../../lib/types'
import { deltaElo } from '../../lib/elo'
import { fechaCorta } from '../../lib/format'
import { Empty, ErrorMsg, Title } from '../../components/ui'

export default function Resultados() {
  const [retas, setRetas] = useState<Reta[]>([])
  const [players, setPlayers] = useState<Player[]>([])
  const [sets, setSets] = useState<Record<string, { a: string; b: string }>>({})
  const [err, setErr] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)

  const load = useCallback(async () => {
    const [{ data: r }, { data: p }] = await Promise.all([
      supabase.from('ranked_retas').select('*').in('estado', ['pendiente', 'en_juego']).order('fecha'),
      supabase.from('ranked_players').select('*'),
    ])
    setRetas((r ?? []) as Reta[]); setPlayers((p ?? []) as Player[])
  }, [])
  useEffect(() => { void load() }, [load])
  const pl = (id: string) => players.find((p) => p.id === id)

  const guardar = async (r: Reta) => {
    setErr(null); setOk(null)
    const s = sets[r.id]; const a = Number(s?.a), b = Number(s?.b)
    if (!s || s.a === '' || s.b === '' || a === b) return setErr('Captura un marcador sin empate.')
    const { data, error } = await supabase.rpc('ranked_capturar_resultado', { p_reta: r.id, p_sets_a: a, p_sets_b: b })
    if (error) return setErr(error.message)
    const d = data as { delta_a: number; delta_b: number }
    setOk(`Resultado guardado: ${pl(r.jugador_a)?.nombre} ${d.delta_a >= 0 ? '+' : ''}${d.delta_a} · ${pl(r.jugador_b)?.nombre} ${d.delta_b >= 0 ? '+' : ''}${d.delta_b}`)
    void load()
  }

  const eliminar = async (r: Reta) => {
    if (!window.confirm('¿Eliminar este partido pendiente? No se puede deshacer.')) return
    const { error } = await supabase.from('ranked_retas').delete().eq('id', r.id).in('estado', ['pendiente', 'en_juego'])
    if (error) setErr(error.message); else void load()
  }

  return (
    <div>
      <Title sub="Elo con K = 32. Los puntos se actualizan al instante en la tabla y en la TV.">Capturar resultado</Title>
      <div className="mb-3 space-y-2"><ErrorMsg msg={err} />{ok && <p className="rounded-btn border border-pos/30 bg-pos/5 px-3 py-2 text-sm text-pos">{ok}</p>}</div>
      {retas.length === 0 ? <Empty>No hay partidos pendientes. Créalos en "Programar reta".</Empty> : (
        <div className="space-y-3">
          {retas.map((r) => {
            const a = pl(r.jugador_a), b = pl(r.jugador_b)
            const s = sets[r.id] ?? { a: '', b: '' }
            const na = Number(s.a), nb = Number(s.b)
            const prev = s.a !== '' && s.b !== '' && na !== nb && a && b ? deltaElo(a.puntos, b.puntos, na > nb) : null
            return (
              <div key={r.id} className="card rise flex flex-wrap items-center gap-4 p-4">
                <div className="min-w-[140px] text-xs text-soft">{fechaCorta(r.fecha)}</div>
                <div className="flex-1 text-sm font-semibold">{a?.nombre} <span className="text-soft">({a?.puntos})</span> vs {b?.nombre} <span className="text-soft">({b?.puntos})</span></div>
                <div className="flex items-center gap-2">
                  <input className="input !w-16 text-center" inputMode="numeric" placeholder="A" value={s.a} onChange={(e) => setSets({ ...sets, [r.id]: { ...s, a: e.target.value.replace(/\D/g, '').slice(0, 2) } })} />
                  <span className="text-soft">–</span>
                  <input className="input !w-16 text-center" inputMode="numeric" placeholder="B" value={s.b} onChange={(e) => setSets({ ...sets, [r.id]: { ...s, b: e.target.value.replace(/\D/g, '').slice(0, 2) } })} />
                </div>
                <div className="w-28 text-xs tabular-nums text-soft">{prev !== null && `${prev >= 0 ? '+' : ''}${prev} / ${-prev >= 0 ? '+' : ''}${-prev}`}</div>
                <button className="btn-primary" onClick={() => void guardar(r)}>Guardar</button>
                <button className="btn-ghost !text-neg" onClick={() => void eliminar(r)}>Eliminar</button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
