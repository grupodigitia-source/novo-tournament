import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { NIVELES } from '../../lib/niveles'
import type { Inscripcion, Player, Sesion } from '../../lib/types'
import { aInputLocal, fechaCorta } from '../../lib/format'
import { ErrorMsg, NivelBadge, Title } from '../../components/ui'

export default function Programar() {
  const [sesiones, setSesiones] = useState<Sesion[]>([])
  const [ins, setIns] = useState<Inscripcion[]>([])
  const [players, setPlayers] = useState<Player[]>([])
  const [fecha, setFecha] = useState(aInputLocal(new Date(Date.now() + 86400_000)))
  const [nivel, setNivel] = useState('Bronce')
  const [cupo, setCupo] = useState(4)
  const [err, setErr] = useState<string | null>(null)
  const [par, setPar] = useState<{ a: string; b: string; sesion: string }>({ a: '', b: '', sesion: '' })

  const load = useCallback(async () => {
    const [{ data: s }, { data: i }, { data: p }] = await Promise.all([
      supabase.from('ranked_sesiones').select('*').order('fecha', { ascending: false }).limit(30),
      supabase.from('ranked_inscripciones').select('*'),
      supabase.from('ranked_players').select('*').order('nombre'),
    ])
    setSesiones((s ?? []) as Sesion[]); setIns((i ?? []) as Inscripcion[]); setPlayers((p ?? []) as Player[])
  }, [])
  useEffect(() => { void load() }, [load])
  const nom = (id: string) => players.find((p) => p.id === id)?.nombre ?? '—'

  const crear = async (e: FormEvent) => {
    e.preventDefault(); setErr(null)
    const { error } = await supabase.from('ranked_sesiones').insert({ fecha: new Date(fecha).toISOString(), nivel, cupo })
    if (error) return setErr(error.message)
    void load()
  }
  const revisar = async (id: string, estado: 'confirmada' | 'rechazada') => {
    const { error } = await supabase.from('ranked_inscripciones').update({ estado }).eq('id', id)
    if (error) setErr(error.message); else void load()
  }
  const cerrar = async (s: Sesion) => {
    await supabase.from('ranked_sesiones').update({ estado: s.estado === 'abierta' ? 'cerrada' : 'abierta' }).eq('id', s.id); void load()
  }
  const crearReta = async (e: FormEvent) => {
    e.preventDefault(); setErr(null)
    if (!par.a || !par.b || par.a === par.b) return setErr('Elige dos jugadores distintos.')
    const s = sesiones.find((x) => x.id === par.sesion)
    const { error } = await supabase.from('ranked_retas').insert({ jugador_a: par.a, jugador_b: par.b, fecha: s?.fecha ?? new Date().toISOString(), sesion_id: s?.id ?? null })
    if (error) return setErr(error.message)
    setPar({ a: '', b: '', sesion: '' })
    alert('Reta creada. Captura el resultado en la pestaña correspondiente.')
  }
  const inscritos = (sid: string) => ins.filter((i) => i.sesion_id === sid && i.estado !== 'rechazada')

  return (
    <div className="space-y-8">
      <div>
        <Title sub="Cada reta genera un QR único e imprimible.">Programar reta</Title>
        <form onSubmit={crear} className="card rise grid gap-3 p-4 sm:grid-cols-[1fr_170px_110px_auto]">
          <div><label className="label">Fecha y hora</label><input className="input" type="datetime-local" required value={fecha} onChange={(e) => setFecha(e.target.value)} /></div>
          <div><label className="label">Nivel</label><select className="input" value={nivel} onChange={(e) => setNivel(e.target.value)}>{NIVELES.map((n) => <option key={n.nombre} value={n.nombre}>{n.nombre} · {n.cat}</option>)}</select></div>
          <div><label className="label">Cupo</label><input className="input" type="number" min={2} max={32} value={cupo} onChange={(e) => setCupo(Number(e.target.value))} /></div>
          <button className="btn-primary self-end">Crear</button>
        </form>
      </div>
      <ErrorMsg msg={err} />
      <div className="space-y-3">
        {sesiones.map((s) => (
          <div key={s.id} className="card rise p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3"><span className="font-semibold">{fechaCorta(s.fecha)}</span><NivelBadge nivel={s.nivel} /><span className="chip">{s.estado}</span><span className="font-mono text-xs text-soft">{s.codigo}</span></div>
              <div className="flex gap-2"><Link className="btn-primary !py-1.5" to={`/admin/qr/${s.id}`}>QR</Link><button className="btn-ghost !py-1.5" onClick={() => void cerrar(s)}>{s.estado === 'abierta' ? 'Cerrar' : 'Reabrir'}</button></div>
            </div>
            {inscritos(s.id).length > 0 && (
              <ul className="mt-3 flex flex-wrap gap-2 text-sm">
                {inscritos(s.id).map((i) => (
                  <li key={i.id} className="flex items-center gap-2 rounded-full border border-line px-3 py-1">
                    {nom(i.player_id)}
                    {i.estado === 'pendiente' ? <>
                      <button className="text-xs font-semibold text-pos" onClick={() => void revisar(i.id, 'confirmada')}>Aprobar</button>
                      <button className="text-xs font-semibold text-neg" onClick={() => void revisar(i.id, 'rechazada')}>Rechazar</button>
                    </> : <span className="text-xs text-soft">confirmado</span>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
      <form onSubmit={crearReta} className="card rise grid gap-3 p-4 sm:grid-cols-[1fr_1fr_1fr_auto]">
        <div><label className="label">Jugador A</label><select className="input" value={par.a} onChange={(e) => setPar({ ...par, a: e.target.value })}><option value="">—</option>{players.filter((p) => p.activo).map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}</select></div>
        <div><label className="label">Jugador B</label><select className="input" value={par.b} onChange={(e) => setPar({ ...par, b: e.target.value })}><option value="">—</option>{players.filter((p) => p.activo).map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}</select></div>
        <div><label className="label">Reta (opcional)</label><select className="input" value={par.sesion} onChange={(e) => setPar({ ...par, sesion: e.target.value })}><option value="">Sin reta</option>{sesiones.map((s) => <option key={s.id} value={s.id}>{fechaCorta(s.fecha)}</option>)}</select></div>
        <button className="btn-primary self-end">Crear partido</button>
      </form>
    </div>
  )
}
