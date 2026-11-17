import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { supabase } from '../../lib/supabase'
import { NIVELES } from '../../lib/niveles'
import type { Player } from '../../lib/types'
import { ErrorMsg, NivelBadge, Title } from '../../components/ui'

interface Perfil { player_id: string; edad: number | null; genero: string | null; codigo_postal: string | null; acepta_comunicaciones: boolean }

export default function Jugadores() {
  const [players, setPlayers] = useState<Player[]>([])
  const [perfiles, setPerfiles] = useState<Record<string, Perfil>>({})
  const [nombre, setNombre] = useState('')
  const [nivel, setNivel] = useState('Bronce')
  const [err, setErr] = useState<string | null>(null)

  const load = useCallback(async () => {
    const [{ data: p }, { data: pr }] = await Promise.all([
      supabase.from('ranked_players').select('*').order('puntos', { ascending: false }),
      supabase.from('ranked_player_profiles').select('player_id,edad,genero,codigo_postal,acepta_comunicaciones'),
    ])
    setPlayers((p ?? []) as Player[])
    const m: Record<string, Perfil> = {}
    ;((pr ?? []) as Perfil[]).forEach((x) => { m[x.player_id] = x })
    setPerfiles(m)
  }, [])
  useEffect(() => { void load() }, [load])

  const agregar = async (e: FormEvent) => {
    e.preventDefault(); setErr(null)
    const { error } = await supabase.from('ranked_players').insert({ nombre: nombre.trim(), nivel })
    if (error) return setErr(error.message)
    setNombre(''); void load()
  }
  const cambiar = async (id: string, patch: Partial<Player>) => {
    const { error } = await supabase.from('ranked_players').update(patch).eq('id', id)
    if (error) setErr(error.message); else void load()
  }
  const optins = Object.values(perfiles).filter((p) => p.acepta_comunicaciones).length

  return (
    <div>
      <Title sub={`${players.length} jugadores · ${optins} aceptan recibir información`}>Jugadores</Title>
      <form onSubmit={agregar} className="card rise mb-6 grid gap-3 p-4 sm:grid-cols-[1fr_180px_auto]">
        <input className="input" required placeholder="Nombre del jugador" value={nombre} onChange={(e) => setNombre(e.target.value)} />
        <select className="input" value={nivel} onChange={(e) => setNivel(e.target.value)}>{NIVELES.map((n) => <option key={n.nombre} value={n.nombre}>{n.nombre} · {n.cat}</option>)}</select>
        <button className="btn-primary">Agregar</button>
      </form>
      <div className="mb-3"><ErrorMsg msg={err} /></div>
      <div className="card rise overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-line bg-off text-left text-xs uppercase tracking-wide text-soft">
            <tr><th className="px-4 py-3">ID</th><th className="px-4 py-3">Jugador</th><th className="px-4 py-3">Nivel</th><th className="px-4 py-3 text-right">Pts</th><th className="px-4 py-3">Edad / CP / Género</th><th className="px-4 py-3">Avisos</th><th className="px-4 py-3" /></tr>
          </thead>
          <tbody>
            {players.map((p) => {
              const pr = perfiles[p.id]
              return (
                <tr key={p.id} className={`border-b border-line last:border-0 ${p.activo ? '' : 'opacity-50'}`}>
                  <td className="px-4 py-3 font-mono text-xs text-soft">{p.codigo}</td>
                  <td className="px-4 py-3 font-medium">{p.nombre}</td>
                  <td className="px-4 py-3">
                    <select className="rounded-btn border border-line bg-white px-2 py-1 text-xs" value={p.nivel} onChange={(e) => void cambiar(p.id, { nivel: e.target.value })}>
                      {NIVELES.map((n) => <option key={n.nombre} value={n.nombre}>{n.nombre}</option>)}
                    </select>
                    <span className="sr-only"><NivelBadge nivel={p.nivel} /></span>
                  </td>
                  <td className="px-4 py-3 text-right font-bold tabular-nums">{p.puntos}</td>
                  <td className="px-4 py-3 text-xs text-soft">{pr ? `${pr.edad ?? '—'} · ${pr.codigo_postal ?? '—'} · ${pr.genero ?? '—'}` : '—'}</td>
                  <td className="px-4 py-3 text-xs">{pr ? (pr.acepta_comunicaciones ? 'Sí' : 'No') : '—'}</td>
                  <td className="px-4 py-3 text-right"><button className="btn-ghost !px-2.5 !py-1 text-xs" onClick={() => void cambiar(p.id, { activo: !p.activo })}>{p.activo ? 'Desactivar' : 'Activar'}</button></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
