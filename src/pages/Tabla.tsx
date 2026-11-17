import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { NIVELES } from '../lib/niveles'
import type { Player } from '../lib/types'
import { useRealtime } from '../hooks/useRealtime'
import { Empty, NivelBadge, Title } from '../components/ui'

export default function Tabla() {
  const [players, setPlayers] = useState<Player[]>([])
  const [filtro, setFiltro] = useState<string>('Todos')
  const [loaded, setLoaded] = useState(false)
  const prev = useRef<Record<string, number>>({})
  const [flash, setFlash] = useState<Record<string, 'up' | 'down'>>({})

  const load = useCallback(async () => {
    const { data } = await supabase.from('ranked_players').select('*').eq('activo', true).order('puntos', { ascending: false })
    const next = (data ?? []) as Player[]
    const f: Record<string, 'up' | 'down'> = {}
    next.forEach((p) => {
      const o = prev.current[p.id]
      if (o !== undefined && o !== p.puntos) f[p.id] = p.puntos > o ? 'up' : 'down'
      prev.current[p.id] = p.puntos
    })
    setFlash(f)
    setPlayers(next)
    setLoaded(true)
  }, [])
  useEffect(() => { void load() }, [load])
  useRealtime(['ranked_players'], () => void load())

  const lista = players.filter((p) => filtro === 'Todos' || p.nivel === filtro)
  const conteo = (n: string) => players.filter((p) => p.nivel === n).length

  return (
    <div>
      <Title sub="Puntos Elo en vivo. Gana retas y sube de nivel.">Tabla Ranked · Baaxal Bosques</Title>

      <section className="card rise mb-8 p-5">
        <h2 className="mb-4 text-sm font-semibold">Escalera de niveles</h2>
        <ol className="grid gap-2 sm:grid-cols-7">
          {[...NIVELES].reverse().map((n, i) => (
            <li key={n.nombre} className="pop relative rounded-card border border-line bg-white p-3" style={{ animationDelay: `${i * 60}ms`, marginTop: `${i * 6}px` }}>
              <div className="text-xs font-semibold text-terra">{n.cat}</div>
              <div className="text-sm font-bold">{n.nombre}</div>
              <div className="mt-1 text-xs text-soft">{conteo(n.nombre)} jugadores</div>
            </li>
          ))}
        </ol>
      </section>

      <div className="rise mb-4 flex flex-wrap gap-2">
        {['Todos', ...NIVELES.map((n) => n.nombre)].map((n) => (
          <button key={n} onClick={() => setFiltro(n)}
            className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${filtro === n ? 'border-terra bg-terra text-white' : 'border-line bg-white text-soft hover:text-ink'}`}>{n}</button>
        ))}
      </div>

      {!loaded ? <Empty>Cargando…</Empty> : lista.length === 0 ? <Empty>Aún no hay jugadores en este nivel.</Empty> : (
        <div className="card rise overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-line bg-off text-left text-xs uppercase tracking-wide text-soft">
              <tr><th className="px-4 py-3 w-14">#</th><th className="px-4 py-3">Jugador</th><th className="px-4 py-3">Nivel</th><th className="px-4 py-3 text-right">Puntos</th></tr>
            </thead>
            <tbody>
              {lista.map((p, i) => (
                <tr key={p.id + (flash[p.id] ?? '')} className={`border-b border-line last:border-0 ${flash[p.id] ? 'flash-' + flash[p.id] : ''}`}>
                  <td className="px-4 py-3 font-semibold text-soft">{i + 1}</td>
                  <td className="px-4 py-3 font-medium">{p.nombre}</td>
                  <td className="px-4 py-3"><NivelBadge nivel={p.nivel} /></td>
                  <td className="px-4 py-3 text-right font-bold tabular-nums">{p.puntos}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
