import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import type { Player, Punto, Reta } from '../../lib/types'
import { calcular } from '../../lib/marcador'
import { useRealtime } from '../../hooks/useRealtime'
import { fechaCorta } from '../../lib/format'
import { Empty, ErrorMsg, Title } from '../../components/ui'

export default function EnVivo() {
  const [retas, setRetas] = useState<Reta[]>([])
  const [players, setPlayers] = useState<Player[]>([])
  const [sel, setSel] = useState<string | null>(null)
  const [puntos, setPuntos] = useState<Punto[]>([])
  const [err, setErr] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const cargar = useCallback(async () => {
    const [{ data: r }, { data: p }] = await Promise.all([
      supabase.from('ranked_retas').select('*').in('estado', ['pendiente', 'en_juego']).order('fecha'),
      supabase.from('ranked_players').select('*'),
    ])
    setRetas((r ?? []) as Reta[]); setPlayers((p ?? []) as Player[])
  }, [])
  const cargarPuntos = useCallback(async () => {
    if (!sel) { setPuntos([]); return }
    const { data } = await supabase.from('ranked_puntos').select('*').eq('reta_id', sel).order('id')
    setPuntos((data ?? []) as Punto[])
  }, [sel])
  useEffect(() => { void cargar() }, [cargar])
  useEffect(() => { void cargarPuntos() }, [cargarPuntos])
  useRealtime(['ranked_puntos', 'ranked_retas'], () => { void cargar(); void cargarPuntos() })

  const nom = (id: string) => players.find((p) => p.id === id)?.nombre ?? '—'
  const reta = retas.find((r) => r.id === sel) ?? null
  const m = calcular(puntos.map((x) => x.lado))

  const punto = async (lado: 'a' | 'b') => {
    if (!reta || m.terminado || busy) return
    setBusy(true); setErr(null); setOk(null)
    const { error } = await supabase.from('ranked_puntos').insert({ reta_id: reta.id, lado })
    if (error) setErr(error.message)
    else if (reta.estado === 'pendiente') await supabase.from('ranked_retas').update({ estado: 'en_juego' }).eq('id', reta.id)
    await cargarPuntos(); void cargar(); setBusy(false)
  }
  const deshacer = async () => {
    const ultimo = puntos[puntos.length - 1]
    if (!ultimo || busy) return
    setBusy(true); setOk(null)
    const { error } = await supabase.from('ranked_puntos').delete().eq('id', ultimo.id)
    if (error) setErr(error.message)
    await cargarPuntos(); setBusy(false)
  }
  const reiniciar = async () => {
    if (!reta || !window.confirm('¿Reiniciar el marcador de este partido?')) return
    await supabase.from('ranked_puntos').delete().eq('reta_id', reta.id)
    await supabase.from('ranked_retas').update({ estado: 'pendiente' }).eq('id', reta.id)
    setOk(null); await cargarPuntos(); void cargar()
  }
  const finalizar = async () => {
    if (!reta || !m.terminado) return
    setBusy(true); setErr(null)
    const { data, error } = await supabase.rpc('ranked_capturar_resultado', { p_reta: reta.id, p_sets_a: m.juegosA, p_sets_b: m.juegosB })
    setBusy(false)
    if (error) return setErr(error.message)
    const d = data as { delta_a: number; delta_b: number }
    setOk(`Partido guardado: ${nom(reta.jugador_a)} ${d.delta_a >= 0 ? '+' : ''}${d.delta_a} · ${nom(reta.jugador_b)} ${d.delta_b >= 0 ? '+' : ''}${d.delta_b}`)
    setSel(null); void cargar()
  }

  return (
    <div>
      <Title sub="Registra cada punto: la tabla de TV se mueve en vivo. 1 set a 6 juegos, punto de oro, tie-break a 7 en 6-6.">Marcador en vivo</Title>
      <div className="mb-3 space-y-2"><ErrorMsg msg={err} />{ok && <p className="rounded-btn border border-pos/30 bg-pos/5 px-3 py-2 text-sm text-pos">{ok}</p>}</div>

      {!reta ? (
        retas.length === 0 ? <Empty>No hay partidos por jugar. Crea uno en "Programar reta".</Empty> : (
          <div className="space-y-3">
            {retas.map((r) => (
              <button key={r.id} onClick={() => { setSel(r.id); setOk(null) }} className="card rise flex w-full items-center justify-between gap-3 p-4 text-left transition hover:-translate-y-0.5 hover:shadow-up">
                <div><div className="text-sm font-semibold">{nom(r.jugador_a)} vs {nom(r.jugador_b)}</div><div className="text-xs text-soft">{fechaCorta(r.fecha)}</div></div>
                <span className="chip">{r.estado === 'en_juego' ? 'En juego' : 'Por jugar'}</span>
              </button>
            ))}
          </div>
        )
      ) : (
        <div className="mx-auto max-w-xl">
          <div className="card rise p-5">
            <div className="mb-4 flex items-center justify-between text-xs text-soft">
              <button className="font-semibold text-terra" onClick={() => setSel(null)}>Cambiar partido</button>
              <span>{m.tiebreak ? 'Tie-break' : m.puntoOro ? 'Punto de oro' : m.terminado ? 'Terminado' : 'En juego'}</span>
            </div>
            {([['a', reta.jugador_a, m.juegosA, m.puntosA], ['b', reta.jugador_b, m.juegosB, m.puntosB]] as const).map(([l, id, j, pt]) => (
              <div key={l} className={`flex items-center justify-between gap-3 py-3 ${l === 'a' ? 'border-b border-line' : ''}`}>
                <div className="text-lg font-bold">{nom(id)}{m.ganador === l && <span className="chip ml-2 !text-pos">Gana</span>}</div>
                <div className="flex items-center gap-5 tabular-nums"><span className="text-3xl font-bold text-terra">{j}</span><span className="w-12 text-right text-3xl font-bold">{pt}</span></div>
              </div>
            ))}
            <div className="mt-5 grid grid-cols-2 gap-3">
              <button className="btn-primary !py-5 text-base" disabled={m.terminado || busy} onClick={() => void punto('a')}>Punto {nom(reta.jugador_a)}</button>
              <button className="btn-primary !py-5 text-base" disabled={m.terminado || busy} onClick={() => void punto('b')}>Punto {nom(reta.jugador_b)}</button>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button className="btn-ghost" disabled={puntos.length === 0 || busy} onClick={() => void deshacer()}>Deshacer último punto</button>
              <button className="btn-ghost !text-neg" disabled={puntos.length === 0} onClick={() => void reiniciar()}>Reiniciar</button>
              {m.terminado && <button className="btn-primary ml-auto" disabled={busy} onClick={() => void finalizar()}>Finalizar y aplicar puntos</button>}
            </div>
          </div>
          <p className="mt-3 text-center text-xs text-soft">{puntos.length} puntos registrados.</p>
        </div>
      )}
    </div>
  )
}
